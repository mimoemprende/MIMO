import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, ArrowRight } from 'lucide-react';
import { Button, DemoBadge } from '../components/ui';

export function DemoShell({ title, description, onReset, children }: { title: string; description: string; onReset: () => void; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-3xl border-2 border-dashed border-mimo-orange/50 bg-white shadow-card">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <DemoBadge />
          <h3 className="mt-2 font-display text-lg font-bold text-mimo-ink">{title}</h3>
          <p className="text-sm text-slate-600">{description}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={onReset} icon={<RotateCcw className="h-4 w-4" />}>Reiniciar demostración</Button>
      </div>
      <div className="p-4 sm:p-6">{children}</div>
      <div className="flex flex-col gap-2 border-t border-slate-100 bg-mimo-blue-50/60 px-5 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="text-slate-600">Esto es una demostración. La versión real guarda sus datos de forma segura.</span>
        <Link to="/registro" className="inline-flex items-center gap-1 font-semibold text-mimo-blue hover:underline">Crear mi cuenta real <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </div>
  );
}
