import { requireSupabase } from './supabase';
import type { Appointment, OperationalStatus, Service, ServiceUpdate, Survey, TrackingLink } from './types';

export async function listServices(businessId: string, onlyActive = false): Promise<Service[]> {
  let q = requireSupabase().from('services').select('*').eq('business_id', businessId).order('name');
  if (onlyActive) q = q.eq('active', true);
  const { data, error } = await q;
  if (error) throw error;
  return data as Service[];
}

export async function listAppointmentsRange(businessId: string, fromISO: string, toISO: string): Promise<Appointment[]> {
  const { data, error } = await requireSupabase().from('appointments').select('*')
    .eq('business_id', businessId).gte('scheduled_start', fromISO).lt('scheduled_start', toISO)
    .order('scheduled_start');
  if (error) throw error;
  return data as Appointment[];
}

/** Registros que se cruzan con un instante (ocupación actual). */
export async function listActiveAt(businessId: string, atISO: string): Promise<Appointment[]> {
  const { data, error } = await requireSupabase().from('appointments').select('*')
    .eq('business_id', businessId).lte('scheduled_start', atISO).gt('scheduled_end', atISO)
    .neq('status', 'cancelada').neq('operational_status', 'Finalizado');
  if (error) throw error;
  return data as Appointment[];
}

export async function listInProgress(businessId: string): Promise<Appointment[]> {
  const { data, error } = await requireSupabase().from('appointments').select('*')
    .eq('business_id', businessId).eq('operational_status', 'En curso').neq('status', 'cancelada')
    .order('scheduled_start').limit(50);
  if (error) throw error;
  return data as Appointment[];
}

/** Búsqueda por nombre, teléfono o placa (todas las fechas). */
export async function searchAppointments(businessId: string, term: string): Promise<Appointment[]> {
  const t = term.trim().replace(/[%,()"\\*]/g, ' ').trim().slice(0, 60);
  if (!t) return [];
  const plate = t.toUpperCase().replace(/\s+/g, '');
  const { data, error } = await requireSupabase().from('appointments').select('*')
    .eq('business_id', businessId)
    .or(`customer_name.ilike.%${t}%,customer_phone.ilike.%${t}%,vehicle_plate.ilike.%${plate}%`)
    .order('scheduled_start', { ascending: false }).limit(100);
  if (error) throw error;
  return data as Appointment[];
}

export async function getAppointment(id: string): Promise<Appointment | null> {
  const { data, error } = await requireSupabase().from('appointments').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Appointment | null;
}

export async function listUpdates(appointmentId: string): Promise<ServiceUpdate[]> {
  const { data, error } = await requireSupabase().from('service_updates').select('*')
    .eq('appointment_id', appointmentId).order('created_at', { ascending: false });
  if (error) throw error;
  return data as ServiceUpdate[];
}

export async function activeTrackingLink(appointmentId: string): Promise<TrackingLink | null> {
  const { data, error } = await requireSupabase().from('tracking_links').select('*')
    .eq('appointment_id', appointmentId).is('revoked_at', null)
    .order('created_at', { ascending: false }).limit(1);
  if (error) throw error;
  const link = (data as TrackingLink[])[0] ?? null;
  if (link && link.expires_at && new Date(link.expires_at) <= new Date()) return null;
  return link;
}

export async function createTrackingLink(appointmentId: string): Promise<string> {
  const { data, error } = await requireSupabase().rpc('create_tracking_link', { p_appointment: appointmentId });
  if (error) throw error;
  return (data as { token: string }[])[0].token;
}

export async function revokeTrackingLinks(appointmentId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('revoke_tracking_links', { p_appointment: appointmentId });
  if (error) throw error;
}

export async function setOperationalStatus(appointmentId: string, status: OperationalStatus): Promise<void> {
  const { error } = await requireSupabase().rpc('set_operational_status', { p_appointment: appointmentId, p_status: status });
  if (error) throw error;
}

export async function surveyForAppointment(appointmentId: string): Promise<Survey | null> {
  const { data, error } = await requireSupabase().from('surveys').select('*').eq('appointment_id', appointmentId).maybeSingle();
  if (error) throw error;
  return data as Survey | null;
}
