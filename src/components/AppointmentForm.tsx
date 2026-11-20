import { useMemo, useState, type FormEvent } from 'react';
import { Footprints, CalendarPlus, Save } from 'lucide-react';
import { Alert, Button, Field, Input, Select, Textarea } from './ui';
import { requireSupabase } from '../lib/supabase';
import { friendlyError } from '../lib/errors';
import { bogotaToISO, dateKeyBogota, minutesBetween, normalizePlate, timeBogota, todayBogota } from '../lib/format';
import { outsideHoursWarning } from '../lib/hours';
import { RESERVATION_STATUSES, reservationMeta } from '../lib/status';
import type { Appointment, BusinessSettings, IntakeType, ReservationStatus, Service } from '../lib/types';

interface Props {
  businessId: string;
  services: Service[];
  settings: BusinessSettings | null;
  intake: IntakeType;
  initial?: Appointment | null;
  defaultDate?: string;
  onSaved: (a: Appointment) => void;
  onCancel: () => void;
}

export function AppointmentForm({ businessId, services, settings, intake, initial, defaultDate, onSaved, onCancel }: Props) {
  const editing = !!initial;
  const isWalkIn = intake === 'walk_in';
  const activeServices = services.filter((s) => s.active || s.id === initial?.service_id);
  const [f, setF] = useState(() => ({
    customer_name: initial?.customer_name ?? '',
    customer_phone: initial?.customer_phone ?? '',
    vehicle_plate: initial?.vehicle_plate ?? '',
    vehicle_model: initial?.vehicle_model ?? '',
    service_id: initial?.service_id ?? '',
    date: initial ? dateKeyBogota(initial.scheduled_start) : defaultDate ?? todayBogota(),
    time: initial ? timeBogota(initial.scheduled_start) : isWalkIn ? timeBogota(new Date()) : '',
    duration: initial ? String(minutesBetween(initial.scheduled_start, initial.scheduled_end)) : '',
    notes: initial?.notes ?? '',
    status: (initial?.status ?? (isWalkIn ? 'confirmada' : 'pendiente')) as ReservationStatus,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const onService = (id: string) => {
    const s = services.find((x) => x.id === id);
    setF((p) => ({ ...p, service_id: id, duration: s?.duration_minutes ? String(s.duration_minutes) : p.duration }));
  };

  const hoursWarning = useMemo(() => {
    if (!settings || !f.date || !f.time || !Number(f.duration)) return null;
    try {
      const s = bogotaToISO(f.date, f.time);
      const e = new Date(new Date(s).getTime() + Number(f.duration) * 60000).toISOString();
      return outsideHoursWarning(settings.opening_hours, s, e);
    } catch { return null; }
  }, [settings, f.date, f.time, f.duration]);

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const v: Record<string, string> = {};
    if (f.customer_name.trim().length < 2) v.customer_name = 'Escriba el nombre del cliente.';
    if (!/^[0-9+() -]{7,20}$/.test(f.customer_phone.trim())) v.customer_phone = 'Teléfono no válido (7 a 20 dígitos).';
    if (!/^[A-Z0-9-]{3,10}$/.test(normalizePlate(f.vehicle_plate))) v.vehicle_plate = 'Placa no válida (3 a 10 letras/números).';
    if (!isWalkIn || editing) {
      if (!f.date) v.date = 'Seleccione la fecha.';
      if (!/^\d{2}:\d{2}$/.test(f.time)) v.time = 'Seleccione la hora.';
    }
    const dur = Number(f.duration);
    if (!Number.isInteger(dur) || dur < 1 || dur > 1440) v.duration = 'Indique la duración estimada en minutos.';
    setErrors(v); setError(null);
    if (Object.keys(v).length) return;

    let startISO: string;
    try {
      startISO = isWalkIn && !editing ? new Date().toISOString() : bogotaToISO(f.date, f.time);
    } catch (e) { setError(friendlyError(e)); return; }
    const endISO = new Date(new Date(startISO).getTime() + dur * 60000).toISOString();

    const payload = {
      customer_name: f.customer_name.trim(),
      customer_phone: f.customer_phone.trim(),
      vehicle_plate: normalizePlate(f.vehicle_plate),
      vehicle_model: f.vehicle_model.trim() || null,
      service_id: f.service_id || null,
      scheduled_start: startISO,
      scheduled_end: endISO,
      notes: f.notes.trim() || null,
      status: f.status,
    };

    setSaving(true);
    const sb = requireSupabase();
    const res = editing
      ? await sb.from('appointments').update(payload).eq('id', initial!.id).select().single()
      : await sb.from('appointments').insert({ ...payload, business_id: businessId, intake_type: intake }).select().single();
    setSaving(false);
    if (res.error) { setError(friendlyError(res.error)); return; }
    onSaved(res.data as Appointment);
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {isWalkIn && !editing && <Alert kind="info">Llegada sin cita: se registra con la hora actual y se verifica la capacidad disponible en este momento.</Alert>}
      {settings?.capacity === null && <Alert kind="warning">Configure la capacidad del autolavado antes de registrar vehículos.</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre del cliente" required error={errors.customer_name}>{(id) => <Input id={id} value={f.customer_name} onChange={(e) => set('customer_name', e.target.value)} />}</Field>
        <Field label="Teléfono" required error={errors.customer_phone}>{(id) => <Input id={id} type="tel" inputMode="tel" value={f.customer_phone} onChange={(e) => set('customer_phone', e.target.value)} />}</Field>
        <Field label="Placa" required error={errors.vehicle_plate}>{(id) => <Input id={id} className="uppercase" value={f.vehicle_plate} onChange={(e) => set('vehicle_plate', e.target.value)} />}</Field>
        <Field label="Marca / modelo" hint="Opcional">{(id) => <Input id={id} value={f.vehicle_model} onChange={(e) => set('vehicle_model', e.target.value)} />}</Field>
      </div>
      <Field label="Servicio" hint={activeServices.length === 0 ? 'Aún no hay servicios en el catálogo (Configuración → Servicios).' : undefined}>{(id) => (
        <Select id={id} value={f.service_id} onChange={(e) => onService(e.target.value)}>
          <option value="">— Sin servicio específico —</option>
          {activeServices.map((s) => <option key={s.id} value={s.id}>{s.name}{s.duration_minutes ? ` · ${s.duration_minutes} min` : ''}</option>)}
        </Select>)}
      </Field>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {(!isWalkIn || editing) && <>
          <Field label="Fecha" required error={errors.date}>{(id) => <Input id={id} type="date" value={f.date} onChange={(e) => set('date', e.target.value)} />}</Field>
          <Field label="Hora" required error={errors.time}>{(id) => <Input id={id} type="time" value={f.time} onChange={(e) => set('time', e.target.value)} />}</Field>
        </>}
        <Field label="Duración estimada (min)" required error={errors.duration} hint="Define cuánto ocupa la capacidad.">{(id) => <Input id={id} type="number" min={1} max={1440} inputMode="numeric" value={f.duration} onChange={(e) => set('duration', e.target.value)} />}</Field>
      </div>
      {editing && (
        <Field label="Estado de la reserva">{(id) => (
          <Select id={id} value={f.status} onChange={(e) => set('status', e.target.value as ReservationStatus)}>
            {RESERVATION_STATUSES.map((s) => <option key={s} value={s}>{reservationMeta[s].label}</option>)}
          </Select>)}
        </Field>
      )}
      <Field label="Notas">{(id) => <Textarea id={id} rows={2} maxLength={1000} value={f.notes} onChange={(e) => set('notes', e.target.value)} />}</Field>
      {hoursWarning && <Alert kind="warning">{hoursWarning}</Alert>}
      {error && <Alert>{error}</Alert>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={saving} icon={editing ? <Save className="h-4 w-4" /> : isWalkIn ? <Footprints className="h-4 w-4" /> : <CalendarPlus className="h-4 w-4" />}>
          {editing ? 'Guardar cambios' : isWalkIn ? 'Registrar llegada' : 'Crear reserva'}
        </Button>
      </div>
    </form>
  );
}
