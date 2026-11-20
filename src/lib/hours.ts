import type { DayKey, OpeningHours } from './types';
import { TZ } from './format';

export const DAYS: { key: DayKey; label: string }[] = [
  { key: 'lun', label: 'Lunes' }, { key: 'mar', label: 'Martes' }, { key: 'mie', label: 'Miércoles' },
  { key: 'jue', label: 'Jueves' }, { key: 'vie', label: 'Viernes' }, { key: 'sab', label: 'Sábado' }, { key: 'dom', label: 'Domingo' },
];

const map: Record<string, DayKey> = { Mon: 'lun', Tue: 'mar', Wed: 'mie', Thu: 'jue', Fri: 'vie', Sat: 'sab', Sun: 'dom' };

/**
 * Devuelve un aviso si el horario cae fuera del horario de atención configurado.
 * Solo AVISA (no bloquea): la regla de bloqueo no está definida por el equipo.
 */
export function outsideHoursWarning(hours: OpeningHours, startISO: string, endISO: string): string | null {
  if (!hours || Object.keys(hours).length === 0) return null;
  const s = new Date(startISO);
  const dow = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(s);
  const key = map[dow];
  const d = hours[key];
  if (!d) return null;
  if (!d.open) return 'Atención: ese día el autolavado figura como cerrado en su horario de atención.';
  const hm = (iso: string) => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
  const a = hm(startISO), b = hm(endISO);
  if (a < d.from || b > d.to || b < a) return `Atención: el horario queda fuera del horario de atención configurado (${d.from}–${d.to}).`;
  return null;
}
