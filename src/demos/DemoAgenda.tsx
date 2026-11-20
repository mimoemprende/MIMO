import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Search, Footprints, CalendarClock, Gauge } from 'lucide-react';
import { DemoShell } from './DemoShell';
import { DEMO_CAPACITY, DEMO_SERVICES, demoMaxConcurrent, initialDemoAppointments, type DemoAppointment } from './demoData';
import { Alert, Button, Field, Input, Modal, OperationalBadge, ReservationBadge, Select } from '../components/ui';
import { addDays, formatDateKey, timeBogota, todayBogota, weekdayName } from '../lib/format';
import { RESERVATION_STATUSES, reservationMeta } from '../lib/status';
import type { ReservationStatus } from '../lib/types';

type FormState = { id?: string; customer: string; plate: string; service: string; date: string; time: string; duration: number; walkIn: boolean };

export default function DemoAgenda() {
  const [list, setList] = useState<DemoAppointment[]>(initialDemoAppointments);
  const [day, setDay] = useState(todayBogota());
  const [filter, setFilter] = useState<ReservationStatus | 'todas'>('todas');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<DemoAppointment | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reset = () => { setList(initialDemoAppointments()); setDay(todayBogota()); setFilter('todas'); setQ(''); setSelected(null); setForm(null); setNotice(null); };

  const visible = useMemo(() => list
    .filter((a) => a.date === day)
    .filter((a) => filter === 'todas' || a.status === filter)
    .filter((a) => !q || `${a.customer} ${a.plate}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.time.localeCompare(b.time)), [list, day, filter, q]);

  const activeNow = list.filter((a) => a.date === todayBogota() && a.op === 'En curso').length;

  const openNew = (walkIn: boolean) => {
    setFormError(null);
    setForm({ customer: '', plate: '', service: DEMO_SERVICES[0].name, date: walkIn ? todayBogota() : day, time: walkIn ? timeBogota(new Date()) : '10:00', duration: DEMO_SERVICES[0].duration, walkIn });
  };

  const save = () => {
    if (!form) return;
    if (form.customer.trim().length < 2) return setFormError('Escriba el nombre del cliente (dato ficticio).');
    if (form.plate.trim().length < 3) return setFormError('Escriba una placa de ejemplo (mínimo 3 caracteres).');
    const used = demoMaxConcurrent(list, form.date, form.time, form.duration, form.id);
    if (used + 1 > DEMO_CAPACITY) {
      return setFormError(`Conflicto de capacidad: la capacidad de ejemplo es ${DEMO_CAPACITY} vehículos simultáneos y esa franja ya tiene ${used}. Elija otra hora.`);
    }
    if (form.id) {
      setList((l) => l.map((a) => (a.id === form.id ? { ...a, date: form.date, time: form.time, duration: form.duration, service: form.service, customer: form.customer, plate: form.plate.toUpperCase() } : a)));
      setNotice('Reserva reprogramada (solo en esta demostración).');
    } else {
      const n: DemoAppointment = { id: `n${Date.now()}`, customer: form.customer, plate: form.plate.toUpperCase(), service: form.service, date: form.date, time: form.time, duration: form.duration, status: form.walkIn ? 'confirmada' : 'pendiente', op: 'Libre', walkIn: form.walkIn };
      setList((l) => [...l, n]);
      setDay(form.date);
      setNotice(form.walkIn ? 'Llegada sin cita registrada (demo).' : 'Reserva creada (demo). No se guardó ningún dato real.');
    }
    setForm(null); setSelected(null);
  };

  const cancel = (a: DemoAppointment) => { setList((l) => l.map((x) => (x.id === a.id ? { ...x, status: 'cancelada' } : x))); setSelected(null); setNotice('Reserva cancelada (demo).'); };

  return (
    <DemoShell title="Agenda digital" description="Cambie de día, filtre por estado, abra una reserva, reprograme o registre una llegada sin cita." onReset={reset}>
      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-xl ring-1 ring-slate-200">
              <button className="rounded-l-xl p-2 hover:bg-slate-100" onClick={() => setDay(addDays(day, -1))} aria-label="Día anterior"><ChevronLeft className="h-4 w-4" /></button>
              <span className="min-w-[150px] px-2 text-center text-sm font-semibold capitalize">{weekdayName(day)} {formatDateKey(day)}</span>
              <button className="rounded-r-xl p-2 hover:bg-slate-100" onClick={() => setDay(addDays(day, 1))} aria-label="Día siguiente"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <Select aria-label="Filtrar por estado de reserva" value={filter} onChange={(e) => setFilter(e.target.value as ReservationStatus | 'todas')} className="!w-auto">
              <option value="todas">Todos los estados</option>
              {RESERVATION_STATUSES.map((s) => <option key={s} value={s}>{reservationMeta[s].label}</option>)}
            </Select>
            <div className="relative min-w-[160px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input aria-label="Buscar" placeholder="Buscar nombre o placa" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
          </div>
          {notice && <Alert kind="success">{notice}</Alert>}
          <ul className="space-y-2">
            {visible.length === 0 && <li className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No hay reservas de ejemplo para este día o filtro.</li>}
            {visible.map((a) => (
              <li key={a.id}>
                <button onClick={() => setSelected(a)} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left ring-1 ring-slate-200 transition hover:bg-mimo-blue-50 hover:ring-mimo-blue-100 ${a.status === 'cancelada' ? 'opacity-60' : ''}`}>
                  <div className="w-14 shrink-0 text-center"><div className="font-display text-lg font-bold text-mimo-blue">{a.time}</div><div className="text-[11px] text-slate-500">{a.duration} min</div></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 truncate font-semibold">{a.customer}{a.walkIn && <span className="inline-flex items-center gap-0.5 rounded bg-mimo-yellow/30 px-1.5 text-[10px] font-bold text-mimo-ink"><Footprints className="h-3 w-3" />SIN CITA</span>}</div>
                    <div className="truncate text-xs text-slate-500">{a.plate} · {a.service}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1"><ReservationBadge status={a.status} /><OperationalBadge status={a.op} /></div>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3">
          <div className="rounded-2xl bg-mimo-blue-50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-mimo-blue"><Gauge className="h-4 w-4" />Capacidad (ejemplo)</div>
            <div className="mt-1 font-display text-2xl font-bold">{activeNow} / {DEMO_CAPACITY}</div>
            <p className="text-xs text-slate-600">vehículos “En curso” hoy. En MIMO cada autolavado configura su propia capacidad.</p>
          </div>
          <Button className="w-full" onClick={() => openNew(false)} icon={<Plus className="h-4 w-4" />}>Nueva reserva</Button>
          <Button className="w-full" variant="secondary" onClick={() => openNew(true)} icon={<Footprints className="h-4 w-4" />}>Llegada sin cita</Button>
        </div>
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Reserva de ejemplo">
        {selected && (
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-2 gap-3">
              <div><dt className="text-slate-500">Cliente</dt><dd className="font-semibold">{selected.customer}</dd></div>
              <div><dt className="text-slate-500">Placa</dt><dd className="font-semibold">{selected.plate}</dd></div>
              <div><dt className="text-slate-500">Servicio</dt><dd>{selected.service}</dd></div>
              <div><dt className="text-slate-500">Fecha y hora</dt><dd>{formatDateKey(selected.date)} {selected.time}</dd></div>
              <div><dt className="text-slate-500">Estado de reserva</dt><dd><ReservationBadge status={selected.status} /></dd></div>
              <div><dt className="text-slate-500">Estado operativo</dt><dd><OperationalBadge status={selected.op} /></dd></div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <Button icon={<CalendarClock className="h-4 w-4" />} disabled={selected.status === 'cancelada'}
                onClick={() => { setFormError(null); setForm({ id: selected.id, customer: selected.customer, plate: selected.plate, service: selected.service, date: selected.date, time: selected.time, duration: selected.duration, walkIn: selected.walkIn }); setSelected(null); }}>
                Reprogramar
              </Button>
              <Button variant="danger" disabled={selected.status === 'cancelada'} onClick={() => cancel(selected)}>Cancelar reserva</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Reprogramar (demo)' : form?.walkIn ? 'Llegada sin cita (demo)' : 'Nueva reserva (demo)'}>
        {form && (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <Alert kind="info">Demostración: los datos no se guardan en ninguna base de datos.</Alert>
            <Field label="Nombre del cliente (ficticio)" required>{(id) => <Input id={id} value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} />}</Field>
            <Field label="Placa (ejemplo)" required>{(id) => <Input id={id} value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} />}</Field>
            <Field label="Servicio">{(id) => (
              <Select id={id} value={form.service} onChange={(e) => { const s = DEMO_SERVICES.find((x) => x.name === e.target.value)!; setForm({ ...form, service: s.name, duration: s.duration }); }}>
                {DEMO_SERVICES.map((s) => <option key={s.name}>{s.name}</option>)}
              </Select>)}
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Fecha">{(id) => <Input id={id} type="date" value={form.date} disabled={form.walkIn} onChange={(e) => setForm({ ...form, date: e.target.value })} />}</Field>
              <Field label="Hora">{(id) => <Input id={id} type="time" value={form.time} disabled={form.walkIn} onChange={(e) => setForm({ ...form, time: e.target.value })} />}</Field>
              <Field label="Duración (min)">{(id) => <Input id={id} type="number" min={5} value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) || 0 })} />}</Field>
            </div>
            {formError && <Alert>{formError}</Alert>}
            <Button type="submit" className="w-full">Guardar en la demo</Button>
          </form>
        )}
      </Modal>
    </DemoShell>
  );
}
