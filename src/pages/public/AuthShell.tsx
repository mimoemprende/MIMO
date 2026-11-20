import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '../../components/Logo';

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-mimo-blue-50 to-white">
      <div className="mx-auto w-full max-w-md px-4 pt-6"><Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-mimo-blue hover:underline"><ArrowLeft className="h-4 w-4" />Volver al sitio</Link></div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8">
        <div className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-200 sm:p-8">
          <Logo className="mx-auto h-12 w-auto" />
          <h1 className="mt-6 text-center font-display text-2xl font-bold">{title}</h1>
          {subtitle && <p className="mt-1 text-center text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-6 text-center font-display text-xs font-bold tracking-[0.3em] text-mimo-blue">LAVA · CUIDA · REGRESA</p>
      </div>
    </div>
  );
}
