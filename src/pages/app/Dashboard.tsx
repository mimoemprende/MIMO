import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, Footprints, Loader, CheckCircle2, Gauge, Plus, MessageSquareHeart, Star, CalendarClock, RefreshCw } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useLoader } from '../../hooks/useLoader';
import { listActiveAt, listAppointmentsRange, listInProgress, listServices } from '../../lib/api';
import { requireSupabase } from '../../lib/supabase';
import { dayRangeISO, formatDateKey, todayBogota, weekdayName, addDays } from '../../lib/format';
import { Alert, Button, Card, EmptyState, PageHeader, Spinner } from '../../components/ui';
import { AppointmentRow } from '../../components/AppointmentRow';
import type { Service } from '../../lib/types';

export default function Dashboard() {
  const { business, settings, isAdmin } = useAuth();
  const bid = business!.id;
  const today = todayBogota();
  const nav = useNavigate();

  const { data, loading, error, reload } = useLoader(async () => {
    const { from, to } = dayRangeISO(today);
    const nowISO = new Date().toISOString();
    const [todays, activeNow, inProgress, services, upcoming] = await Promise.all([
      listAppointmentsRange(bid, from, to),
      listActiveAt(bid, nowISO),
      listInProgress(bid),
      listServices(bid),
      listAppointmentsRange(bid, nowISO, dayRangeISO(addDays(today, 7)).to),
    ]);
    let surveyStats: { count: number; avg: number | null } | null = null;
    if (isAdmin) {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data: sv, error: se } = await requireSupabase().from('surveys').select('service_rating').eq('business_id', bid).gte('created_at', since);
      if (se) throw se;
      const ratings = (sv as { service_rating: number }[]).map((r) => r.service_rating);
      surveyStats = { count: ratings.length, avg: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null };
    }
    return { todays, activeNow, inProgress, services: new Map<string, Service>(services.map((s) => [s.id, s])), upcoming, surveyStats };
  }, [bid, isAdmin]);

  const valid = data?.todays.filter((a) => a.status !== 'cancelada') ?? [];
  const kpis = data ? [
    { label: 'Citas de hoy', value: valid.filter((a) => a.intake_type === 'appointment').length, icon: CalendarDays },
    { label: 'Llegadas sin cita hoy', value: valid.filter((a) => a.intake_type === 'walk_in').length, icon: Footprints },
    { label: 'En curso', value: data.inProgress.length, icon: Loader },
    { label: 'Finalizados hoy', value: valid.filter((a) => a.operational_status === 'Finalizado').length, icon: CheckCircle2 },
  ] : [];

  const upcoming = data?.upcoming.filter((a) => a.status !== 'cancelada' && a.operational_status === 'Libre').slice(0, 6) ?? [];

  return (
    <div>
      <PageHeader
        title="Panel"
        subtitle={<span className="capitalize">{weekdayName(today)} {formatDateKey(today)} · {business?.name}</span>}
        actions={<>
          <Button variant="ghost" onClick={() => void reload()} icon={<RefreshCw className="h-4 w-4" />}>Actualizar</Button>
          {isAdmin && <Button onClick={() => nav('/app/agenda?nuevo=cita')} icon={<Plus className="h-4 w-4" />}>Nueva reserva</Button>}
          {isAdmin && <Button variant="secondary" onClick={() => nav('/app/agenda?nuevo=sin-cita')} icon={<Footprints className="h-4 w-4" />}>Llegada sin cita</Button>}
        </>}
      />
      {loading && !data && <Spinner />}
      {error && <Alert className="mb-4">No se pudo cargar el panel: {error} <button className="ml-2 font-semibold underline" onClick={() => void reload()}>Reintentar</button></Alert>}
      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {kpis.map((k) => (
              <Card key={k.label} className="!p-4">
                <k.icon className="h-5 w-5 text-mimo-blue" />
                <div className="mt-2 font-display text-3xl font-bold">{k.value}</div>
                <div className="text-xs font-medium text-slate-500">{k.label}</div>
              </Card>
            ))}
            <Card className="col-span-2 !p-4 lg:col-span-1">
              <Gauge className="h-5 w-5 text-mimo-orange" />
              <div className="mt-2 font-display text-3xl font-bold">
                {settings?.capacity ? `${data.activeNow.length}/${settings.capacity}` : '—'}
              </div>
              <div className="text-xs font-medium text-slate-500">{settings?.capacity ? 'Capacidad ocupada ahora' : 'Capacidad sin configurar'}</div>
              {settings?.capacity ? (
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                  <div className="h-full rounded-full bg-mimo-cyan" style={{ width: `${Math.min(100, (data.activeNow.length / settings.capacity) * 100)}%` }} />
                </div>
              ) : null}
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section>
              <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold"><Loader className="h-5 w-5 text-mimo-blue" />Vehículos en curso</h2>
              {data.inProgress.length === 0
                ? <EmptyState title="No hay vehículos en curso">Cuando cambie un servicio a “En curso” aparecerá aquí.</EmptyState>
                : <div className="space-y-2">{data.inProgress.map((a) => <AppointmentRow key={a.id} a={a} services={data.services} showDate />)}</div>}
            </section>
            <section>
              <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold"><CalendarClock className="h-5 w-5 text-mimo-blue" />Próximas citas (7 días)</h2>
              {upcoming.length === 0
                ? <EmptyState title="Sin próximas citas">Cree una reserva desde la agenda.</EmptyState>
                : <div className="space-y-2">{upcoming.map((a) => <AppointmentRow key={a.id} a={a} services={data.services} showDate />)}</div>}
              <Link to="/app/agenda" className="mt-3 inline-block text-sm font-semibold text-mimo-blue hover:underline">Ver agenda completa →</Link>
            </section>
          </div>

          {isAdmin && data.surveyStats && (
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <MessageSquareHeart className="h-8 w-8 text-mimo-blue" />
                  <div><p className="font-display text-lg font-bold">Encuestas (últimos 30 días)</p>
                    <p className="text-sm text-slate-500">{data.surveyStats.count} respuesta(s)
                      {data.surveyStats.avg !== null && <> · promedio <Star className="inline h-4 w-4 fill-mimo-yellow text-mimo-orange" /> <b>{data.surveyStats.avg.toFixed(1)}</b>/5</>}</p></div>
                </div>
                <Button variant="secondary" onClick={() => nav('/app/encuestas')}>Ver encuestas</Button>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
