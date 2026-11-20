// DATOS FICTICIOS para las demostraciones públicas. No se conectan a la base de datos.
import { addDays, todayBogota } from '../lib/format';
import type { OperationalStatus, ReservationStatus } from '../lib/types';

export interface DemoAppointment {
  id: string;
  customer: string;
  plate: string;
  service: string;
  date: string; // AAAA-MM-DD
  time: string; // HH:MM
  duration: number; // minutos (ficticio)
  status: ReservationStatus;
  op: OperationalStatus;
  walkIn: boolean;
}

export const DEMO_SERVICES = [
  { name: 'Lavado exterior (ejemplo)', duration: 30 },
  { name: 'Lavado completo (ejemplo)', duration: 60 },
  { name: 'Lavado de motor (ejemplo)', duration: 45 },
];

/** Capacidad ilustrativa SOLO para la demo. Cada autolavado real configura la suya. */
export const DEMO_CAPACITY = 2;

export function initialDemoAppointments(): DemoAppointment[] {
  const t = todayBogota();
  const t1 = addDays(t, 1);
  return [
    { id: 'd1', customer: 'Cliente Demo Uno', plate: 'DEMO01', service: DEMO_SERVICES[1].name, date: t, time: '08:00', duration: 60, status: 'atendida', op: 'Finalizado', walkIn: false },
    { id: 'd2', customer: 'Cliente Demo Dos', plate: 'DEMO02', service: DEMO_SERVICES[0].name, date: t, time: '09:30', duration: 30, status: 'confirmada', op: 'En curso', walkIn: false },
    { id: 'd3', customer: 'Cliente Demo Tres', plate: 'DEMO03', service: DEMO_SERVICES[2].name, date: t, time: '09:40', duration: 45, status: 'confirmada', op: 'Libre', walkIn: true },
    { id: 'd4', customer: 'Cliente Demo Cuatro', plate: 'DEMO04', service: DEMO_SERVICES[1].name, date: t, time: '11:00', duration: 60, status: 'pendiente', op: 'Libre', walkIn: false },
    { id: 'd5', customer: 'Cliente Demo Cinco', plate: 'DEMO05', service: DEMO_SERVICES[0].name, date: t, time: '15:00', duration: 30, status: 'cancelada', op: 'Libre', walkIn: false },
    { id: 'd6', customer: 'Cliente Demo Seis', plate: 'DEMO06', service: DEMO_SERVICES[1].name, date: t1, time: '10:00', duration: 60, status: 'pendiente', op: 'Libre', walkIn: false },
    { id: 'd7', customer: 'Cliente Demo Siete', plate: 'DEMO07', service: DEMO_SERVICES[0].name, date: t1, time: '14:30', duration: 30, status: 'confirmada', op: 'Libre', walkIn: false },
  ];
}

const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

/** Máxima ocupación simultánea en la franja (misma lógica que la base de datos real). */
export function demoMaxConcurrent(list: DemoAppointment[], date: string, time: string, duration: number, ignoreId?: string): number {
  const s = toMin(time), e = s + duration;
  const active = list.filter((a) => a.id !== ignoreId && a.date === date && a.status !== 'cancelada' && a.op !== 'Finalizado')
    .map((a) => ({ s: toMin(a.time), e: toMin(a.time) + a.duration }))
    .filter((a) => a.s < e && a.e > s);
  const points = [s, ...active.map((a) => a.s).filter((p) => p > s)];
  return Math.max(0, ...points.map((p) => active.filter((a) => a.s <= p && a.e > p).length));
}
