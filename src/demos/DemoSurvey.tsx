import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { DemoShell } from './DemoShell';
import { Alert, Button, Field, Textarea } from '../components/ui';
import { StarRating, YesNo } from '../components/SurveyInputs';

interface DemoAnswer { rating: number; back: boolean; text: string }

export default function DemoSurvey() {
  const [rating, setRating] = useState(0);
  const [back, setBack] = useState<boolean | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<DemoAnswer[]>([]);
  const [done, setDone] = useState(false);

  const reset = () => { setRating(0); setBack(null); setText(''); setError(null); setSent([]); setDone(false); };
  const submit = () => {
    if (!rating) return setError('Seleccione una calificación.');
    if (back === null) return setError('Indique si volvería.');
    setSent((s) => [...s, { rating, back, text }]);
    setDone(true); setError(null);
  };
  const avg = sent.length ? (sent.reduce((a, b) => a + b.rating, 0) / sent.length).toFixed(1) : '—';

  return (
    <DemoShell title="Encuesta de satisfacción" description="Responda la encuesta como lo haría un cliente al finalizar el servicio." onReset={reset}>
      <div className="grid gap-6 md:grid-cols-[1fr_240px]">
        {done ? (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-emerald-50 p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
            <p className="mt-3 font-display text-xl font-bold">¡Gracias por su opinión!</p>
            <p className="text-sm text-slate-600">Respuesta de prueba registrada solo en esta demostración.</p>
            <Button className="mt-4" variant="secondary" onClick={() => { setDone(false); setRating(0); setBack(null); setText(''); }}>Enviar otra respuesta de prueba</Button>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <div><p className="mb-2 text-sm font-medium">¿Qué le pareció el servicio? *</p><StarRating value={rating} onChange={setRating} /></div>
            <div><p className="mb-2 text-sm font-medium">¿Volvería a ir? *</p><YesNo value={back} onChange={setBack} /></div>
            <Field label="Sugerencia o queja (opcional)">{(id) => <Textarea id={id} rows={3} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Escriba un comentario de prueba" />}</Field>
            {error && <Alert>{error}</Alert>}
            <Button type="submit" className="w-full sm:w-auto">Enviar respuesta de prueba</Button>
          </form>
        )}
        <div className="rounded-2xl bg-mimo-blue-50 p-4 text-sm">
          <div className="text-xs font-semibold uppercase text-mimo-blue">Vista del administrador (demo)</div>
          <div className="mt-2 flex justify-between"><span>Respuestas</span><b>{sent.length}</b></div>
          <div className="flex justify-between"><span>Promedio</span><b>{avg}</b></div>
          <div className="flex justify-between"><span>Volverían</span><b>{sent.filter((s) => s.back).length}</b></div>
          <ul className="mt-3 space-y-1 text-xs text-slate-600">{sent.filter((s) => s.text).slice(-3).map((s, i) => <li key={i} className="rounded bg-white p-2">“{s.text}”</li>)}</ul>
        </div>
      </div>
    </DemoShell>
  );
}
