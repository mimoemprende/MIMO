import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Footprints, Search, List, CalendarRange, X, CalendarX } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useLoader } from '../../hooks/useLoader';
import { createTrackingLink, listAppointmentsRange, listServices, searchAppointments } from '../../lib/api';
import { addDays, dateKeyBogota, dayRangeISO, formatDateKey, startOfWeek, todayBogota, weekdayName } from '../../lib/format';
import { OPERATIONAL_STATUSES, RESERVATION_STATUSES, reservationMeta } from '../../lib/status';
import type { Appointment, IntakeType, OperationalStatus, ReservationStatus, Service } from '../../lib/types';
import { Alert, Button, EmptyState, Input, Modal, PageHeader, Select, Spinner } from '../../components/ui';
import { AppointmentRow } from '../../components/AppointmentRow';
import { AppointmentForm } from '../../components/AppointmentForm';

type View = 'dia' | 'semana';

export default function Agenda() {
  const { business, settings, isAdmin } = useAuth();
  const bid = business!.id;
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<View>(() => (params.get('vista') === 'semana' ? 'semana' : 'dia'));
  const [day, setDay] = useState(() => params.get('fecha') ?? todayBogota());
  const [resFilter, setResFilter] = useState<ReservationStatus | ''>('');
  const [opFilter, setOpFilter] = useState<OperationalStatus | ''>('');
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [creating, setCreating] = useState<IntakeType | null>(null);

  useEffect(() => { const t = setTimeout(() => setDebounced(term.trim()), 350); return () => clearTimeout(t); }, [term]);

  // Abrir formulario desde accesos rápidos (?nuevo=cita | sin-cita)
  useEffect(() => {
    const n = params.get('nuevo');
    if (n && isAdmin) { setCreating(n === 'sin-cita' ? 'walk_in' : 'appointment'); params.delete('nuevo'); setParams(params, { replace: true }); }
  }, [params, setParams, isAdmin]);

  const range = useMemo(() => {
    if (view === 'dia') return { start: day, days: 1 };
    return { start: startOfWeek(day), days: 7 };
  }, [view, day]);

  const services = useLoader(() => listServices(bid), [bid]);
  const svcMap = useMemo(() => new Map<string, Service>((services.data ?? []).map((s) => [s.id, s])), [services.data]);

  const list = useLoader(async () => {
    if (debounced.length >= 2) return searchAppointments(bid, debounced);
    const from = dayRangeISO(range.start).from;
    const to = dayRangeISO(addDays(range.start, range.days - 1)).to;
    return listAppointmentsRange(bid, from, to);
  }, [bid, range.start, range.days, debounced]);

  const filtered = (list.data ?? []).filter((a) => (!resFilter || a.status === resFilter) && (!opFilter || a.operational_status === opFilter));
  const searching = debounced.length >= 2;

  const step = (dir: number) => setDay(addDays(day, dir * (view === 'dia' ? 1 : 7)));

  const onSaved = async (a: Appointment) => {
    setCreating(null);
    // El sistema habilita el acceso del cliente: se genera el QR/enlace al registrar.
    try { await createTrackingLink(a.id); } catch { /* el enlace puede generarse luego desde el detalle */ }
    nav(`/app/servicios/${a.id}?nuevo=1`);
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(range.start, i));
  const byDay = (k: string) => filtered.filter((a) => dateKeyBogota(a.scheduled_start) === k);

  return (
    <div>
      <PageHeader
        title="Agenda"
        subtitle="Reservas con cita y llegadas sin cita. La capacidad se verifica automáticamente."
        actions={isAdmin && <>
          <Button onClick={() => setCreating('appointment')} icon={<Plus className="h-4 w-4" />}>Nueva reserva</Button>
          <Button variant="secondary" onClick={() => setCreating('walk_in')} icon={<Footprints className="h-4 w-4" />}>Llegada sin cita</Button>
        </>}
      />

      <div className="mb-4 flex flex-col gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-200 lg:flex-row lg:items-center">
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Vista">
            <button onClick={() => setView('dia')} aria-pressed={view === 'dia'} className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold ${view === 'dia' ? 'bg-white text-mimo-blue shadow' : 'text-slate-600'}`}><List className="h-4 w-4" />Día</button>
            <button onClick={() => setView('semana')} aria-pressed={view === 'semana'} className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold ${view === 'semana' ? 'bg-white text-mimo-blue shadow' : 'text-slate-600'}`}><CalendarRange className="h-4 w-4" />Semana</button>
          </div>
          <div className="flex items-center rounded-xl ring-1 ring-slate-200">
            <button className="rounded-l-xl p-2 hover:bg-slate-100" onClick={() => step(-1)} aria-label="Anterior"><ChevronLeft className="h-4 w-4" /></button>
            <input type="date" aria-label="Fecha" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} className="w-[140px] border-0 bg-transparent px-1 py-1.5 text-sm font-semibold focus:ring-0" />
            <button className="rounded-r-xl p-2 hover:bg-slate-100" onClick={() => step(1)} aria-label="Siguiente"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setDay(todayBogota())}>Hoy</Button>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_2fr]">
          <Select aria-label="Estado de reserva" value={resFilter} onChange={(e) => setResFilter(e.target.value as ReservationStatus | '')}>
            <option value="">Reserva: todas</option>
            {RESERVATION_STATUSES.map((s) => <option key={s} value={s}>{reservationMeta[s].label}</option>)}
          </Select>
          <Select aria-label="Estado operativo" value={opFilter} onChange={(e) => setOpFilter(e.target.value as OperationalStatus | '')}>
            <option value="">Operativo: todos</option>
            {OPERATIONAL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <div className="relative col-span-2 sm:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input aria-label="Buscar por nombre, teléfono o placa" placeholder="Buscar nombre, teléfono o placa" value={term} onChange={(e) => setTerm(e.target.value)} className="pl-9 pr-9" />
            {term && <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700" onClick={() => setTerm('')} aria-label="Limpiar búsqueda"><X className="h-4 w-4" /></button>}
          </div>
        </div>
      </div>

      {searching && <p className="mb-3 text-sm text-slate-600">Resultados de búsqueda para “{debounced}” en todas las fechas.</p>}
      {list.error && <Alert className="mb-4">No se pudo cargar la agenda: {list.error} <button className="ml-2 font-semibold underline" onClick={() => void list.reload()}>Reintentar</button></Alert>}
      {list.loading && !list.data ? <Spinner /> : (
        searching || view === 'dia' ? (
          <section>
            {!searching && <h2 className="mb-3 font-display text-lg font-bold capitalize">{weekdayName(day)} {formatDateKey(day)} <span className="text-sm font-normal text-slate-500">· {filtered.length} registro(s)</span></h2>}
            {filtered.length === 0
              ? <EmptyState icon={<CalendarX className="h-8 w-8" />} title={searching ? 'Sin resultados' : 'No hay registros para este día'}>{isAdmin && !searching && 'Use “Nueva reserva” o “Llegada sin cita”.'}</EmptyState>
              : <div className="space-y-2">{filtered.map((a) => <AppointmentRow key={a.id} a={a} services={svcMap} showDate={searching} />)}</div>}
          </section>
        ) : (
          <>
            {/* Escritorio: columnas por día */}
            <div className="hidden gap-2 lg:grid lg:grid-cols-7">
              {weekDays.map((k) => (
                <div key={k} className={`min-h-[200px] rounded-2xl p-2 ring-1 ${k === todayBogota() ? 'bg-mimo-cyan-50 ring-mimo-cyan' : 'bg-white ring-slate-200'}`}>
                  <button onClick={() => { setDay(k); setView('dia'); }} className="mb-2 w-full text-left text-xs font-bold capitalize text-mimo-blue hover:underline">{weekdayName(k).slice(0, 3)} {formatDateKey(k).slice(0, 5)}</button>
                  <div className="space-y-1.5">
                    {byDay(k).map((a) => (
                      <button key={a.id} onClick={() => nav(`/app/servicios/${a.id}`)} className={`block w-full rounded-lg bg-white p-1.5 text-left text-[11px] ring-1 ring-slate-200 hover:ring-mimo-blue ${a.status === 'cancelada' ? 'line-through opacity-50' : ''}`}>
                        <b className="text-mimo-blue">{new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(a.scheduled_start))}</b> {a.vehicle_plate}
                        <div className="truncate text-slate-500">{a.customer_name}</div>
                        <div className="text-[10px] font-semibold">{a.operational_status}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {/* Móvil/tableta: lista cronológica */}
            <div className="space-y-5 lg:hidden">
              {weekDays.map((k) => (
                <section key={k}>
                  <h3 className="mb-2 text-sm font-bold capitalize text-mimo-blue">{weekdayName(k)} {formatDateKey(k)}</h3>
                  {byDay(k).length === 0 ? <p className="text-xs text-slate-400">Sin registros</p>
                    : <div className="space-y-2">{byDay(k).map((a) => <AppointmentRow key={a.id} a={a} services={svcMap} />)}</div>}
                </section>
              ))}
            </div>
          </>
        )
      )}

      <Modal open={!!creating} onClose={() => setCreating(null)} title={creating === 'walk_in' ? 'Registrar llegada sin cita' : 'Nueva reserva'} wide>
        {creating && (
          <AppointmentForm businessId={bid} services={services.data ?? []} settings={settings} intake={creating}
            defaultDate={day} onSaved={onSaved} onCancel={() => setCreating(null)} />
        )}
      </Modal>
    </div>
  );
}
