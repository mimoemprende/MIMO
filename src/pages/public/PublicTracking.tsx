import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { RefreshCw, PartyPopper, Ban, CheckCircle2, LinkIcon, Info } from 'lucide-react';
import { Alert, Button, Field, OperationalBadge, Spinner, Textarea } from '../../components/ui';
import { StarRating, YesNo } from '../../components/SurveyInputs';
import { Logo } from '../../components/Logo';
import { ConfigNotice } from '../../components/ConfigNotice';
import { supabase } from '../../lib/supabase';
import { friendlyError } from '../../lib/errors';
import { formatDateTime, relativeFromNow } from '../../lib/format';
import { OPERATIONAL_STATUSES } from '../../lib/status';
import type { PublicTracking as PT } from '../../lib/types';

const POLL_MS = 15000; // 10–20 s según el documento maestro

export default function PublicTracking() {
  const { token = '' } = useParams();
  const [data, setData] = useState<PT | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'invalid' | 'error'>('loading');
  const [err, setErr] = useState('');
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const prevStatus = useRef<string | null>(null);
  const [justFinished, setJustFinished] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data: rows, error } = await supabase.rpc('get_public_tracking', { p_token: token });
    if (error) { setState('error'); setErr(friendlyError(error)); return; }
    const row = (rows as PT[] | null)?.[0];
    if (!row) { setState('invalid'); return; }
    if (prevStatus.current && prevStatus.current !== 'Finalizado' && row.operational_status === 'Finalizado') setJustFinished(true);
    prevStatus.current = row.operational_status;
    setData(row); setState('ok'); setLastFetch(new Date());
  }, [token]);

  useEffect(() => {
    void load();
    const id = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (justFinished && 'vibrate' in navigator) navigator.vibrate?.(200);
  }, [justFinished]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-mimo-blue-50 to-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6">
        <header className="flex justify-center"><div className="rounded-2xl bg-[#FDFDFD] px-4 py-2 shadow-sm ring-1 ring-slate-200"><Logo className="h-9 w-auto" /></div></header>
        <main className="mt-6 flex-1">
          {!supabase && <ConfigNotice what="El seguimiento" />}
          {supabase && state === 'loading' && <Spinner label="Consultando su servicio…" />}
          {state === 'invalid' && (
            <div className="rounded-3xl bg-white p-6 text-center shadow-card">
              <LinkIcon className="mx-auto h-10 w-10 text-slate-400" />
              <h1 className="mt-3 font-display text-xl font-bold">Enlace no disponible</h1>
              <p className="mt-2 text-sm text-slate-600">Este enlace no es válido, venció o fue reemplazado por uno nuevo. Solicite un nuevo código QR en el autolavado.</p>
            </div>
          )}
          {state === 'error' && <Alert>No pudimos consultar el estado: {err}</Alert>}
          {state === 'ok' && data && (
            <div className="space-y-4">
              <section className="rounded-3xl bg-white p-6 text-center shadow-card" aria-live="polite">
                <p className="text-sm text-slate-500">{data.business_name}</p>
                <h1 className="mt-1 font-display text-xl font-bold">Vehículo {data.plate_hint}{data.vehicle_model ? ` · ${data.vehicle_model}` : ''}</h1>
                {data.service_name && <p className="text-sm text-slate-600">{data.service_name}</p>}
                {data.reservation_cancelled ? (
                  <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-2 font-semibold text-rose-700 ring-1 ring-rose-200"><Ban className="h-5 w-5" />Servicio cancelado</div>
                ) : (
                  <>
                    <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">Estado actual</p>
                    <div className="mt-2 flex justify-center"><OperationalBadge status={data.operational_status} size="lg" /></div>
                    <ol className="mx-auto mt-6 flex max-w-xs items-center gap-1" aria-label="Progreso del servicio">
                      {OPERATIONAL_STATUSES.map((s, i) => {
                        const idx = OPERATIONAL_STATUSES.indexOf(data.operational_status);
                        return (
                          <li key={s} className="flex flex-1 flex-col items-center gap-1">
                            <span className={`h-2 w-full rounded-full ${i <= idx ? 'bg-mimo-cyan' : 'bg-slate-200'}`} />
                            <span className={`text-[11px] ${i === idx ? 'font-bold text-mimo-blue' : 'text-slate-400'}`}>{s}</span>
                          </li>
                        );
                      })}
                    </ol>
                  </>
                )}
                {data.operational_status === 'Finalizado' && !data.reservation_cancelled && (
                  <div className="mt-6 rounded-2xl bg-emerald-50 p-4 text-emerald-800"><PartyPopper className="mx-auto mb-1 h-6 w-6" /><p className="font-semibold">¡Su vehículo está listo!</p></div>
                )}
                <p className="mt-6 text-sm text-slate-600">Última actualización: <b>{formatDateTime(data.status_updated_at)}</b><br /><span className="text-xs text-slate-500">({relativeFromNow(data.status_updated_at)})</span></p>
                <button onClick={() => void load()} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-mimo-blue hover:underline"><RefreshCw className="h-3.5 w-3.5" />Actualizar ahora</button>
                {lastFetch && <p className="mt-1 text-[11px] text-slate-400">Se actualiza automáticamente cada 15 segundos.</p>}
              </section>

              {data.survey_available && !data.survey_submitted && <SurveyForm token={token} onDone={load} />}
              {data.survey_submitted && (
                <div className="flex items-center gap-2 rounded-2xl bg-white p-4 text-sm shadow-card"><CheckCircle2 className="h-5 w-5 text-emerald-600" />Gracias, ya recibimos su opinión sobre este servicio.</div>
              )}
              <p className="flex items-start gap-2 px-2 text-xs text-slate-500"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />Este estado lo actualiza el personal del autolavado. No es ubicación GPS ni vídeo en vivo.</p>
            </div>
          )}
        </main>
        <footer className="mt-8 text-center text-[11px] font-bold tracking-[0.3em] text-mimo-blue">LAVA · CUIDA · REGRESA</footer>
      </div>
    </div>
  );
}

function SurveyForm({ token, onDone }: { token: string; onDone: () => Promise<void> | void }) {
  const [rating, setRating] = useState(0);
  const [back, setBack] = useState<boolean | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!supabase) return;
    if (!rating) return setError('Seleccione qué le pareció el servicio.');
    if (back === null) return setError('Indique si volvería.');
    setSending(true); setError(null);
    const { error } = await supabase.rpc('submit_survey', { p_token: token, p_service_rating: rating, p_would_return: back, p_suggestion: text.trim() || null });
    setSending(false);
    if (error) return setError(friendlyError(error));
    await onDone();
  };

  return (
    <form className="space-y-5 rounded-3xl bg-white p-6 shadow-card" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <div><h2 className="font-display text-lg font-bold">Cuéntenos su experiencia</h2><p className="text-xs text-slate-500">Su respuesta se comparte solo con este autolavado para mejorar su atención.</p></div>
      <div><p className="mb-2 text-sm font-medium">¿Qué le pareció el servicio? *</p><StarRating value={rating} onChange={(v) => { setRating(v); setError(null); }} /></div>
      <div><p className="mb-2 text-sm font-medium">¿Volvería a ir? *</p><YesNo value={back} onChange={(v) => { setBack(v); setError(null); }} /></div>
      <Field label="Sugerencia o queja (opcional)">{(id) => <Textarea id={id} rows={3} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} />}</Field>
      {error && <Alert>{error}</Alert>}
      <Button type="submit" size="lg" className="w-full" loading={sending}>Enviar opinión</Button>
    </form>
  );
}
