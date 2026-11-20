import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { ArrowLeft, Copy, Download, RefreshCw, Ban, Pencil, Trash2, QrCode, History, Star, ExternalLink, CheckCircle2, Footprints, CalendarDays } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useLoader } from '../../hooks/useLoader';
import { activeTrackingLink, createTrackingLink, getAppointment, listServices, listUpdates, revokeTrackingLinks, setOperationalStatus, surveyForAppointment } from '../../lib/api';
import { requireSupabase, publicSiteUrl } from '../../lib/supabase';
import { friendlyError } from '../../lib/errors';
import { formatCOP, formatDateTime, minutesBetween, timeBogota } from '../../lib/format';
import { OPERATIONAL_STATUSES, operationalMeta, RATING_LABELS } from '../../lib/status';
import type { OperationalStatus } from '../../lib/types';
import { Alert, Button, Card, Modal, OperationalBadge, ReservationBadge, Spinner } from '../../components/ui';
import { AppointmentForm } from '../../components/AppointmentForm';

export default function AppointmentDetail() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { business, settings, isAdmin } = useAuth();
  const bid = business!.id;
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(params.get('nuevo') ? { kind: 'success', text: 'Registro guardado. Comparta el QR con el cliente.' } : null);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [qr, setQr] = useState<string | null>(null);

  const appt = useLoader(() => getAppointment(id), [id]);
  const services = useLoader(() => listServices(bid), [bid]);
  const updates = useLoader(() => listUpdates(id), [id]);
  const link = useLoader(() => activeTrackingLink(id), [id]);
  const survey = useLoader(() => (isAdmin ? surveyForAppointment(id) : Promise.resolve(null)), [id, isAdmin]);

  const url = link.data ? `${publicSiteUrl()}/s/${link.data.token}` : null;

  useEffect(() => {
    if (!url) { setQr(null); return; }
    QRCode.toDataURL(url, { width: 360, margin: 2, color: { dark: '#0B1B3A', light: '#FFFFFF' }, errorCorrectionLevel: 'M' }).then(setQr).catch(() => setQr(null));
  }, [url]);

  const run = async (key: string, fn: () => Promise<void>, ok?: string) => {
    setBusy(key); setMsg(null);
    try { await fn(); if (ok) setMsg({ kind: 'success', text: ok }); }
    catch (e) { setMsg({ kind: 'error', text: friendlyError(e) }); }
    finally { setBusy(null); }
  };

  const changeStatus = (s: OperationalStatus) => run(`op-${s}`, async () => {
    await setOperationalStatus(id, s);
    await Promise.all([appt.reload(), updates.reload()]);
  }, `Estado actualizado a “${s}”. El cliente lo verá en su enlace.`);

  const regenerate = () => run('regen', async () => { await createTrackingLink(id); await link.reload(); }, 'Se generó un enlace nuevo. El anterior dejó de funcionar.');
  const revoke = () => run('revoke', async () => { await revokeTrackingLinks(id); await link.reload(); }, 'Enlace revocado. El cliente ya no puede consultarlo.');
  const copy = async () => { if (!url) return; try { await navigator.clipboard.writeText(url); setMsg({ kind: 'success', text: 'Enlace copiado.' }); } catch { setMsg({ kind: 'error', text: 'No se pudo copiar. Seleccione el enlace manualmente.' }); } };
  const del = () => run('del', async () => {
    const { error } = await requireSupabase().from('appointments').delete().eq('id', id);
    if (error) throw error;
    nav('/app/agenda', { replace: true });
  });

  if (appt.loading && !appt.data) return <Spinner />;
  if (appt.error) return <Alert>{appt.error}</Alert>;
  const a = appt.data;
  if (!a) return (
    <div className="py-16 text-center"><p className="font-semibold">Registro no encontrado</p><p className="text-sm text-slate-500">Puede que haya sido eliminado o no pertenezca a su autolavado.</p><Link to="/app/agenda" className="mt-4 inline-block font-semibold text-mimo-blue">Volver a la agenda</Link></div>
  );
  const svc = services.data?.find((s) => s.id === a.service_id);
  const cancelled = a.status === 'cancelada';

  return (
    <div>
      <Link to="/app/agenda" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-mimo-blue hover:underline"><ArrowLeft className="h-4 w-4" />Agenda</Link>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold sm:text-3xl">{a.vehicle_plate}</h1>
            <ReservationBadge status={a.status} />
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
              {a.intake_type === 'walk_in' ? <><Footprints className="h-3.5 w-3.5" />Sin cita</> : <><CalendarDays className="h-3.5 w-3.5" />Con cita</>}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">{a.customer_name} · {a.customer_phone}{a.vehicle_model ? ` · ${a.vehicle_model}` : ''}</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEditing(true)} icon={<Pencil className="h-4 w-4" />}>Editar / reprogramar</Button>
            <Button variant="ghost" onClick={() => setConfirmDelete(true)} aria-label="Eliminar" icon={<Trash2 className="h-4 w-4 text-rose-600" />} />
          </div>
        )}
      </div>

      {msg && <Alert kind={msg.kind} className="mb-4">{msg.text}</Alert>}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <h2 className="font-display text-lg font-bold">Estado operativo</h2>
            <p className="text-sm text-slate-500">Lo que ve el cliente en su enlace. Separado del estado de la reserva.</p>
            <div className="mt-4 flex items-center gap-3"><OperationalBadge status={a.operational_status} size="lg" /><span className="text-xs text-slate-500">Actualizado {formatDateTime(a.status_updated_at)}</span></div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {OPERATIONAL_STATUSES.map((s) => {
                const Icon = operationalMeta[s].icon;
                const current = a.operational_status === s;
                return (
                  <button key={s} disabled={current || !!busy || cancelled} onClick={() => void changeStatus(s)} aria-pressed={current}
                    className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-sm font-semibold ring-1 transition disabled:cursor-not-allowed ${current ? 'bg-mimo-blue text-white ring-mimo-blue' : 'bg-white ring-slate-200 hover:bg-mimo-blue-50 disabled:opacity-50'}`}>
                    <Icon className="h-5 w-5" />{s}
                  </button>
                );
              })}
            </div>
            {cancelled && <p className="mt-2 text-xs text-slate-500">La reserva está cancelada. Cambie el estado de la reserva para actualizar el estado operativo.</p>}
          </Card>

          <Card>
            <h2 className="font-display text-lg font-bold">Detalle</h2>
            <dl className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <div><dt className="text-slate-500">Servicio</dt><dd className="font-medium">{svc?.name ?? '—'}</dd></div>
              <div><dt className="text-slate-500">Precio (catálogo)</dt><dd className="font-medium">{formatCOP(svc?.price_cop)}</dd></div>
              <div><dt className="text-slate-500">Inicio</dt><dd className="font-medium">{formatDateTime(a.scheduled_start)}</dd></div>
              <div><dt className="text-slate-500">Fin estimado</dt><dd className="font-medium">{timeBogota(a.scheduled_end)}</dd></div>
              <div><dt className="text-slate-500">Duración estimada</dt><dd className="font-medium">{minutesBetween(a.scheduled_start, a.scheduled_end)} min</dd></div>
              <div><dt className="text-slate-500">Registrado</dt><dd className="font-medium">{formatDateTime(a.created_at)}</dd></div>
              {a.notes && <div className="col-span-full"><dt className="text-slate-500">Notas</dt><dd className="whitespace-pre-wrap">{a.notes}</dd></div>}
            </dl>
          </Card>

          <Card>
            <h2 className="flex items-center gap-2 font-display text-lg font-bold"><History className="h-5 w-5 text-mimo-blue" />Historial de estados</h2>
            {updates.error && <Alert className="mt-3">{updates.error}</Alert>}
            <ol className="mt-3 space-y-2">
              {(updates.data ?? []).map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-2 text-sm"><OperationalBadge status={u.status} /><span className="text-slate-500">{formatDateTime(u.created_at)}</span></li>
              ))}
            </ol>
          </Card>

          {isAdmin && (
            <Card>
              <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Star className="h-5 w-5 text-mimo-orange" />Encuesta del cliente</h2>
              {survey.data ? (
                <div className="mt-3 space-y-1 text-sm">
                  <p><b>¿Qué le pareció?</b> {survey.data.service_rating}/5 · {RATING_LABELS[survey.data.service_rating]}</p>
                  <p><b>¿Volvería?</b> {survey.data.would_return ? 'Sí' : 'No'}</p>
                  <p><b>Sugerencia o queja:</b> {survey.data.suggestion_or_complaint ?? '—'}</p>
                  <p className="text-xs text-slate-500">Recibida {formatDateTime(survey.data.created_at)}</p>
                </div>
              ) : <p className="mt-2 text-sm text-slate-500">{a.operational_status === 'Finalizado' ? 'El cliente aún no ha respondido. La encuesta está disponible en su enlace.' : 'Se habilita cuando el servicio pase a “Finalizado”.'}</p>}
            </Card>
          )}
        </div>

        <Card className="h-fit lg:sticky lg:top-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold"><QrCode className="h-5 w-5 text-mimo-blue" />Seguimiento del cliente</h2>
          <p className="text-sm text-slate-500">El cliente escanea el QR o abre el enlace. Solo verá este servicio.</p>
          {link.loading && !link.data ? <Spinner /> : url ? (
            <div className="mt-4 space-y-3">
              {qr && <img src={qr} alt={`Código QR del servicio ${a.vehicle_plate}`} className="mx-auto w-full max-w-[260px] rounded-2xl ring-1 ring-slate-200" />}
              <div className="break-all rounded-xl bg-slate-50 p-2 text-xs text-slate-600">{url}</div>
              {link.data?.expires_at && <p className="text-xs text-slate-500">Vence: {formatDateTime(link.data.expires_at)}</p>}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" size="sm" onClick={() => void copy()} icon={<Copy className="h-4 w-4" />}>Copiar enlace</Button>
                {qr && <a href={qr} download={`mimo-qr-${a.vehicle_plate}.png`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-1.5 text-sm font-semibold text-mimo-blue ring-1 ring-inset ring-mimo-blue-100 hover:bg-mimo-blue-50"><Download className="h-4 w-4" />Descargar QR</a>}
                <a href={url} target="_blank" rel="noreferrer" className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold text-mimo-blue hover:bg-mimo-blue-50"><ExternalLink className="h-4 w-4" />Ver como cliente</a>
                <Button variant="ghost" size="sm" loading={busy === 'regen'} onClick={() => void regenerate()} icon={<RefreshCw className="h-4 w-4" />}>Generar nuevo</Button>
                <Button variant="ghost" size="sm" loading={busy === 'revoke'} onClick={() => void revoke()} icon={<Ban className="h-4 w-4 text-rose-600" />}>Revocar</Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-3 text-center">
              <p className="text-sm text-slate-500">No hay un enlace activo (no se ha generado, venció o fue revocado).</p>
              <Button loading={busy === 'regen'} onClick={() => void regenerate()} icon={<QrCode className="h-4 w-4" />}>Generar QR y enlace</Button>
            </div>
          )}
          {link.error && <Alert className="mt-3">{link.error}</Alert>}
          {a.operational_status === 'Finalizado' && survey.data && <p className="mt-3 flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 className="h-4 w-4" />Encuesta respondida</p>}
        </Card>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Editar / reprogramar" wide>
        {editing && (
          <AppointmentForm businessId={bid} services={services.data ?? []} settings={settings} intake={a.intake_type} initial={a}
            onSaved={() => { setEditing(false); void appt.reload(); setMsg({ kind: 'success', text: 'Cambios guardados.' }); }} onCancel={() => setEditing(false)} />
        )}
      </Modal>
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Eliminar registro">
        <p className="text-sm text-slate-600">Se eliminará el registro de <b>{a.vehicle_plate}</b>, su historial, su enlace y su encuesta. Esta acción no se puede deshacer. Si solo desea anularlo, cambie el estado de la reserva a <b>Cancelada</b>.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Volver</Button>
          <Button variant="danger" loading={busy === 'del'} onClick={() => void del()}>Eliminar definitivamente</Button>
        </div>
      </Modal>
    </div>
  );
}
