import { forwardRef, useEffect, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, X, FlaskConical } from 'lucide-react';
import type { OperationalStatus, ReservationStatus } from '../lib/types';
import { operationalMeta, reservationMeta } from '../lib/status';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
const variants: Record<Variant, string> = {
  primary: 'bg-mimo-blue text-white hover:bg-mimo-blue-dark focus-visible:ring-mimo-blue',
  secondary: 'bg-white text-mimo-blue ring-1 ring-inset ring-mimo-blue-100 hover:bg-mimo-blue-50 focus-visible:ring-mimo-blue',
  ghost: 'text-mimo-ink hover:bg-slate-100 focus-visible:ring-slate-400',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-600',
  accent: 'bg-mimo-yellow text-mimo-ink hover:brightness-95 focus-visible:ring-mimo-orange',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, className = '', children, disabled, type = 'button', ...rest },
  ref,
) {
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3 text-base' };
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

const fieldCls =
  'block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-mimo-ink placeholder:text-slate-400 focus:border-mimo-blue focus:outline-none focus:ring-2 focus:ring-mimo-blue/30 disabled:bg-slate-50';

interface FieldWrapProps { label: string; hint?: string; error?: string; required?: boolean; children: (id: string) => ReactNode }
export function Field({ label, hint, error, required, children }: FieldWrapProps) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-mimo-ink">
        {label} {required && <span className="text-rose-600" aria-hidden>*</span>}
      </label>
      {children(id)}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs font-medium text-rose-700" role="alert">{error}</p>}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className = '', ...p }, ref) {
  return <input ref={ref} className={`${fieldCls} ${className}`} {...p} />;
});
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className = '', ...p }, ref) {
  return <select ref={ref} className={`${fieldCls} ${className}`} {...p} />;
});
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className = '', ...p }, ref) {
  return <textarea ref={ref} className={`${fieldCls} ${className}`} {...p} />;
});

export function Alert({ kind = 'error', children, className = '' }: { kind?: 'error' | 'success' | 'info' | 'warning'; children: ReactNode; className?: string }) {
  const map = {
    error: { cls: 'bg-rose-50 text-rose-800 ring-rose-200', Icon: AlertTriangle },
    warning: { cls: 'bg-amber-50 text-amber-900 ring-amber-200', Icon: AlertTriangle },
    success: { cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200', Icon: CheckCircle2 },
    info: { cls: 'bg-mimo-blue-50 text-mimo-blue ring-mimo-blue-100', Icon: Info },
  }[kind];
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm ring-1 ring-inset ${map.cls} ${className}`}>
      <map.Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Spinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500" role="status">
      <Loader2 className="h-5 w-5 animate-spin text-mimo-blue" aria-hidden /> {label}
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center">
      {icon && <div className="mb-3 text-mimo-blue">{icon}</div>}
      <p className="font-semibold text-mimo-ink">{title}</p>
      {children && <div className="mt-1 max-w-md text-sm text-slate-500">{children}</div>}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white p-5 shadow-card ring-1 ring-slate-200/70 ${className}`}>{children}</div>;
}

export function OperationalBadge({ status, size = 'sm' }: { status: OperationalStatus; size?: 'sm' | 'lg' }) {
  const m = operationalMeta[status];
  const Icon = m.icon;
  const s = size === 'lg' ? 'px-4 py-2 text-base gap-2' : 'px-2 py-0.5 text-xs gap-1';
  return (
    <span className={`inline-flex items-center rounded-full font-semibold ring-1 ring-inset ${m.cls} ${s}`}>
      <Icon className={size === 'lg' ? 'h-5 w-5' : 'h-3.5 w-3.5'} aria-hidden /> {m.label}
    </span>
  );
}

export function ReservationBadge({ status }: { status: ReservationStatus }) {
  const m = reservationMeta[status];
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${m.cls}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden /> {m.label}
    </span>
  );
}

export function DemoBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-mimo-orange/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#8a4b00] ring-1 ring-inset ring-mimo-orange/40 ${className}`}>
      <FlaskConical className="h-3.5 w-3.5" aria-hidden /> DEMO — datos ficticios
    </span>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-mimo-ink/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <h2 className="font-display text-lg font-bold text-mimo-ink">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-mimo-blue" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold text-mimo-ink sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
