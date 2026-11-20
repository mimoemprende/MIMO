import { Link } from 'react-router-dom';
import { Footprints } from 'lucide-react';
import type { Appointment, Service } from '../lib/types';
import { OperationalBadge, ReservationBadge } from './ui';
import { minutesBetween, timeBogota, formatDate } from '../lib/format';

export function AppointmentRow({ a, services, showDate }: { a: Appointment; services: Map<string, Service>; showDate?: boolean }) {
  const svc = a.service_id ? services.get(a.service_id)?.name : null;
  return (
    <Link to={`/app/servicios/${a.id}`}
      className={`flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-200 transition hover:bg-mimo-blue-50 hover:ring-mimo-blue-100 ${a.status === 'cancelada' ? 'opacity-60' : ''}`}>
      <div className="w-16 shrink-0 text-center">
        {showDate && <div className="text-[11px] text-slate-500">{formatDate(a.scheduled_start)}</div>}
        <div className="font-display text-lg font-bold text-mimo-blue">{timeBogota(a.scheduled_start)}</div>
        <div className="text-[11px] text-slate-500">{minutesBetween(a.scheduled_start, a.scheduled_end)} min</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 truncate font-semibold">
          <span className="truncate">{a.customer_name}</span>
          {a.intake_type === 'walk_in' && <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-mimo-yellow/30 px-1.5 text-[10px] font-bold"><Footprints className="h-3 w-3" />SIN CITA</span>}
        </div>
        <div className="truncate text-xs text-slate-500">{a.vehicle_plate}{a.vehicle_model ? ` · ${a.vehicle_model}` : ''}{svc ? ` · ${svc}` : ''}</div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <ReservationBadge status={a.status} />
        <OperationalBadge status={a.operational_status} />
      </div>
    </Link>
  );
}
