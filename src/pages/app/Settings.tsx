import { useState, type FormEvent } from 'react';
import { Building2, Gauge, Wrench, Users, ListChecks, Plus, Pencil, Trash2, Save, MailPlus, UserMinus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useLoader } from '../../hooks/useLoader';
import { listServices } from '../../lib/api';
import { requireSupabase } from '../../lib/supabase';
import { friendlyError } from '../../lib/errors';
import { formatCOP, formatDateTime } from '../../lib/format';
import { DAYS } from '../../lib/hours';
import { OPERATIONAL_STATUSES } from '../../lib/status';
import type { DayHours, Invitation, MemberRole, OpeningHours, Profile, Service } from '../../lib/types';
import { Alert, Button, Card, EmptyState, Field, Input, Modal, OperationalBadge, PageHeader, Select, Spinner, Textarea } from '../../components/ui';

type Tab = 'negocio' | 'operacion' | 'servicios' | 'usuarios' | 'estados';
const tabs: { k: Tab; l: string; icon: typeof Building2 }[] = [
  { k: 'negocio', l: 'Negocio', icon: Building2 },
  { k: 'operacion', l: 'Capacidad y horario', icon: Gauge },
  { k: 'servicios', l: 'Servicios', icon: Wrench },
  { k: 'usuarios', l: 'Usuarios', icon: Users },
  { k: 'estados', l: 'Estados', icon: ListChecks },
];

export default function Settings() {
  const [tab, setTab] = useState<Tab>('negocio');
  return (
    <div>
      <PageHeader title="Configuración" subtitle="Solo su autolavado puede ver y modificar esta información." />
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1" role="tablist">
        {tabs.map((t) => (
          <button key={t.k} role="tab" aria-selected={tab === t.k} onClick={() => setTab(t.k)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${tab === t.k ? 'bg-mimo-blue text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-mimo-blue-50'}`}>
            <t.icon className="h-4 w-4" />{t.l}
          </button>
        ))}
      </div>
      {tab === 'negocio' && <BusinessTab />}
      {tab === 'operacion' && <OperationTab />}
      {tab === 'servicios' && <ServicesTab />}
      {tab === 'usuarios' && <UsersTab />}
      {tab === 'estados' && <StatesTab />}
    </div>
  );
}

function BusinessTab() {
  const { business, refresh } = useAuth();
  const [f, setF] = useState({ name: business?.name ?? '', address: business?.address ?? '', phone: business?.phone ?? '', logo_url: business?.logo_url ?? '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ k: 'success' | 'error'; t: string } | null>(null);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (f.name.trim().length < 2) return setMsg({ k: 'error', t: 'El nombre es obligatorio.' });
    if (f.logo_url && !/^https:\/\//.test(f.logo_url.trim())) return setMsg({ k: 'error', t: 'El logo debe ser una URL https.' });
    setSaving(true); setMsg(null);
    const { error } = await requireSupabase().from('businesses').update({ name: f.name.trim(), address: f.address.trim() || null, phone: f.phone.trim() || null, logo_url: f.logo_url.trim() || null }).eq('id', business!.id);
    setSaving(false);
    if (error) return setMsg({ k: 'error', t: friendlyError(error) });
    await refresh(); setMsg({ k: 'success', t: 'Datos guardados.' });
  };
  return (
    <Card className="max-w-2xl">
      <form onSubmit={save} className="space-y-4">
        <Field label="Nombre del autolavado" required>{(id) => <Input id={id} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
        <Field label="Dirección">{(id) => <Input id={id} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />}</Field>
        <Field label="Teléfono">{(id) => <Input id={id} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />}</Field>
        <Field label="URL del logo (opcional)" hint="Enlace https a una imagen. La carga de archivos no está incluida en esta versión.">{(id) => <Input id={id} value={f.logo_url} onChange={(e) => setF({ ...f, logo_url: e.target.value })} />}</Field>
        {msg && <Alert kind={msg.k}>{msg.t}</Alert>}
        <Button type="submit" loading={saving} icon={<Save className="h-4 w-4" />}>Guardar</Button>
      </form>
    </Card>
  );
}

function OperationTab() {
  const { settings, refresh } = useAuth();
  const [capacity, setCapacity] = useState(settings?.capacity?.toString() ?? '');
  const [ttl, setTtl] = useState(settings?.tracking_link_ttl_hours?.toString() ?? '');
  const [hours, setHours] = useState<OpeningHours>(settings?.opening_hours ?? {});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ k: 'success' | 'error'; t: string } | null>(null);

  const setDay = (k: keyof OpeningHours, v: Partial<DayHours>) => setHours((h) => ({ ...h, [k]: { open: false, from: '', to: '', ...h[k], ...v } }));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const cap = capacity.trim() === '' ? null : Number(capacity);
    if (cap !== null && (!Number.isInteger(cap) || cap < 1 || cap > 500)) return setMsg({ k: 'error', t: 'La capacidad debe ser un número entero entre 1 y 500.' });
    const t = ttl.trim() === '' ? null : Number(ttl);
    if (t !== null && (!Number.isInteger(t) || t < 1 || t > 8760)) return setMsg({ k: 'error', t: 'La vigencia debe ser un número de horas entre 1 y 8760, o vacío.' });
    for (const d of DAYS) {
      const h = hours[d.key];
      if (h?.open && (!h.from || !h.to || h.from >= h.to)) return setMsg({ k: 'error', t: `Revise el horario del ${d.label.toLowerCase()}: la hora de cierre debe ser posterior a la de apertura.` });
    }
    setSaving(true); setMsg(null);
    const { error } = await requireSupabase().from('business_settings').update({ capacity: cap, tracking_link_ttl_hours: t, opening_hours: hours }).eq('id', settings!.id);
    setSaving(false);
    if (error) return setMsg({ k: 'error', t: friendlyError(error) });
    await refresh(); setMsg({ k: 'success', t: 'Configuración guardada.' });
  };

  return (
    <form onSubmit={save} className="grid gap-6 lg:grid-cols-2">
      <Card className="space-y-4">
        <h2 className="font-display text-lg font-bold">Capacidad</h2>
        <Field label="Vehículos que puede atender al mismo tiempo" required hint="Lo define cada autolavado. Las reservas comprueban su franja horaria; las llegadas sin cita, la ocupación del momento.">
          {(id) => <Input id={id} type="number" min={1} max={500} inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="Sin configurar" />}
        </Field>
        <Alert kind="info">Regla aplicada (supuesto pendiente de confirmar): cada registro ocupa capacidad desde su hora de inicio durante la duración estimada, hasta que pasa a “Finalizado” o se cancela.</Alert>
        <h2 className="pt-2 font-display text-lg font-bold">Enlaces de seguimiento</h2>
        <Field label="Vigencia de cada enlace (horas)" hint="Vacío = no vence automáticamente (puede revocarlo manualmente). Pendiente de definición por el equipo.">
          {(id) => <Input id={id} type="number" min={1} max={8760} value={ttl} onChange={(e) => setTtl(e.target.value)} placeholder="Sin vencimiento automático" />}
        </Field>
      </Card>
      <Card>
        <h2 className="font-display text-lg font-bold">Horario de atención</h2>
        <p className="mb-3 text-xs text-slate-500">Se usa para avisar si una reserva queda fuera del horario (no la bloquea).</p>
        <div className="space-y-2">
          {DAYS.map((d) => {
            const h = hours[d.key];
            return (
              <div key={d.key} className="grid grid-cols-[110px_1fr] items-center gap-2 sm:grid-cols-[120px_80px_1fr]">
                <span className="text-sm font-medium">{d.label}</span>
                <label className="inline-flex items-center gap-1.5 text-sm"><input type="checkbox" className="rounded text-mimo-blue" checked={!!h?.open} onChange={(e) => setDay(d.key, { open: e.target.checked, from: h?.from || '08:00', to: h?.to || '18:00' })} />Abierto</label>
                {h?.open ? (
                  <div className="col-span-2 flex items-center gap-1 sm:col-span-1">
                    <Input aria-label={`${d.label} apertura`} type="time" value={h.from} onChange={(e) => setDay(d.key, { from: e.target.value })} />
                    <span>–</span>
                    <Input aria-label={`${d.label} cierre`} type="time" value={h.to} onChange={(e) => setDay(d.key, { to: e.target.value })} />
                  </div>
                ) : <span className="col-span-2 text-xs text-slate-400 sm:col-span-1">{h ? 'Cerrado' : 'Sin definir'}</span>}
              </div>
            );
          })}
        </div>
      </Card>
      <div className="lg:col-span-2">
        {msg && <Alert kind={msg.k} className="mb-3">{msg.t}</Alert>}
        <Button type="submit" loading={saving} icon={<Save className="h-4 w-4" />}>Guardar configuración</Button>
      </div>
    </form>
  );
}

function ServicesTab() {
  const { business } = useAuth();
  const bid = business!.id;
  const { data, loading, error, reload } = useLoader(() => listServices(bid), [bid]);
  const [edit, setEdit] = useState<Partial<Service> | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const toggle = async (s: Service) => {
    const { error } = await requireSupabase().from('services').update({ active: !s.active }).eq('id', s.id);
    if (error) setMsg(friendlyError(error)); else void reload();
  };
  const remove = async (s: Service) => {
    if (!window.confirm(`¿Eliminar el servicio “${s.name}”? Los registros existentes conservarán sus datos pero quedarán sin servicio asociado.`)) return;
    const { error } = await requireSupabase().from('services').delete().eq('id', s.id);
    if (error) setMsg(friendlyError(error)); else void reload();
  };

  return (
    <div>
      <div className="mb-4 flex justify-between gap-2">
        <p className="text-sm text-slate-600">Catálogo de servicios con precio en COP y duración. MIMO no asume impuestos ni tarifas adicionales.</p>
        <Button onClick={() => setEdit({ active: true })} icon={<Plus className="h-4 w-4" />}>Nuevo servicio</Button>
      </div>
      {(error || msg) && <Alert className="mb-3">{error ?? msg}</Alert>}
      {loading && !data ? <Spinner /> : (data ?? []).length === 0 ? <EmptyState icon={<Wrench className="h-8 w-8" />} title="Aún no hay servicios">Agregue los servicios que ofrece su autolavado.</EmptyState> : (
        <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Servicio</th><th className="hidden px-4 py-3 sm:table-cell">Precio</th><th className="hidden px-4 py-3 sm:table-cell">Duración</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3 text-right">Acciones</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data!.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3"><div className="font-semibold">{s.name}</div>{s.description && <div className="text-xs text-slate-500">{s.description}</div>}<div className="text-xs text-slate-500 sm:hidden">{formatCOP(s.price_cop)} · {s.duration_minutes ? `${s.duration_minutes} min` : '—'}</div></td>
                  <td className="hidden px-4 py-3 sm:table-cell">{formatCOP(s.price_cop)}</td>
                  <td className="hidden px-4 py-3 sm:table-cell">{s.duration_minutes ? `${s.duration_minutes} min` : '—'}</td>
                  <td className="px-4 py-3"><button onClick={() => void toggle(s)} className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${s.active ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200'}`}>{s.active ? 'Activo' : 'Inactivo'}</button></td>
                  <td className="px-4 py-3 text-right"><button onClick={() => setEdit(s)} className="rounded p-1.5 hover:bg-slate-100" aria-label={`Editar ${s.name}`}><Pencil className="h-4 w-4" /></button><button onClick={() => void remove(s)} className="rounded p-1.5 hover:bg-slate-100" aria-label={`Eliminar ${s.name}`}><Trash2 className="h-4 w-4 text-rose-600" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Editar servicio' : 'Nuevo servicio'}>
        {edit && <ServiceForm businessId={bid} initial={edit} onDone={() => { setEdit(null); void reload(); }} />}
      </Modal>
    </div>
  );
}

function ServiceForm({ businessId, initial, onDone }: { businessId: string; initial: Partial<Service>; onDone: () => void }) {
  const [f, setF] = useState({ name: initial.name ?? '', description: initial.description ?? '', price: initial.price_cop?.toString() ?? '', duration: initial.duration_minutes?.toString() ?? '', active: initial.active ?? true });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (f.name.trim().length < 2) return setErr('Escriba el nombre del servicio.');
    const price = f.price.trim() === '' ? null : Number(f.price);
    if (price !== null && (!Number.isInteger(price) || price < 0)) return setErr('El precio debe ser un número entero en COP (sin puntos).');
    const dur = f.duration.trim() === '' ? null : Number(f.duration);
    if (dur !== null && (!Number.isInteger(dur) || dur < 1 || dur > 1440)) return setErr('La duración debe estar entre 1 y 1440 minutos.');
    setSaving(true); setErr(null);
    const payload = { name: f.name.trim(), description: f.description.trim() || null, price_cop: price, duration_minutes: dur, active: f.active };
    const sb = requireSupabase();
    const { error } = initial.id ? await sb.from('services').update(payload).eq('id', initial.id) : await sb.from('services').insert({ ...payload, business_id: businessId });
    setSaving(false);
    if (error) return setErr(friendlyError(error));
    onDone();
  };
  return (
    <form onSubmit={save} className="space-y-4">
      <Field label="Nombre" required>{(id) => <Input id={id} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
      <Field label="Descripción">{(id) => <Textarea id={id} rows={2} maxLength={300} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />}</Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Precio (COP)" hint="Opcional">{(id) => <Input id={id} type="number" min={0} inputMode="numeric" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />}</Field>
        <Field label="Duración (min)" hint="Prellena la duración estimada">{(id) => <Input id={id} type="number" min={1} max={1440} inputMode="numeric" value={f.duration} onChange={(e) => setF({ ...f, duration: e.target.value })} />}</Field>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="rounded text-mimo-blue" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />Activo (disponible para nuevas reservas)</label>
      {err && <Alert>{err}</Alert>}
      <Button type="submit" className="w-full" loading={saving}>Guardar servicio</Button>
    </form>
  );
}

function UsersTab() {
  const { business, profile } = useAuth();
  const bid = business!.id;
  const members = useLoader(async () => {
    const { data, error } = await requireSupabase().from('profiles').select('*').eq('business_id', bid).order('created_at');
    if (error) throw error; return data as Profile[];
  }, [bid]);
  const invites = useLoader(async () => {
    const { data, error } = await requireSupabase().from('business_invitations').select('*').eq('business_id', bid).is('accepted_at', null).order('created_at', { ascending: false });
    if (error) throw error; return data as Invitation[];
  }, [bid]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('operario');
  const [msg, setMsg] = useState<{ k: 'success' | 'error'; t: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const invite = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setMsg({ k: 'error', t: 'Correo no válido.' });
    setBusy(true);
    const { error } = await requireSupabase().from('business_invitations').insert({ business_id: bid, email: email.trim().toLowerCase(), role, invited_by: profile!.auth_user_id });
    setBusy(false);
    if (error) return setMsg({ k: 'error', t: /duplicate|ya existe/i.test(error.message) ? 'Ya existe una invitación pendiente para ese correo.' : friendlyError(error) });
    setEmail(''); setMsg({ k: 'success', t: 'Invitación creada. Pida a la persona que se registre en MIMO con ese correo; al entrar podrá unirse a su autolavado.' });
    void invites.reload();
  };
  const cancelInvite = async (i: Invitation) => {
    const { error } = await requireSupabase().from('business_invitations').delete().eq('id', i.id);
    if (error) setMsg({ k: 'error', t: friendlyError(error) }); else void invites.reload();
  };
  const removeMember = async (p: Profile) => {
    if (!window.confirm(`¿Retirar el acceso de ${p.full_name}?`)) return;
    const { error } = await requireSupabase().rpc('remove_member', { p_profile_id: p.id });
    if (error) setMsg({ k: 'error', t: friendlyError(error) }); else void members.reload();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h2 className="font-display text-lg font-bold">Usuarios autorizados</h2>
        <p className="text-xs text-slate-500">Administrador: acceso completo. Operario: consulta la agenda y cambia el estado operativo; no ve encuestas ni configuración.</p>
        {members.error && <Alert className="mt-3">{members.error}</Alert>}
        <ul className="mt-4 divide-y divide-slate-100">
          {(members.data ?? []).map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 py-3 text-sm">
              <div><div className="font-semibold">{m.full_name}{m.auth_user_id === profile?.auth_user_id && ' (usted)'}</div><div className="text-xs text-slate-500">{m.email} · {m.role === 'admin' ? 'Administrador' : 'Operario'}</div></div>
              {m.auth_user_id !== profile?.auth_user_id && <Button variant="ghost" size="sm" onClick={() => void removeMember(m)} icon={<UserMinus className="h-4 w-4 text-rose-600" />}>Retirar</Button>}
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <h2 className="font-display text-lg font-bold">Invitar usuario</h2>
        <form onSubmit={invite} className="mt-3 space-y-3">
          <Field label="Correo">{(id) => <Input id={id} type="email" value={email} onChange={(e) => { setEmail(e.target.value); setMsg(null); }} />}</Field>
          <Field label="Rol">{(id) => <Select id={id} value={role} onChange={(e) => setRole(e.target.value as MemberRole)}><option value="operario">Operario</option><option value="admin">Administrador</option></Select>}</Field>
          {msg && <Alert kind={msg.k}>{msg.t}</Alert>}
          <Button type="submit" loading={busy} icon={<MailPlus className="h-4 w-4" />}>Crear invitación</Button>
        </form>
        <p className="mt-3 text-xs text-slate-500">El envío automático del correo de invitación no está incluido en esta versión: comparta usted mismo el enlace del sitio.</p>
        <h3 className="mt-6 text-sm font-bold">Invitaciones pendientes</h3>
        {(invites.data ?? []).length === 0 ? <p className="mt-1 text-xs text-slate-500">No hay invitaciones pendientes.</p> : (
          <ul className="mt-2 space-y-1">
            {invites.data!.map((i) => (
              <li key={i.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <span>{i.email} · {i.role === 'admin' ? 'Administrador' : 'Operario'} <span className="text-xs text-slate-400">({formatDateTime(i.created_at)})</span></span>
                <button onClick={() => void cancelInvite(i)} className="text-xs font-semibold text-rose-600 hover:underline">Anular</button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function StatesTab() {
  return (
    <Card className="max-w-2xl space-y-4">
      <h2 className="font-display text-lg font-bold">Estados del servicio</h2>
      <p className="text-sm text-slate-600">Definidos por el equipo de MIMO. No son editables en esta versión.</p>
      <div>
        <h3 className="text-sm font-bold">Estado operativo (lo ve el cliente)</h3>
        <div className="mt-2 flex flex-wrap gap-2">{OPERATIONAL_STATUSES.map((s) => <OperationalBadge key={s} status={s} />)}</div>
      </div>
      <div>
        <h3 className="text-sm font-bold">Estado de la reserva (solo agenda interna)</h3>
        <p className="mt-1 text-sm text-slate-600">Pendiente · Confirmada · Cancelada · Atendida</p>
      </div>
      <Alert kind="warning">Pendiente de definición: el significado exacto de “Libre” (estado inicial del servicio o puesto disponible). En esta versión, cada servicio inicia en “Libre” y el personal lo cambia.</Alert>
    </Card>
  );
}
