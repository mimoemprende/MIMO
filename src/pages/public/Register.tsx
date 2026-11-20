import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, MailCheck } from 'lucide-react';
import { AuthShell } from './AuthShell';
import { Alert, Button, Field, Input } from '../../components/ui';
import { ConfigNotice } from '../../components/ConfigNotice';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { friendlyError } from '../../lib/errors';
import { useAuth } from '../../hooks/useAuth';
import { absoluteAppUrl } from '../../lib/paths';

export const PENDING_ONBOARDING_KEY = 'mimo.pendingOnboarding';

export default function Register() {
  const nav = useNavigate();
  const { refresh } = useAuth();
  const [f, setF] = useState({ full_name: '', business_name: '', email: '', password: '', password2: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    const v: Record<string, string> = {};
    if (f.full_name.trim().length < 2) v.full_name = 'Escriba su nombre.';
    if (f.business_name.trim().length < 2) v.business_name = 'Escriba el nombre del autolavado (o "Invitado" si fue invitado a uno existente).';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) v.email = 'Correo no válido.';
    if (f.password.length < 8) v.password = 'Mínimo 8 caracteres.';
    if (f.password !== f.password2) v.password2 = 'Las contraseñas no coinciden.';
    setErrors(v); setError(null);
    if (Object.keys(v).length) return;

    setLoading(true);
    // Guardamos los datos del negocio para completar el registro tras confirmar el correo.
    localStorage.setItem(PENDING_ONBOARDING_KEY, JSON.stringify({ full_name: f.full_name.trim(), business_name: f.business_name.trim() }));
    const { data, error } = await supabase.auth.signUp({
      email: f.email.trim(), password: f.password,
      options: { emailRedirectTo: absoluteAppUrl('bienvenida'), data: { full_name: f.full_name.trim() } },
    });
    setLoading(false);
    if (error) return setError(friendlyError(error));
    if (data.session) { await refresh(); nav('/bienvenida', { replace: true }); }
    else setCheckEmail(true);
  };

  if (checkEmail) {
    return (
      <AuthShell title="Revise su correo">
        <div className="space-y-4 text-center">
          <MailCheck className="mx-auto h-12 w-12 text-mimo-blue" />
          <p className="text-sm text-slate-600">Enviamos un enlace de confirmación a <b>{f.email}</b>. Ábralo para activar su cuenta; luego inicie sesión y terminaremos de crear su autolavado.</p>
          <Link to="/login" className="inline-block rounded-xl bg-mimo-blue px-5 py-2.5 font-semibold text-white">Ir a iniciar sesión</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Registre su autolavado" subtitle="Cree su cuenta de administrador. Cada autolavado tiene su propio espacio privado.">
      {!isSupabaseConfigured ? <ConfigNotice what="El registro" /> : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label="Su nombre" required error={errors.full_name}>{(id) => <Input id={id} autoComplete="name" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />}</Field>
          <Field label="Nombre del autolavado" required error={errors.business_name} hint="Si un administrador le invitó a su autolavado, se le ofrecerá unirse después.">{(id) => <Input id={id} value={f.business_name} onChange={(e) => setF({ ...f, business_name: e.target.value })} />}</Field>
          <Field label="Correo electrónico" required error={errors.email}>{(id) => <Input id={id} type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />}</Field>
          <Field label="Contraseña" required error={errors.password} hint="Mínimo 8 caracteres.">{(id) => <Input id={id} type="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />}</Field>
          <Field label="Repita la contraseña" required error={errors.password2}>{(id) => <Input id={id} type="password" autoComplete="new-password" value={f.password2} onChange={(e) => setF({ ...f, password2: e.target.value })} />}</Field>
          {error && <Alert>{error}</Alert>}
          <Button type="submit" size="lg" className="w-full" loading={loading} icon={<UserPlus className="h-4 w-4" />}>Crear cuenta</Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-slate-600">¿Ya tiene cuenta? <Link to="/login" className="font-semibold text-mimo-blue hover:underline">Inicie sesión</Link></p>
    </AuthShell>
  );
}
