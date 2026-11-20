import { describe, expect, it } from 'vitest';
import { addDays, bogotaToISO, dateKeyBogota, formatCOP, formatDate, normalizePlate, startOfWeek, timeBogota } from '../lib/format';
import { demoMaxConcurrent, type DemoAppointment } from '../demos/demoData';
import { outsideHoursWarning } from '../lib/hours';
import { friendlyError } from '../lib/errors';

describe('fechas en America/Bogota', () => {
  it('convierte hora local de Bogotá a UTC (UTC-5)', () => {
    expect(bogotaToISO('2026-11-19', '08:30')).toBe('2026-11-19T13:30:00.000Z');
  });
  it('formatea DD/MM/AAAA y HH:MM en Bogotá aunque el instante sea otro día en UTC', () => {
    const iso = '2026-11-20T03:15:00.000Z'; // 19/11 22:15 en Bogotá
    expect(formatDate(iso)).toBe('19/11/2026');
    expect(timeBogota(iso)).toBe('22:15');
    expect(dateKeyBogota(iso)).toBe('2026-11-19');
  });
  it('suma días y calcula el lunes de la semana', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(startOfWeek('2026-11-19')).toBe('2026-11-16');
  });
  it('rechaza fechas inválidas', () => {
    expect(() => bogotaToISO('19/11/2026', '8:00')).toThrow('FECHA_INVALIDA');
  });
});

describe('moneda y placas', () => {
  it('COP sin decimales', () => { expect(formatCOP(25000).replace(/\s/g, ' ')).toMatch(/\$ ?25\.000/); });
  it('normaliza placa', () => { expect(normalizePlate(' abc 12d ')).toBe('ABC12D'); });
});

describe('capacidad (lógica de la demo, igual a la del SQL)', () => {
  const base = { customer: 'x', plate: 'x', service: 'x', status: 'confirmada', op: 'Libre', walkIn: false } as const;
  const list: DemoAppointment[] = [
    { ...base, id: 'a', date: '2030-01-01', time: '09:00', duration: 60 },
    { ...base, id: 'b', date: '2030-01-01', time: '10:00', duration: 30 },
    { ...base, id: 'c', date: '2030-01-01', time: '09:30', duration: 60 },
    { ...base, id: 'd', date: '2030-01-01', time: '09:00', duration: 60, status: 'cancelada' },
  ];
  it('cuenta la máxima ocupación simultánea dentro de la franja', () => {
    expect(demoMaxConcurrent(list, '2030-01-01', '09:50', 20)).toBe(2);
    expect(demoMaxConcurrent(list, '2030-01-01', '10:30', 30)).toBe(0);
    expect(demoMaxConcurrent(list, '2030-01-01', '10:15', 30)).toBe(2);
    expect(demoMaxConcurrent(list, '2030-01-01', '11:00', 30)).toBe(0);
  });
});

describe('horario y errores', () => {
  it('avisa fuera de horario', () => {
    const h = { jue: { open: true, from: '08:00', to: '18:00' } };
    expect(outsideHoursWarning(h, bogotaToISO('2026-11-19', '07:00'), bogotaToISO('2026-11-19', '08:00'))).toMatch(/fuera del horario/);
    expect(outsideHoursWarning(h, bogotaToISO('2026-11-19', '09:00'), bogotaToISO('2026-11-19', '10:00'))).toBeNull();
  });
  it('traduce errores de la base de datos', () => {
    expect(friendlyError({ message: 'CAPACIDAD_EXCEDIDA: la capacidad configurada es de 1' })).toBe('la capacidad configurada es de 1');
    expect(friendlyError({ message: 'Invalid login credentials' })).toBe('Correo o contraseña incorrectos.');
  });
});
