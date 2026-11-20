-- =============================================================================
-- MIMO · Esquema base de datos (Supabase / PostgreSQL 15+)
-- Multiempresa con aislamiento por negocio mediante Row Level Security (RLS).
--
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run.
-- Es idempotente solo en la creación inicial; para reinstalar, use un proyecto limpio.
-- =============================================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
-- Estado de la RESERVA (agenda). Separado del estado operativo.
create type public.reservation_status as enum ('pendiente', 'confirmada', 'cancelada', 'atendida');
-- Estado OPERATIVO del servicio. Exactamente los confirmados por el equipo.
create type public.operational_status as enum ('Libre', 'En curso', 'Finalizado');
-- Tipo de ingreso del vehículo.
create type public.intake_type as enum ('appointment', 'walk_in');
-- Roles dentro de un negocio.
create type public.member_role as enum ('admin', 'operario');

-- -----------------------------------------------------------------------------
-- Tablas
-- -----------------------------------------------------------------------------
create table public.businesses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 2 and 120),
  address     text check (address is null or char_length(address) <= 200),
  phone       text check (phone is null or char_length(phone) <= 30),
  logo_url    text check (logo_url is null or char_length(logo_url) <= 500),
  timezone    text not null default 'America/Bogota',
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.profiles (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid not null unique references auth.users(id) on delete cascade,
  business_id   uuid not null references public.businesses(id) on delete cascade,
  full_name     text not null check (char_length(btrim(full_name)) between 2 and 120),
  email         text,
  role          public.member_role not null default 'admin',
  created_at    timestamptz not null default now()
);
create index profiles_business_idx on public.profiles(business_id);

-- Configuración por negocio. capacity NULL = no configurada (no se permite registrar vehículos).
create table public.business_settings (
  id                      uuid primary key default gen_random_uuid(),
  business_id             uuid not null unique references public.businesses(id) on delete cascade,
  opening_hours           jsonb not null default '{}'::jsonb,
  capacity                integer check (capacity is null or capacity between 1 and 500),
  -- Etapas operativas: fijadas por el equipo. Se guardan solo como referencia; no son editables.
  status_stages           text[] not null default array['Libre','En curso','Finalizado'],
  -- Vigencia de los enlaces de seguimiento en horas. NULL = sin vencimiento automático (pendiente de definición).
  tracking_link_ttl_hours integer check (tracking_link_ttl_hours is null or tracking_link_ttl_hours between 1 and 8760),
  updated_at              timestamptz not null default now()
);

create table public.services (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references public.businesses(id) on delete cascade,
  name              text not null check (char_length(btrim(name)) between 2 and 80),
  description       text check (description is null or char_length(description) <= 300),
  price_cop         integer check (price_cop is null or price_cop >= 0),
  duration_minutes  integer check (duration_minutes is null or duration_minutes between 1 and 1440),
  active            boolean not null default true,
  created_at        timestamptz not null default now()
);
create index services_business_idx on public.services(business_id);

create table public.appointments (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references public.businesses(id) on delete cascade,
  customer_name       text not null check (char_length(btrim(customer_name)) between 2 and 120),
  customer_phone      text not null check (customer_phone ~ '^[0-9+() -]{7,20}$'),
  vehicle_plate       text not null check (vehicle_plate ~ '^[A-Z0-9-]{3,10}$'),
  vehicle_model       text check (vehicle_model is null or char_length(vehicle_model) <= 80),
  service_id          uuid references public.services(id) on delete set null,
  intake_type         public.intake_type not null default 'appointment',
  scheduled_start     timestamptz not null,
  scheduled_end       timestamptz not null,
  status              public.reservation_status not null default 'pendiente',
  operational_status  public.operational_status not null default 'Libre',
  notes               text check (notes is null or char_length(notes) <= 1000),
  status_updated_at   timestamptz not null default now(),
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint appointments_time_order check (scheduled_end > scheduled_start),
  constraint appointments_max_duration check (scheduled_end - scheduled_start <= interval '24 hours')
);
create index appointments_business_start_idx on public.appointments(business_id, scheduled_start);
create index appointments_business_plate_idx on public.appointments(business_id, vehicle_plate);

create table public.service_updates (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid not null references public.appointments(id) on delete cascade,
  business_id     uuid not null references public.businesses(id) on delete cascade,
  status          public.operational_status not null,
  message         text check (message is null or char_length(message) <= 300),
  updated_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index service_updates_appt_idx on public.service_updates(appointment_id, created_at desc);

-- El token es aleatorio (32 bytes, 64 hex). Se guarda para que el negocio pueda volver a mostrar
-- el QR; solo los miembros del negocio pueden leer esta tabla (RLS). El público nunca la consulta
-- directamente: usa la función get_public_tracking().
create table public.tracking_links (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid not null references public.appointments(id) on delete cascade,
  business_id     uuid not null references public.businesses(id) on delete cascade,
  token           text not null unique check (token ~ '^[a-f0-9]{64}$'),
  expires_at      timestamptz,
  revoked_at      timestamptz,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index tracking_links_appt_idx on public.tracking_links(appointment_id);

create table public.surveys (
  id                      uuid primary key default gen_random_uuid(),
  appointment_id          uuid not null unique references public.appointments(id) on delete cascade, -- 1 respuesta por servicio
  business_id             uuid not null references public.businesses(id) on delete cascade,
  service_id              uuid references public.services(id) on delete set null,
  service_rating          smallint not null check (service_rating between 1 and 5), -- "¿Qué le pareció el servicio?"
  would_return            boolean not null,                                          -- "¿Volvería a ir?"
  suggestion_or_complaint text check (suggestion_or_complaint is null or char_length(suggestion_or_complaint) <= 1000),
  created_at              timestamptz not null default now()
);
create index surveys_business_created_idx on public.surveys(business_id, created_at desc);

-- Invitaciones: un administrador autoriza un correo para unirse a SU negocio.
create table public.business_invitations (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  email        text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role         public.member_role not null default 'operario',
  invited_by   uuid references auth.users(id) on delete set null,
  accepted_at  timestamptz,
  created_at   timestamptz not null default now()
);
create unique index business_invitations_pending_email_idx
  on public.business_invitations (lower(email)) where accepted_at is null;

-- Solicitudes de demostración desde el sitio público (solo inserción anónima).
create table public.demo_requests (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null check (char_length(btrim(full_name)) between 2 and 120),
  business_name text not null check (char_length(btrim(business_name)) between 2 and 120),
  city          text not null check (char_length(btrim(city)) between 2 and 80),
  contact       text not null check (char_length(btrim(contact)) between 5 and 120),
  message       text check (message is null or char_length(message) <= 1000),
  consent       boolean not null check (consent = true),
  created_at    timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Funciones auxiliares de pertenencia (SECURITY DEFINER para evitar recursión RLS)
-- -----------------------------------------------------------------------------
create or replace function public.current_business_id()
returns uuid language sql stable security definer set search_path = public as $$
  select business_id from public.profiles where auth_user_id = auth.uid()
$$;

create or replace function public.is_member(p_business uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where auth_user_id = auth.uid() and business_id = p_business)
$$;

create or replace function public.is_admin(p_business uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                 where auth_user_id = auth.uid() and business_id = p_business and role = 'admin')
$$;

-- -----------------------------------------------------------------------------
-- Onboarding: crear negocio o aceptar invitación
-- -----------------------------------------------------------------------------
create or replace function public.create_business(
  p_business_name text, p_full_name text, p_address text default null, p_phone text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_business uuid; v_email text;
begin
  if v_uid is null then raise exception 'NO_AUTENTICADO: inicie sesión primero.'; end if;
  if exists (select 1 from public.profiles where auth_user_id = v_uid) then
    raise exception 'YA_REGISTRADO: este usuario ya pertenece a un autolavado.';
  end if;
  select email into v_email from auth.users where id = v_uid;
  insert into public.businesses(name, address, phone, created_by)
    values (btrim(p_business_name), nullif(btrim(p_address), ''), nullif(btrim(p_phone), ''), v_uid)
    returning id into v_business;
  insert into public.profiles(auth_user_id, business_id, full_name, email, role)
    values (v_uid, v_business, btrim(p_full_name), v_email, 'admin');
  insert into public.business_settings(business_id) values (v_business);
  return v_business;
end $$;

-- Devuelve la invitación pendiente (si existe) para el correo del usuario autenticado.
create or replace function public.my_pending_invitation()
returns table (invitation_id uuid, business_name text, role public.member_role)
language sql stable security definer set search_path = public as $$
  select i.id, b.name, i.role
  from public.business_invitations i
  join public.businesses b on b.id = i.business_id
  join auth.users u on u.id = auth.uid()
  where i.accepted_at is null and lower(i.email) = lower(u.email)
  limit 1
$$;

create or replace function public.accept_invitation(p_full_name text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_email text; v_inv record;
begin
  if v_uid is null then raise exception 'NO_AUTENTICADO: inicie sesión primero.'; end if;
  if exists (select 1 from public.profiles where auth_user_id = v_uid) then
    raise exception 'YA_REGISTRADO: este usuario ya pertenece a un autolavado.';
  end if;
  select email into v_email from auth.users where id = v_uid;
  select * into v_inv from public.business_invitations
    where accepted_at is null and lower(email) = lower(v_email) limit 1 for update;
  if not found then raise exception 'SIN_INVITACION: no hay invitaciones pendientes para este correo.'; end if;
  insert into public.profiles(auth_user_id, business_id, full_name, email, role)
    values (v_uid, v_inv.business_id, btrim(p_full_name), v_email, v_inv.role);
  update public.business_invitations set accepted_at = now() where id = v_inv.id;
  return v_inv.business_id;
end $$;

-- Retirar a un miembro (solo admin del mismo negocio; no puede retirarse a sí mismo).
create or replace function public.remove_member(p_profile_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_target record;
begin
  select * into v_target from public.profiles where id = p_profile_id;
  if not found or not public.is_admin(v_target.business_id) then
    raise exception 'NO_AUTORIZADO: no puede modificar usuarios de otro negocio.';
  end if;
  if v_target.auth_user_id = auth.uid() then
    raise exception 'NO_PERMITIDO: no puede retirarse a sí mismo.';
  end if;
  delete from public.profiles where id = p_profile_id;
end $$;

-- -----------------------------------------------------------------------------
-- Reglas de appointments: normalización, inmutabilidad de business_id, capacidad
-- -----------------------------------------------------------------------------
create or replace function public.appointments_before_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_capacity integer;
  v_check_at timestamptz;
  v_max_concurrent integer;
  v_active boolean;
begin
  -- Defensa en profundidad: este trigger corre antes que las políticas RLS (WITH CHECK).
  -- Se valida la pertenencia aquí para no revelar información de otro negocio en los mensajes.
  if auth.uid() is not null and not public.is_member(new.business_id) then
    raise exception 'NO_AUTORIZADO: no puede registrar ni modificar servicios de otro autolavado.';
  end if;

  new.vehicle_plate := upper(regexp_replace(coalesce(new.vehicle_plate, ''), '\s', '', 'g'));
  new.customer_name := btrim(new.customer_name);

  if tg_op = 'UPDATE' then
    if new.business_id <> old.business_id then raise exception 'NO_PERMITIDO: no se puede cambiar el negocio de un registro.'; end if;
    if new.intake_type <> old.intake_type then raise exception 'NO_PERMITIDO: no se puede cambiar el tipo de ingreso.'; end if;
    new.updated_at := now();
    if new.operational_status is distinct from old.operational_status then
      new.status_updated_at := now();
    end if;
  else
    new.created_by := coalesce(new.created_by, auth.uid());
    new.status_updated_at := now();
  end if;

  -- El servicio debe pertenecer al mismo negocio.
  if new.service_id is not null and not exists (
      select 1 from public.services s where s.id = new.service_id and s.business_id = new.business_id) then
    raise exception 'DATOS_INVALIDOS: el servicio no pertenece a este autolavado.';
  end if;

  -- ¿Este registro ocupa capacidad? (supuesto documentado: activo = no cancelado y no finalizado)
  v_active := new.status <> 'cancelada' and new.operational_status <> 'Finalizado';
  if not v_active then return new; end if;

  -- Solo revalidar si cambió algo que afecta la capacidad.
  if tg_op = 'UPDATE'
     and new.scheduled_start = old.scheduled_start and new.scheduled_end = old.scheduled_end
     and (old.status <> 'cancelada' and old.operational_status <> 'Finalizado') then
    return new;
  end if;

  select capacity into v_capacity from public.business_settings where business_id = new.business_id;
  if v_capacity is null then
    raise exception 'CAPACIDAD_NO_CONFIGURADA: configure la capacidad del autolavado en Configuración antes de registrar vehículos.';
  end if;

  -- Serializa las verificaciones de capacidad por negocio (evita condiciones de carrera).
  perform pg_advisory_xact_lock(hashtextextended(new.business_id::text, 0));

  if new.intake_type = 'walk_in' and tg_op = 'INSERT' then
    -- Llegada sin cita: capacidad disponible EN ESE MOMENTO (§21.4).
    v_check_at := greatest(now(), new.scheduled_start);
    select count(*) into v_max_concurrent
    from public.appointments a
    where a.business_id = new.business_id and a.id <> new.id
      and a.status <> 'cancelada' and a.operational_status <> 'Finalizado'
      and a.scheduled_start <= v_check_at and a.scheduled_end > v_check_at;
  else
    -- Reserva: máxima ocupación simultánea dentro de su franja [inicio, fin).
    with overlapping as (
      select a.scheduled_start, a.scheduled_end
      from public.appointments a
      where a.business_id = new.business_id and a.id <> new.id
        and a.status <> 'cancelada' and a.operational_status <> 'Finalizado'
        and a.scheduled_start < new.scheduled_end and a.scheduled_end > new.scheduled_start
    ), points as (
      select new.scheduled_start as p
      union
      select o.scheduled_start from overlapping o where o.scheduled_start > new.scheduled_start
    )
    select coalesce(max(c), 0) into v_max_concurrent from (
      select (select count(*) from overlapping o where o.scheduled_start <= pt.p and o.scheduled_end > pt.p) as c
      from points pt
    ) s;
  end if;

  if v_max_concurrent + 1 > v_capacity then
    raise exception 'CAPACIDAD_EXCEDIDA: la capacidad configurada es de % vehículo(s) simultáneo(s) y esa franja ya tiene % ocupado(s).',
      v_capacity, v_max_concurrent;
  end if;
  return new;
end $$;

create trigger appointments_before_write
  before insert or update on public.appointments
  for each row execute function public.appointments_before_write();

-- Historial de estados operativos.
create or replace function public.appointments_after_write()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.operational_status is distinct from old.operational_status then
    insert into public.service_updates(appointment_id, business_id, status, updated_by)
      values (new.id, new.business_id, new.operational_status, auth.uid());
  end if;
  return null;
end $$;

create trigger appointments_after_write
  after insert or update on public.appointments
  for each row execute function public.appointments_after_write();

-- Cambio de estado operativo (lo pueden usar admin y operario).
create or replace function public.set_operational_status(p_appointment uuid, p_status public.operational_status)
returns void language plpgsql security definer set search_path = public as $$
declare v_business uuid;
begin
  select business_id into v_business from public.appointments where id = p_appointment;
  if v_business is null or not public.is_member(v_business) then
    raise exception 'NO_AUTORIZADO: el servicio no existe o no pertenece a su autolavado.';
  end if;
  update public.appointments set operational_status = p_status where id = p_appointment;
end $$;

-- Proteger configuración: status_stages no editable; updated_at automático.
create or replace function public.business_settings_before_update()
returns trigger language plpgsql as $$
begin
  if new.business_id <> old.business_id then raise exception 'NO_PERMITIDO'; end if;
  new.status_stages := array['Libre','En curso','Finalizado'];
  new.updated_at := now();
  return new;
end $$;
create trigger business_settings_before_update
  before update on public.business_settings
  for each row execute function public.business_settings_before_update();

-- Evitar que un admin cambie su propio rol/negocio desde el cliente.
create or replace function public.profiles_before_update()
returns trigger language plpgsql as $$
begin
  if new.business_id <> old.business_id or new.auth_user_id <> old.auth_user_id then
    raise exception 'NO_PERMITIDO';
  end if;
  if new.role <> old.role and old.auth_user_id = auth.uid() then
    raise exception 'NO_PERMITIDO: no puede cambiar su propio rol.';
  end if;
  return new;
end $$;
create trigger profiles_before_update
  before update on public.profiles
  for each row execute function public.profiles_before_update();

-- -----------------------------------------------------------------------------
-- Enlaces de seguimiento
-- -----------------------------------------------------------------------------
-- Crea un enlace nuevo y revoca los anteriores del mismo servicio. Devuelve el token.
create or replace function public.create_tracking_link(p_appointment uuid)
returns table (token text, expires_at timestamptz)
language plpgsql security definer set search_path = public, extensions as $$
declare v_business uuid; v_ttl integer; v_token text; v_exp timestamptz;
begin
  select a.business_id into v_business from public.appointments a where a.id = p_appointment;
  if v_business is null or not public.is_member(v_business) then
    raise exception 'NO_AUTORIZADO: el servicio no existe o no pertenece a su autolavado.';
  end if;
  select s.tracking_link_ttl_hours into v_ttl from public.business_settings s where s.business_id = v_business;
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_exp := case when v_ttl is null then null else now() + make_interval(hours => v_ttl) end;
  update public.tracking_links t set revoked_at = now()
    where t.appointment_id = p_appointment and t.revoked_at is null;
  insert into public.tracking_links(appointment_id, business_id, token, expires_at, created_by)
    values (p_appointment, v_business, v_token, v_exp, auth.uid());
  return query select v_token, v_exp;
end $$;

create or replace function public.revoke_tracking_links(p_appointment uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_business uuid;
begin
  select business_id into v_business from public.appointments where id = p_appointment;
  if v_business is null or not public.is_member(v_business) then
    raise exception 'NO_AUTORIZADO';
  end if;
  update public.tracking_links set revoked_at = now() where appointment_id = p_appointment and revoked_at is null;
end $$;

-- Consulta pública (anónima): devuelve SOLO datos mínimos del servicio vinculado al token.
-- No expone teléfono, nombre completo, placa completa ni identificadores internos.
create or replace function public.get_public_tracking(p_token text)
returns table (
  business_name text, service_name text, plate_hint text, vehicle_model text,
  operational_status public.operational_status, status_updated_at timestamptz,
  reservation_cancelled boolean, survey_available boolean, survey_submitted boolean
)
language plpgsql stable security definer set search_path = public as $$
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then return; end if;
  return query
  select b.name, s.name,
         '•••' || right(a.vehicle_plate, 3),
         a.vehicle_model,
         a.operational_status, a.status_updated_at,
         a.status = 'cancelada',
         (a.operational_status = 'Finalizado' and a.status <> 'cancelada'),
         exists (select 1 from public.surveys sv where sv.appointment_id = a.id)
  from public.tracking_links t
  join public.appointments a on a.id = t.appointment_id
  join public.businesses b on b.id = a.business_id
  left join public.services s on s.id = a.service_id
  where t.token = p_token and t.revoked_at is null
    and (t.expires_at is null or t.expires_at > now());
end $$;

-- Envío de encuesta (anónimo, con token). Una respuesta por servicio.
create or replace function public.submit_survey(
  p_token text, p_service_rating integer, p_would_return boolean, p_suggestion text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare v_appt record;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'ENLACE_INVALIDO: el enlace no es válido.'; end if;
  select a.id, a.business_id, a.service_id, a.operational_status, a.status into v_appt
  from public.tracking_links t join public.appointments a on a.id = t.appointment_id
  where t.token = p_token and t.revoked_at is null and (t.expires_at is null or t.expires_at > now());
  if not found then raise exception 'ENLACE_INVALIDO: el enlace no es válido o ya venció.'; end if;
  if v_appt.status = 'cancelada' or v_appt.operational_status <> 'Finalizado' then
    raise exception 'ENCUESTA_NO_DISPONIBLE: la encuesta se habilita cuando el servicio está Finalizado.';
  end if;
  if p_service_rating is null or p_service_rating not between 1 and 5 then
    raise exception 'DATOS_INVALIDOS: seleccione una calificación de 1 a 5.';
  end if;
  if p_would_return is null then raise exception 'DATOS_INVALIDOS: indique si volvería.'; end if;
  if p_suggestion is not null and char_length(p_suggestion) > 1000 then
    raise exception 'DATOS_INVALIDOS: la sugerencia supera 1000 caracteres.';
  end if;
  begin
    insert into public.surveys(appointment_id, business_id, service_id, service_rating, would_return, suggestion_or_complaint)
      values (v_appt.id, v_appt.business_id, v_appt.service_id, p_service_rating, p_would_return,
              nullif(btrim(coalesce(p_suggestion, '')), ''));
  exception when unique_violation then
    raise exception 'ENCUESTA_YA_RESPONDIDA: ya se registró una respuesta para este servicio.';
  end;
end $$;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.businesses            enable row level security;
alter table public.profiles              enable row level security;
alter table public.business_settings     enable row level security;
alter table public.services              enable row level security;
alter table public.appointments          enable row level security;
alter table public.service_updates       enable row level security;
alter table public.tracking_links        enable row level security;
alter table public.surveys               enable row level security;
alter table public.business_invitations  enable row level security;
alter table public.demo_requests         enable row level security;

-- businesses: los miembros leen; solo admin actualiza. Creación solo vía create_business().
create policy businesses_select on public.businesses for select to authenticated using (public.is_member(id));
create policy businesses_update on public.businesses for update to authenticated
  using (public.is_admin(id)) with check (public.is_admin(id));

-- profiles: miembros ven a su equipo; admin edita nombres/roles de su negocio.
create policy profiles_select on public.profiles for select to authenticated using (public.is_member(business_id));
create policy profiles_update_self on public.profiles for update to authenticated
  using (auth_user_id = auth.uid() or public.is_admin(business_id))
  with check (public.is_member(business_id));

-- business_settings
create policy settings_select on public.business_settings for select to authenticated using (public.is_member(business_id));
create policy settings_update on public.business_settings for update to authenticated
  using (public.is_admin(business_id)) with check (public.is_admin(business_id));

-- services: miembros leen; admin gestiona.
create policy services_select on public.services for select to authenticated using (public.is_member(business_id));
create policy services_insert on public.services for insert to authenticated with check (public.is_admin(business_id));
create policy services_update on public.services for update to authenticated
  using (public.is_admin(business_id)) with check (public.is_admin(business_id));
create policy services_delete on public.services for delete to authenticated using (public.is_admin(business_id));

-- appointments: miembros leen; admin crea/edita/elimina. El operario cambia estado vía set_operational_status().
create policy appointments_select on public.appointments for select to authenticated using (public.is_member(business_id));
create policy appointments_insert on public.appointments for insert to authenticated with check (public.is_admin(business_id));
create policy appointments_update on public.appointments for update to authenticated
  using (public.is_admin(business_id)) with check (public.is_admin(business_id));
create policy appointments_delete on public.appointments for delete to authenticated using (public.is_admin(business_id));

-- service_updates: solo lectura para miembros (se escriben por trigger).
create policy service_updates_select on public.service_updates for select to authenticated using (public.is_member(business_id));

-- tracking_links: solo lectura para miembros (se crean/revocan por funciones).
create policy tracking_links_select on public.tracking_links for select to authenticated using (public.is_member(business_id));

-- surveys: solo admin lee (el operario no accede a estadísticas). Se insertan vía submit_survey().
create policy surveys_select on public.surveys for select to authenticated using (public.is_admin(business_id));

-- invitations: solo admin del negocio.
create policy invitations_select on public.business_invitations for select to authenticated using (public.is_admin(business_id));
create policy invitations_insert on public.business_invitations for insert to authenticated with check (public.is_admin(business_id));
create policy invitations_delete on public.business_invitations for delete to authenticated using (public.is_admin(business_id));

-- demo_requests: cualquiera puede insertar (formulario público); nadie lee desde el cliente.
-- Se consultan desde el Dashboard de Supabase (Table editor) por el equipo MIMO.
create policy demo_requests_insert on public.demo_requests for insert to anon, authenticated with check (consent = true);

-- -----------------------------------------------------------------------------
-- Privilegios
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select, update on public.businesses to authenticated;
grant select, update on public.profiles to authenticated;
grant select, update on public.business_settings to authenticated;
grant select, insert, update, delete on public.services to authenticated;
grant select, insert, update, delete on public.appointments to authenticated;
grant select on public.service_updates to authenticated;
grant select on public.tracking_links to authenticated;
grant select on public.surveys to authenticated;
grant select, insert, delete on public.business_invitations to authenticated;
grant insert on public.demo_requests to anon, authenticated;

grant execute on function public.current_business_id()                       to authenticated;
grant execute on function public.is_member(uuid)                              to authenticated;
grant execute on function public.is_admin(uuid)                               to authenticated;
grant execute on function public.create_business(text, text, text, text)      to authenticated;
grant execute on function public.my_pending_invitation()                      to authenticated;
grant execute on function public.accept_invitation(text)                      to authenticated;
grant execute on function public.remove_member(uuid)                          to authenticated;
grant execute on function public.set_operational_status(uuid, public.operational_status) to authenticated;
grant execute on function public.create_tracking_link(uuid)                   to authenticated;
grant execute on function public.revoke_tracking_links(uuid)                  to authenticated;
grant execute on function public.get_public_tracking(text)                    to anon, authenticated;
grant execute on function public.submit_survey(text, integer, boolean, text) to anon, authenticated;
