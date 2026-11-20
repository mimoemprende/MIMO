import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Send } from 'lucide-react';
import { Alert, Button, Field, Input, Textarea } from '../../components/ui';
import { ConfigNotice } from '../../components/ConfigNotice';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { friendlyError } from '../../lib/errors';

const empty = { full_name: '', business_name: '', city: '', contact: '', message: '', consent: false };

export default function ContactForm() {
  const [f, setF] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const validate = () => {
    const e: Record<string, string> = {};
    if (f.full_name.trim().length < 2) e.full_name = 'Escriba su nombre.';
    if (f.business_name.trim().length < 2) e.business_name = 'Escriba el nombre del autolavado.';
    if (f.city.trim().length < 2) e.city = 'Escriba la ciudad.';
    const c = f.contact.trim();
    if (!(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c) || /^[0-9+() -]{7,20}$/.test(c))) e.contact = 'Escriba un correo o teléfono válido.';
    if (f.message.length > 1000) e.message = 'Máximo 1000 caracteres.';
    if (!f.consent) e.consent = 'Debe aceptar ser contactado para enviar la solicitud.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    if (!supabase) { setStatus('error'); setMsg('El envío no está disponible porque el backend no está configurado. Su solicitud NO fue enviada.'); return; }
    setStatus('sending');
    const { error } = await supabase.from('demo_requests').insert({
      full_name: f.full_name.trim(), business_name: f.business_name.trim(), city: f.city.trim(),
      contact: f.contact.trim(), message: f.message.trim() || null, consent: true,
    });
    if (error) { setStatus('error'); setMsg(`No se pudo enviar: ${friendlyError(error)}`); return; }
    setStatus('ok'); setF(empty);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4 rounded-3xl bg-white p-6 shadow-2xl">
      <h3 className="font-display text-xl font-bold">Solicitar demostración</h3>
      {!isSupabaseConfigured && <ConfigNotice what="El envío del formulario" />}
      {status === 'ok' && <Alert kind="success">¡Gracias! Recibimos su solicitud. El equipo de MIMO le contactará.</Alert>}
      {status === 'error' && <Alert>{msg}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" required error={errors.full_name}>{(id) => <Input id={id} autoComplete="name" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />}</Field>
        <Field label="Autolavado" required error={errors.business_name}>{(id) => <Input id={id} value={f.business_name} onChange={(e) => setF({ ...f, business_name: e.target.value })} />}</Field>
        <Field label="Ciudad" required error={errors.city}>{(id) => <Input id={id} autoComplete="address-level2" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />}</Field>
        <Field label="Teléfono o correo" required error={errors.contact}>{(id) => <Input id={id} value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} />}</Field>
      </div>
      <Field label="Mensaje" error={errors.message}>{(id) => <Textarea id={id} rows={3} maxLength={1000} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />}</Field>
      <div>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-mimo-blue focus:ring-mimo-blue" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} />
          <span>Acepto que el equipo de MIMO use estos datos únicamente para contactarme sobre esta solicitud. <Link to="/privacidad" className="font-medium text-mimo-blue underline">Ver privacidad</Link>.</span>
        </label>
        {errors.consent && <p className="mt-1 text-xs font-medium text-rose-700" role="alert">{errors.consent}</p>}
      </div>
      <Button type="submit" size="lg" className="w-full" loading={status === 'sending'} icon={<Send className="h-4 w-4" />}>Enviar solicitud</Button>
    </form>
  );
}
