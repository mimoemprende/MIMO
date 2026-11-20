export type ReservationStatus = 'pendiente' | 'confirmada' | 'cancelada' | 'atendida';
export type OperationalStatus = 'Libre' | 'En curso' | 'Finalizado';
export type IntakeType = 'appointment' | 'walk_in';
export type MemberRole = 'admin' | 'operario';

export interface Business {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  timezone: string;
  created_at: string;
}

export interface Profile {
  id: string;
  auth_user_id: string;
  business_id: string;
  full_name: string;
  email: string | null;
  role: MemberRole;
  created_at: string;
}

export type DayKey = 'lun' | 'mar' | 'mie' | 'jue' | 'vie' | 'sab' | 'dom';
export interface DayHours { open: boolean; from: string; to: string }
export type OpeningHours = Partial<Record<DayKey, DayHours>>;

export interface BusinessSettings {
  id: string;
  business_id: string;
  opening_hours: OpeningHours;
  capacity: number | null;
  status_stages: string[];
  tracking_link_ttl_hours: number | null;
  updated_at: string;
}

export interface Service {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  price_cop: number | null;
  duration_minutes: number | null;
  active: boolean;
  created_at: string;
}

export interface Appointment {
  id: string;
  business_id: string;
  customer_name: string;
  customer_phone: string;
  vehicle_plate: string;
  vehicle_model: string | null;
  service_id: string | null;
  intake_type: IntakeType;
  scheduled_start: string;
  scheduled_end: string;
  status: ReservationStatus;
  operational_status: OperationalStatus;
  notes: string | null;
  status_updated_at: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceUpdate {
  id: string;
  appointment_id: string;
  status: OperationalStatus;
  message: string | null;
  updated_by: string | null;
  created_at: string;
}

export interface TrackingLink {
  id: string;
  appointment_id: string;
  token: string;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface Survey {
  id: string;
  appointment_id: string;
  business_id: string;
  service_id: string | null;
  service_rating: number;
  would_return: boolean;
  suggestion_or_complaint: string | null;
  created_at: string;
}

export interface Invitation {
  id: string;
  business_id: string;
  email: string;
  role: MemberRole;
  accepted_at: string | null;
  created_at: string;
}

export interface PublicTracking {
  business_name: string;
  service_name: string | null;
  plate_hint: string;
  vehicle_model: string | null;
  operational_status: OperationalStatus;
  status_updated_at: string;
  reservation_cancelled: boolean;
  survey_available: boolean;
  survey_submitted: boolean;
}
