import { useState } from 'react';
import { ChevronRight, Car, Smartphone, PartyPopper } from 'lucide-react';
import { DemoShell } from './DemoShell';
import { Button, OperationalBadge } from '../components/ui';
import { OPERATIONAL_STATUSES } from '../lib/status';
import type { OperationalStatus } from '../lib/types';
import { timeBogota } from '../lib/format';
import { Logo } from '../components/Logo';

export default function DemoTracking() {
  const [status, setStatus] = useState<OperationalStatus>('Libre');
  const [updatedAt, setUpdatedAt] = useState(() => new Date());
  const idx = OPERATIONAL_STATUSES.indexOf(status);

  const set = (s: OperationalStatus) => { setStatus(s); setUpdatedAt(new Date()); };
  const next = () => set(OPERATIONAL_STATUSES[Math.min(idx + 1, OPERATIONAL_STATUSES.length - 1)]);
  const reset = () => set('Libre');

  return (
    <DemoShell title="Seguimiento del vehículo" description="Cambie el estado como lo haría el personal y vea cómo se actualiza la pantalla del cliente." onReset={reset}>
      <div className="grid items-start gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-2xl p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase text-slate-500">Panel del autolavado (ejemplo)</div>
            <div className="mt-2 flex items-center gap-3"><Car className="h-8 w-8 text-mimo-blue" /><div><div className="font-semibold">Placa DEMO99 · Vehículo de ejemplo</div><div className="text-xs text-slate-500">Lavado completo (ejemplo)</div></div></div>
            <fieldset className="mt-4">
              <legend className="mb-2 text-sm font-medium">Estado operativo</legend>
              <div className="grid grid-cols-3 gap-2">
                {OPERATIONAL_STATUSES.map((s) => (
                  <button key={s} onClick={() => set(s)} aria-pressed={status === s}
                    className={`rounded-xl px-2 py-2 text-sm font-semibold ring-1 transition ${status === s ? 'bg-mimo-blue text-white ring-mimo-blue' : 'bg-white ring-slate-200 hover:bg-mimo-blue-50'}`}>{s}</button>
                ))}
              </div>
            </fieldset>
            <Button className="mt-3 w-full" variant="secondary" onClick={next} disabled={idx === OPERATIONAL_STATUSES.length - 1} icon={<ChevronRight className="h-4 w-4" />}>Simular siguiente estado</Button>
          </div>
          <p className="text-xs text-slate-500">El seguimiento muestra el estado que actualiza el personal. No es GPS, ubicación del vehículo ni vídeo en vivo.</p>
        </div>

        <div className="mx-auto w-full max-w-[290px]">
          <div className="mb-2 flex items-center justify-center gap-1 text-xs font-semibold text-slate-500"><Smartphone className="h-4 w-4" /> Pantalla del cliente (QR)</div>
          <div className="rounded-[2.2rem] border-[10px] border-mimo-ink bg-white p-4 shadow-xl">
            <Logo className="mx-auto h-7 w-auto" />
            <p className="mt-3 text-center text-xs text-slate-500">Autolavado de ejemplo</p>
            <p className="text-center text-sm font-semibold">Vehículo •••O99</p>
            <div className="my-5 flex justify-center"><OperationalBadge status={status} size="lg" /></div>
            <ol className="mb-4 flex items-center justify-between gap-1" aria-label="Progreso">
              {OPERATIONAL_STATUSES.map((s, i) => (
                <li key={s} className="flex flex-1 flex-col items-center gap-1">
                  <span className={`h-2 w-full rounded-full ${i <= idx ? 'bg-mimo-cyan' : 'bg-slate-200'}`} />
                  <span className={`text-[10px] ${i === idx ? 'font-bold text-mimo-blue' : 'text-slate-400'}`}>{s}</span>
                </li>
              ))}
            </ol>
            {status === 'Finalizado' && (
              <div className="rounded-xl bg-emerald-50 p-3 text-center text-xs text-emerald-800"><PartyPopper className="mx-auto mb-1 h-5 w-5" />¡Su vehículo está listo! Ya puede responder la encuesta.</div>
            )}
            <p className="mt-3 text-center text-[11px] text-slate-500">Última actualización: {timeBogota(updatedAt)}</p>
          </div>
        </div>
      </div>
    </DemoShell>
  );
}
