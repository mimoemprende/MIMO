import { Star, ThumbsDown, ThumbsUp } from 'lucide-react';
import { RATING_LABELS } from '../lib/status';

export function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex gap-1" role="radiogroup" aria-label="Calificación de 1 a 5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} - ${RATING_LABELS[n]}`} onClick={() => onChange(n)}
            className="rounded-lg p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-mimo-blue">
            <Star className={`h-9 w-9 ${n <= value ? 'fill-mimo-yellow text-mimo-orange' : 'text-slate-300'}`} />
          </button>
        ))}
      </div>
      <p className="mt-1 h-5 text-sm font-medium text-slate-600">{value ? RATING_LABELS[value] : ''}</p>
    </div>
  );
}

export function YesNo({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  const base = 'flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold ring-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-mimo-blue';
  return (
    <div className="flex gap-2" role="radiogroup" aria-label="¿Volvería a ir?">
      <button type="button" role="radio" aria-checked={value === true} onClick={() => onChange(true)}
        className={`${base} ${value === true ? 'bg-mimo-blue text-white ring-mimo-blue' : 'bg-white ring-slate-200 hover:bg-mimo-blue-50'}`}><ThumbsUp className="h-4 w-4" /> Sí</button>
      <button type="button" role="radio" aria-checked={value === false} onClick={() => onChange(false)}
        className={`${base} ${value === false ? 'bg-mimo-blue text-white ring-mimo-blue' : 'bg-white ring-slate-200 hover:bg-mimo-blue-50'}`}><ThumbsDown className="h-4 w-4" /> No</button>
    </div>
  );
}
