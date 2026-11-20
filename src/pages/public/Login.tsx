import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { AuthShell } from './AuthShell';
import { Alert, Button, Field, Input } from '../../components/ui';
import { ConfigNotice } from '../../components/ConfigNotice';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { friendlyError } from '../../lib/errors';
import { useAuth } from '../../hooks/useAuth';
import { absoluteAppUrl } from '../../lib/paths';

export default function Login() {
  const nav = useNavigate();
  const loc = useLocation();
  const { session, profile, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const from = (loc.state as { from?: string } | null)?.from ?? '/app';

  useEffect(() => {
    if (!authLoading && session) nav(profile ? from : '/bienvenida', { replace: true });
  }, [authLoading, session, profile, nav, from]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setError(null); setInfo(null);
    if (!email.includes('@') || password.length < 1) return setError('Escriba su correo y contraseña.');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) setError(friendlyError(error));
  };

  const reset = async () => {
    if (!supabase) return;
    if (!email.includes('@')) return setError('Escriba su correo para enviarle el enlace de recuperación.');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: absoluteAppUrl('restablecer') });
    if (error) setError(friendlyError(error)); else setInfo('Si el correo existe, recibirá un enlace para restablecer la contraseña.');
  };

  return (
    <AuthShell title="Iniciar sesión" subtitle="Acceso para administradores de autolavados">
      {!isSupabaseConfigured ? <ConfigNotice what="El inicio de sesión" /> : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label="Correo electrónico" required>{(id) => <Input id={id} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
          <Field label="Contraseña" required>{(id) => <Input id={id} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
          {error && <Alert>{error}</Alert>}
          {info && <Alert kind="success">{info}</Alert>}
          <Button type="submit" size="lg" className="w-full" loading={loading} icon={<LogIn className="h-4 w-4" />}>Entrar</Button>
          <button type="button" onClick={reset} className="block w-full text-center text-sm text-mimo-blue hover:underline">¿Olvidó su contraseña?</button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-slate-600">¿Aún no tiene cuenta? <Link to="/registro" className="font-semibold text-mimo-blue hover:underline">Registre su autolavado</Link></p>
    </AuthShell>
  );
}
