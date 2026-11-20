import { CalendarClock, CheckCircle2, CircleDashed, Loader, Ban, BadgeCheck, Clock, type LucideIcon } from 'lucide-react';
import type { OperationalStatus, ReservationStatus } from './types';

/** Estados operativos: exactamente los confirmados por el equipo. */
export const OPERATIONAL_STATUSES: OperationalStatus[] = ['Libre', 'En curso', 'Finalizado'];
export const RESERVATION_STATUSES: ReservationStatus[] = ['pendiente', 'confirmada', 'cancelada', 'atendida'];

export const operationalMeta: Record<OperationalStatus, { label: string; icon: LucideIcon; cls: string }> = {
  Libre: { label: 'Libre', icon: CircleDashed, cls: 'bg-slate-100 text-slate-700 ring-slate-300' },
  'En curso': { label: 'En curso', icon: Loader, cls: 'bg-mimo-cyan-50 text-mimo-blue ring-mimo-cyan' },
  Finalizado: { label: 'Finalizado', icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-800 ring-emerald-300' },
};

export const reservationMeta: Record<ReservationStatus, { label: string; icon: LucideIcon; cls: string }> = {
  pendiente: { label: 'Pendiente', icon: Clock, cls: 'bg-amber-50 text-amber-800 ring-amber-300' },
  confirmada: { label: 'Confirmada', icon: CalendarClock, cls: 'bg-mimo-blue-50 text-mimo-blue ring-mimo-blue-100' },
  cancelada: { label: 'Cancelada', icon: Ban, cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
  atendida: { label: 'Atendida', icon: BadgeCheck, cls: 'bg-emerald-50 text-emerald-800 ring-emerald-300' },
};

export const RATING_LABELS: Record<number, string> = {
  1: 'Muy malo',
  2: 'Malo',
  3: 'Regular',
  4: 'Bueno',
  5: 'Excelente',
};
