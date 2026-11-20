import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, ThumbsUp, MessageSquare, Inbox } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useLoader } from '../../hooks/useLoader';
import { listServices } from '../../lib/api';
import { requireSupabase } from '../../lib/supabase';
import { formatDateTime } from '../../lib/format';
import { RATING_LABELS } from '../../lib/status';
import type { Survey } from '../../lib/types';
import { Alert, Card, EmptyState, PageHeader, Select, Spinner } from '../../components/ui';

type Row = Survey & { appointments: { vehicle_plate: string; customer_name: string } | null };
const PERIODS = [{ v: '7', l: 'Últimos 7 días' }, { v: '30', l: 'Últimos 30 días' }, { v: '90', l: 'Últimos 90 días' }, { v: 'all', l: 'Todo' }];

export default function Surveys() {
  const { business } = useAuth();
  const bid = business!.id;
  const [period, setPeriod] = useState('30');
  const [serviceId, setServiceId] = useState('');
  const [onlyComments, setOnlyComments] = useState(false);

  const services = useLoader(() => listServices(bid), [bid]);
  const { data, loading, error } = useLoader(async () => {
    let q = requireSupabase().from('surveys').select('*, appointments(vehicle_plate, customer_name)').eq('business_id', bid).order('created_at', { ascending: false }).limit(500);
    if (period !== 'all') q = q.gte('created_at', new Date(Date.now() - Number(period) * 86400000).toISOString());
    if (serviceId) q = q.eq('service_id', serviceId);
    const { data, error } = await q;
    if (error) throw error;
    return data as Row[];
  }, [bid, period, serviceId]);

  const rows = useMemo(() => (data ?? []).filter((r) => !onlyComments || r.suggestion_or_complaint), [data, onlyComments]);
  const all = data ?? [];
  const avg = all.length ? all.reduce((a, b) => a + b.service_rating, 0) / all.length : null;
  const yes = all.filter((r) => r.would_return).length;
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: all.filter((r) => r.service_rating === n).length }));
  const svcName = (id: string | null) => services.data?.find((s) => s.id === id)?.name ?? '—';

  return (
    <div>
      <PageHeader title="Encuestas" subtitle="Respuestas de sus clientes al finalizar el servicio (una por servicio)." />
      <div className="mb-4 flex flex-wrap gap-2">
        <Select aria-label="Periodo" value={period} onChange={(e) => setPeriod(e.target.value)} className="!w-auto">{PERIODS.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}</Select>
        <Select aria-label="Servicio" value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="!w-auto">
          <option value="">Todos los servicios</option>
          {(services.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <label className="inline-flex items-center gap-2 rounded-xl px-3 text-sm ring-1 ring-slate-200"><input type="checkbox" checked={onlyComments} onChange={(e) => setOnlyComments(e.target.checked)} className="rounded text-mimo-blue" />Solo con sugerencia o queja</label>
      </div>
      {error && <Alert className="mb-4">{error}</Alert>}
      {loading && !data ? <Spinner /> : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card><MessageSquare className="h-5 w-5 text-mimo-blue" /><div className="mt-2 font-display text-3xl font-bold">{all.length}</div><div className="text-xs text-slate-500">Respuestas</div></Card>
            <Card><Star className="h-5 w-5 fill-mimo-yellow text-mimo-orange" /><div className="mt-2 font-display text-3xl font-bold">{avg !== null ? avg.toFixed(1) : '—'}<span className="text-base text-slate-400">/5</span></div><div className="text-xs text-slate-500">¿Qué le pareció el servicio? (promedio)</div></Card>
            <Card><ThumbsUp className="h-5 w-5 text-mimo-blue" /><div className="mt-2 font-display text-3xl font-bold">{all.length ? `${yes}/${all.length}` : '—'}</div><div className="text-xs text-slate-500">Respondieron que volverían</div></Card>
          </div>
          {all.length > 0 && (
            <Card className="mt-4">
              <h2 className="text-sm font-bold">Distribución de calificaciones</h2>
              <div className="mt-3 space-y-1.5">
                {dist.map(({ n, c }) => (
                  <div key={n} className="flex items-center gap-2 text-sm">
                    <span className="w-24 shrink-0">{n} · {RATING_LABELS[n]}</span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-mimo-blue" style={{ width: `${(c / all.length) * 100}%` }} /></div>
                    <span className="w-8 text-right font-semibold">{c}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
          <h2 className="mb-3 mt-6 font-display text-lg font-bold">Respuestas</h2>
          {rows.length === 0 ? <EmptyState icon={<Inbox className="h-8 w-8" />} title="Aún no hay respuestas en este periodo">Las encuestas se habilitan en el enlace del cliente cuando el servicio pasa a “Finalizado”.</EmptyState> : (
            <ul className="space-y-2">
              {rows.map((r) => (
                <li key={r.id} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1" aria-label={`${r.service_rating} de 5`}>
                      {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`h-4 w-4 ${n <= r.service_rating ? 'fill-mimo-yellow text-mimo-orange' : 'text-slate-300'}`} />)}
                      <span className="ml-1 text-sm font-semibold">{RATING_LABELS[r.service_rating]}</span>
                    </div>
                    <span className="text-xs text-slate-500">{formatDateTime(r.created_at)}</span>
                  </div>
                  <p className="mt-1 text-sm">¿Volvería? <b>{r.would_return ? 'Sí' : 'No'}</b> · {svcName(r.service_id)} · <Link to={`/app/servicios/${r.appointment_id}`} className="font-semibold text-mimo-blue hover:underline">{r.appointments?.vehicle_plate ?? 'Ver servicio'}</Link></p>
                  {r.suggestion_or_complaint && <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">“{r.suggestion_or_complaint}”</p>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
