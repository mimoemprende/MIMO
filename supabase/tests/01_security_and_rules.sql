-- Pruebas automatizadas del esquema MIMO (Postgres local con 00_local_auth_stub.sql).
-- Ejecutar: psql -v ON_ERROR_STOP=1 -f 00_local_auth_stub.sql -f ../migrations/20261119000000_mimo_schema.sql -f 01_security_and_rules.sql
-- Cada bloque lanza una excepción si una aserción falla.
\set ON_ERROR_STOP 1

-- Helper de aserción de errores esperados
create or replace function pg_temp.expect_error(p_sql text, p_fragment text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'FALLO: se esperaba error con "%" pero no ocurrió. SQL: %', p_fragment, p_sql;
exception when others then
  if sqlerrm like 'FALLO:%' then raise; end if;
  if position(p_fragment in sqlerrm) = 0 then
    raise exception 'FALLO: error inesperado "%" (se esperaba "%")', sqlerrm, p_fragment;
  end if;
  raise notice 'OK error esperado: %', left(sqlerrm, 90);
end $$;
grant execute on function pg_temp.expect_error(text, text) to anon, authenticated;

insert into auth.users(id, email) values
  ('11111111-1111-1111-1111-111111111111', 'admin.a@demo.test'),
  ('22222222-2222-2222-2222-222222222222', 'admin.b@demo.test'),
  ('33333333-3333-3333-3333-333333333333', 'operario.a@demo.test'),
  ('44444444-4444-4444-4444-444444444444', 'sininvitacion@demo.test');

-- ===================== T1: onboarding de dos negocios =====================
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.create_business('Autolavado A (ficticio)', 'Admin A', 'Calle 1', '3000000001');
select pg_temp.expect_error($$select public.create_business('Otro', 'Admin A')$$, 'YA_REGISTRADO');

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.create_business('Autolavado B (ficticio)', 'Admin B');
reset role;

do $$ begin
  if (select count(*) from public.businesses) <> 2 then raise exception 'FALLO T1: se esperaban 2 negocios'; end if;
  raise notice 'OK T1 onboarding multiempresa';
end $$;

-- ===================== T2: sin capacidad configurada no se registra =====================
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.services(business_id, name, price_cop, duration_minutes)
  values (public.current_business_id(), 'Lavado sencillo (ficticio)', 20000, 60);
select pg_temp.expect_error($$
  insert into public.appointments(business_id, customer_name, customer_phone, vehicle_plate, service_id, scheduled_start, scheduled_end)
  values (public.current_business_id(), 'Cliente Uno', '3001234567', 'abc123',
          (select id from public.services limit 1), '2030-01-10 09:00-05', '2030-01-10 10:00-05')$$,
  'CAPACIDAD_NO_CONFIGURADA');

-- configurar capacidad = 2
update public.business_settings set capacity = 2 where business_id = public.current_business_id();

-- ===================== T3: capacidad en franja horaria =====================
insert into public.appointments(business_id, customer_name, customer_phone, vehicle_plate, service_id, scheduled_start, scheduled_end)
values (public.current_business_id(), 'Cliente Uno', '3001234567', 'abc 123', (select id from public.services limit 1), '2030-01-10 09:00-05', '2030-01-10 10:00-05'),
       (public.current_business_id(), 'Cliente Dos', '3001234568', 'DEF456', null, '2030-01-10 09:30-05', '2030-01-10 10:30-05');
-- tercera que se cruza con ambas en 09:30-10:00 → excede
select pg_temp.expect_error($$
  insert into public.appointments(business_id, customer_name, customer_phone, vehicle_plate, scheduled_start, scheduled_end)
  values (public.current_business_id(), 'Cliente Tres', '3001234569', 'GHI789', '2030-01-10 09:45-05', '2030-01-10 10:15-05')$$,
  'CAPACIDAD_EXCEDIDA');
-- franja que solo se cruza con una (10:00-10:30, la primera ya terminó) → permitido
insert into public.appointments(business_id, customer_name, customer_phone, vehicle_plate, scheduled_start, scheduled_end)
values (public.current_business_id(), 'Cliente Cuatro', '3001234560', 'JKL012', '2030-01-10 10:00-05', '2030-01-10 10:30-05');
-- franja contenida que se cruza con dos registros que NO se cruzan entre sí (09:00-10:00 y 10:00-10:30) + la de 09:30-10:30 → 2 simultáneos → excede
select pg_temp.expect_error($$
  insert into public.appointments(business_id, customer_name, customer_phone, vehicle_plate, scheduled_start, scheduled_end)
  values (public.current_business_id(), 'Cliente Cinco', '3001234561', 'MNO345', '2030-01-10 09:50-05', '2030-01-10 10:10-05')$$,
  'CAPACIDAD_EXCEDIDA');

-- cancelar una libera capacidad
update public.appointments set status = 'cancelada' where vehicle_plate = 'DEF456';
insert into public.appointments(business_id, customer_name, customer_phone, vehicle_plate, scheduled_start, scheduled_end)
values (public.current_business_id(), 'Cliente Tres', '3001234569', 'GHI789', '2030-01-10 09:45-05', '2030-01-10 10:15-05');
-- reactivar la cancelada ahora excede
select pg_temp.expect_error($$update public.appointments set status = 'pendiente' where vehicle_plate = 'DEF456'$$, 'CAPACIDAD_EXCEDIDA');
reset role;

do $$ begin
  if not exists (select 1 from public.appointments where vehicle_plate = 'ABC123') then
    raise exception 'FALLO T3: la placa no se normalizó a ABC123';
  end if;
  raise notice 'OK T3 capacidad por franja, cancelación y normalización de placa';
end $$;

-- ===================== T4: walk-in verifica capacidad en el momento =====================
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.business_settings set capacity = 1 where business_id = public.current_business_id();
insert into public.appointments(business_id, customer_name, customer_phone, vehicle_plate, intake_type, scheduled_start, scheduled_end)
values (public.current_business_id(), 'Walk In Uno', '3005550001', 'WLK001', 'walk_in', now(), now() + interval '40 minutes');
select pg_temp.expect_error($$
  insert into public.appointments(business_id, customer_name, customer_phone, vehicle_plate, intake_type, scheduled_start, scheduled_end)
  values (public.current_business_id(), 'Walk In Dos', '3005550002', 'WLK002', 'walk_in', now(), now() + interval '40 minutes')$$,
  'CAPACIDAD_EXCEDIDA');
-- finalizar el primero libera capacidad
select public.set_operational_status((select id from public.appointments where vehicle_plate='WLK001'), 'Finalizado');
insert into public.appointments(business_id, customer_name, customer_phone, vehicle_plate, intake_type, scheduled_start, scheduled_end)
values (public.current_business_id(), 'Walk In Dos', '3005550002', 'WLK002', 'walk_in', now(), now() + interval '40 minutes');
update public.business_settings set capacity = 3 where business_id = public.current_business_id();
reset role;
do $$ begin
  if (select count(*) from public.service_updates su join public.appointments a on a.id = su.appointment_id where a.vehicle_plate='WLK001') <> 2 then
    raise exception 'FALLO T4: historial de estados incorrecto';
  end if;
  raise notice 'OK T4 walk-in, capacidad actual y liberación al finalizar';
end $$;

-- ===================== T5: aislamiento entre negocios (RLS) =====================
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
do $$
declare v int;
begin
  select count(*) into v from public.appointments; if v <> 0 then raise exception 'FALLO T5: B ve citas de A (%)', v; end if;
  select count(*) into v from public.services;     if v <> 0 then raise exception 'FALLO T5: B ve servicios de A'; end if;
  select count(*) into v from public.businesses;   if v <> 1 then raise exception 'FALLO T5: B ve % negocios', v; end if;
  select count(*) into v from public.profiles;     if v <> 1 then raise exception 'FALLO T5: B ve perfiles ajenos'; end if;
  select count(*) into v from public.business_settings; if v <> 1 then raise exception 'FALLO T5: B ve config ajena'; end if;
  select count(*) into v from public.tracking_links; if v <> 0 then raise exception 'FALLO T5'; end if;
  select count(*) into v from public.service_updates; if v <> 0 then raise exception 'FALLO T5'; end if;
  -- intentos de modificación cruzada: afectan 0 filas
  update public.appointments set notes = 'hack' where true;
  get diagnostics v = row_count; if v <> 0 then raise exception 'FALLO T5: B modificó citas de A'; end if;
  delete from public.services where true;
  get diagnostics v = row_count; if v <> 0 then raise exception 'FALLO T5: B borró servicios de A'; end if;
  update public.business_settings set capacity = 99 where business_id <> public.current_business_id();
  get diagnostics v = row_count; if v <> 0 then raise exception 'FALLO T5: B cambió capacidad de A'; end if;
  raise notice 'OK T5 lectura/escritura cruzada bloqueada por RLS';
end $$;
-- insertar en el negocio de A conociendo su id real
reset role;
create temp table t_ids as select id as business_a from public.businesses where name like 'Autolavado A%';
grant select on t_ids to authenticated, anon;
set role authenticated;
select pg_temp.expect_error($$
  insert into public.appointments(business_id, customer_name, customer_phone, vehicle_plate, scheduled_start, scheduled_end)
  values ((select business_a from t_ids), 'Intruso', '3000000000', 'XXX999', '2030-01-11 09:00-05', '2030-01-11 10:00-05')$$, 'NO_AUTORIZADO');
select pg_temp.expect_error($$insert into public.services(business_id, name) values ((select business_a from t_ids), 'Intruso')$$, 'row-level security');
-- usar funciones sobre servicios ajenos
select pg_temp.expect_error($$select public.set_operational_status((select id from public.appointments limit 1), 'En curso')$$, 'NO_AUTORIZADO');
reset role;
do $$
declare v_appt uuid := (select id from public.appointments where vehicle_plate='ABC123');
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
  begin
    perform public.set_operational_status(v_appt, 'En curso');
    raise exception 'FALLO T5: B cambió estado de A';
  exception when others then
    if sqlerrm like 'FALLO%' then raise; end if;
  end;
  begin
    perform public.create_tracking_link(v_appt);
    raise exception 'FALLO T5: B creó enlace para A';
  exception when others then
    if sqlerrm like 'FALLO%' then raise; end if;
  end;
  raise notice 'OK T5 funciones RPC rechazan servicios de otro negocio';
end $$;

-- ===================== T6: enlace público y encuesta =====================
create temp table t_tokens(label text, token text);
grant all on t_tokens to authenticated, anon;
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into t_tokens select 'abc', token from public.create_tracking_link((select id from public.appointments where vehicle_plate='ABC123'));
insert into t_tokens select 'jkl', token from public.create_tracking_link((select id from public.appointments where vehicle_plate='JKL012'));
reset role;

set role anon;
reset request.jwt.claim.sub;
do $$
declare r record; v int;
begin
  -- anon no puede leer tablas
  begin perform 1 from public.appointments; raise exception 'FALLO T6: anon lee appointments';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.tracking_links; raise exception 'FALLO T6: anon lee tracking_links';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.surveys; raise exception 'FALLO T6: anon lee surveys';
  exception when insufficient_privilege then null; end;

  select * into r from public.get_public_tracking((select token from t_tokens where label='abc'));
  if r.operational_status <> 'Libre' or r.plate_hint <> '•••123' or r.survey_available then
    raise exception 'FALLO T6: datos públicos incorrectos %', row_to_json(r);
  end if;
  select count(*) into v from public.get_public_tracking('deadbeef'); if v <> 0 then raise exception 'FALLO T6: token inválido devolvió datos'; end if;
  select count(*) into v from public.get_public_tracking(repeat('a', 64)); if v <> 0 then raise exception 'FALLO T6: token inexistente devolvió datos'; end if;
  raise notice 'OK T6a consulta pública mínima, anon sin acceso a tablas';
end $$;
select pg_temp.expect_error($$select public.submit_survey((select token from t_tokens where label='abc'), 5, true, 'x')$$, 'ENCUESTA_NO_DISPONIBLE');
reset role;

-- admin finaliza → encuesta disponible
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.set_operational_status((select id from public.appointments where vehicle_plate='ABC123'), 'En curso');
select public.set_operational_status((select id from public.appointments where vehicle_plate='ABC123'), 'Finalizado');
reset role;

set role anon;
do $$
declare r record;
begin
  select * into r from public.get_public_tracking((select token from t_tokens where label='abc'));
  if r.operational_status <> 'Finalizado' or not r.survey_available or r.survey_submitted then
    raise exception 'FALLO T6b: %', row_to_json(r);
  end if;
  -- el token de ABC no muestra datos de JKL
  select * into r from public.get_public_tracking((select token from t_tokens where label='jkl'));
  if r.plate_hint <> '•••012' or r.operational_status <> 'Libre' then raise exception 'FALLO T6b: cruce de tokens'; end if;
  raise notice 'OK T6b estado reflejado en enlace; cada token solo ve su servicio';
end $$;
select pg_temp.expect_error($$select public.submit_survey((select token from t_tokens where label='abc'), 7, true, null)$$, 'DATOS_INVALIDOS');
select public.submit_survey((select token from t_tokens where label='abc'), 4, true, 'Todo bien (prueba ficticia)');
select pg_temp.expect_error($$select public.submit_survey((select token from t_tokens where label='abc'), 5, false, null)$$, 'ENCUESTA_YA_RESPONDIDA');
reset role;

-- revocar / regenerar enlace
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into t_tokens select 'jkl2', token from public.create_tracking_link((select id from public.appointments where vehicle_plate='JKL012'));
reset role;
set role anon;
do $$
declare v int;
begin
  select count(*) into v from public.get_public_tracking((select token from t_tokens where label='jkl'));
  if v <> 0 then raise exception 'FALLO T6c: token anterior sigue activo tras regenerar'; end if;
  select count(*) into v from public.get_public_tracking((select token from t_tokens where label='jkl2'));
  if v <> 1 then raise exception 'FALLO T6c: token nuevo no funciona'; end if;
  raise notice 'OK T6c regenerar revoca el enlace anterior';
end $$;
reset role;

-- vencimiento
update public.tracking_links set expires_at = now() - interval '1 minute' where token = (select token from t_tokens where label='jkl2');
set role anon;
do $$ begin
  if exists (select 1 from public.get_public_tracking((select token from t_tokens where label='jkl2'))) then
    raise exception 'FALLO T6d: token vencido sigue activo';
  end if;
  raise notice 'OK T6d enlace vencido deja de funcionar';
end $$;
reset role;

-- encuestas: admin A ve 1, admin B ve 0
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
do $$ begin
  if (select count(*) from public.surveys) <> 1 then raise exception 'FALLO T6e: A no ve su encuesta'; end if;
end $$;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
do $$ begin
  if (select count(*) from public.surveys) <> 0 then raise exception 'FALLO T6e: B ve encuestas de A'; end if;
  raise notice 'OK T6e encuestas aisladas por negocio';
end $$;
reset role;

-- ===================== T7: invitaciones y rol operario =====================
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.business_invitations(business_id, email, role) values (public.current_business_id(), 'Operario.A@demo.test', 'operario');
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
do $$ begin
  if (select count(*) from public.business_invitations) <> 0 then raise exception 'FALLO T7: B ve invitaciones de A'; end if;
end $$;
select pg_temp.expect_error($$insert into public.business_invitations(business_id, email) values ((select business_a from t_ids), 'x@y.co')$$, 'row-level security');

set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
select pg_temp.expect_error($$select public.accept_invitation('Sin Invitación')$$, 'SIN_INVITACION');

set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
do $$ begin
  if (select business_name from public.my_pending_invitation()) <> 'Autolavado A (ficticio)' then raise exception 'FALLO T7: invitación no encontrada'; end if;
end $$;
select public.accept_invitation('Operario A');
do $$
declare v int;
begin
  select count(*) into v from public.appointments; if v = 0 then raise exception 'FALLO T7: operario no ve citas'; end if;
  select count(*) into v from public.surveys; if v <> 0 then raise exception 'FALLO T7: operario ve encuestas'; end if;
  update public.business_settings set capacity = 50;
  get diagnostics v = row_count; if v <> 0 then raise exception 'FALLO T7: operario cambió configuración'; end if;
  update public.appointments set notes = 'x';
  get diagnostics v = row_count; if v <> 0 then raise exception 'FALLO T7: operario editó citas'; end if;
  perform public.set_operational_status((select id from public.appointments where vehicle_plate='JKL012'), 'En curso');
  raise notice 'OK T7 invitación aceptada; operario solo cambia estado operativo';
end $$;
select pg_temp.expect_error($$update public.profiles set role = 'admin' where auth_user_id = auth.uid()$$, 'NO_PERMITIDO');
reset role;

-- ===================== T8: formulario de demo =====================
set role anon;
insert into public.demo_requests(full_name, business_name, city, contact, message, consent)
  values ('Persona Prueba', 'Lavadero Ficticio', 'Medellín', 'prueba@demo.test', 'Hola', true);
select pg_temp.expect_error($$insert into public.demo_requests(full_name, business_name, city, contact, consent) values ('P P', 'L F', 'Cali', 'x@y.co', false)$$, 'violates');
do $$ begin
  begin perform 1 from public.demo_requests; raise exception 'FALLO T8: anon lee solicitudes';
  exception when insufficient_privilege then null; end;
  raise notice 'OK T8 solicitudes de demo: solo inserción con consentimiento';
end $$;
reset role;

select 'TODAS LAS PRUEBAS SQL PASARON' as resultado;
