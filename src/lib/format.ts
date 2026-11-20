/**
 * Utilidades de fecha/hora/moneda.
 * Zona horaria: America/Bogota (UTC-5 sin horario de verano). Formato: DD/MM/AAAA. Moneda: COP.
 */
export const TZ = 'America/Bogota';
const BOGOTA_OFFSET = '-05:00';

/** "2026-11-19" (fecha de hoy en Bogotá). */
export function todayBogota(now: Date = new Date()): string {
  return dateKeyBogota(now);
}

/** Convierte un instante a la clave de día AAAA-MM-DD en Bogotá. */
export function dateKeyBogota(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** "HH:MM" en Bogotá. */
export function timeBogota(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('es-CO', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}

/** Fecha+hora local de Bogotá (inputs del formulario) → ISO UTC. */
export function bogotaToISO(dateKey: string, time: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !/^\d{2}:\d{2}$/.test(time)) throw new Error('FECHA_INVALIDA');
  const d = new Date(`${dateKey}T${time}:00${BOGOTA_OFFSET}`);
  if (Number.isNaN(d.getTime())) throw new Error('FECHA_INVALIDA');
  return d.toISOString();
}

/** DD/MM/AAAA */
export function formatDate(d: Date | string): string {
  const [y, m, day] = dateKeyBogota(d).split('-');
  return `${day}/${m}/${y}`;
}

/** DD/MM/AAAA a partir de una clave AAAA-MM-DD. */
export function formatDateKey(key: string): string {
  const [y, m, d] = key.split('-');
  return `${d}/${m}/${y}`;
}

/** DD/MM/AAAA HH:MM */
export function formatDateTime(d: Date | string): string {
  return `${formatDate(d)} ${timeBogota(d)}`;
}

/** Nombre del día en español para una clave AAAA-MM-DD (p. ej. "jueves"). */
export function weekdayName(key: string): string {
  return new Intl.DateTimeFormat('es-CO', { timeZone: TZ, weekday: 'long' }).format(new Date(`${key}T12:00:00${BOGOTA_OFFSET}`));
}

/** Suma días a una clave AAAA-MM-DD. */
export function addDays(key: string, days: number): string {
  const d = new Date(`${key}T12:00:00${BOGOTA_OFFSET}`);
  d.setUTCDate(d.getUTCDate() + days);
  return dateKeyBogota(d);
}

/** Lunes de la semana de la clave dada. */
export function startOfWeek(key: string): string {
  const d = new Date(`${key}T12:00:00${BOGOTA_OFFSET}`);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = lunes
  return addDays(key, -dow);
}

/** Inicio y fin (ISO) de un día de Bogotá. */
export function dayRangeISO(key: string): { from: string; to: string } {
  return { from: bogotaToISO(key, '00:00'), to: bogotaToISO(addDays(key, 1), '00:00') };
}

const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
export function formatCOP(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return cop.format(value);
}

export function minutesBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
}

/** "hace 2 min" */
export function relativeFromNow(d: string, now: Date = new Date()): string {
  const diff = Math.max(0, Math.round((now.getTime() - new Date(d).getTime()) / 1000));
  if (diff < 60) return 'hace unos segundos';
  const m = Math.round(diff / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `el ${formatDateTime(d)}`;
}

/** Normaliza placa: mayúsculas y sin espacios. */
export function normalizePlate(p: string): string {
  return p.toUpperCase().replace(/\s+/g, '');
}
