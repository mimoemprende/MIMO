import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { AuthShell } from './AuthShell';
import { Alert, Button, Field, Input, Spinner } from '../../components/ui';
import { ConfigNotice } from '../../components/ConfigNotice';
import { supabase } from '../../lib/supabase';
import { friendlyError } from '../../lib/errors';
import { useAuth } from '../../hooks/useAuth';

/** Destino del enlace "restablecer contraseña" enviado por correo (Supabase Auth). */
export default function ResetPassword() {
  const nav = useNavigate();
  const { session, loading, refresh } = useAuth();
  const [linkError] = useState<string | null>(() => {
    const h = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const q = new URLSearchParams(window.location.search);
    const desc = h.get('error_description') ?? q.get('error_description');
    return desc ? desc.replace(/\+/g, ' ') : null;
  });
  const [waited, setWaited] = useState(false);
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  // Damos un instante a supabase-js para leer el token del enlace.
  useEffect(() => { const t = setTimeout(() => setWaited(true), 1500); return () => clearTimeout(t); }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    if (p1.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (p1 !== p2) return setError('Las contraseñas no coinciden.');
    setSaving(true); setError(null);
    const { error } = await supabase.auth.updateUser({ password: p1 });
    setSaving(false);
    if (error) return setError(friendlyError(error));
    setDone(true);
    await refresh();
  };

  if (!supabase) return <AuthShell title="Restablecer contraseña"><ConfigNotice what="El restablecimiento de contraseña" /></AuthShell>;

  return (
    <AuthShell title="Restablecer contraseña" subtitle={session?.user.email}>
      {done ? (
        <div className="space-y-4 text-center">
          <Alert kind="success">Su contraseña fue actualizada.</Alert>
          <Button className="w-full" onClick={() => nav('/app', { replace: true })}>Ir al panel</Button>
        </div>
      ) : linkError ? (
        <div className="space-y-4">
          <Alert>El enlace no es válido o ya venció ({linkError}). Solicite uno nuevo.</Alert>
          <Link to="/login" className="block text-center font-semibold text-mimo-blue hover:underline">Volver a iniciar sesión</Link>
        </div>
      ) : loading || (!session && !waited) ? <Spinner label="Verificando enlace…" /> : !session ? (
        <div className="space-y-4">
          <Alert>No encontramos un enlace de recuperación válido. Abra el enlace más reciente que recibió por correo o solicite uno nuevo desde “¿Olvidó su contraseña?”.</Alert>
          <Link to="/login" className="block text-center font-semibold text-mimo-blue hover:underline">Volver a iniciar sesión</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label="Nueva contraseña" required hint="Mínimo 8 caracteres.">{(id) => <Input id={id} type="password" autoComplete="new-password" value={p1} onChange={(e) => setP1(e.target.value)} />}</Field>
          <Field label="Repita la nueva contraseña" required>{(id) => <Input id={id} type="password" autoComplete="new-password" value={p2} onChange={(e) => setP2(e.target.value)} />}</Field>
          {error && <Alert>{error}</Alert>}
          <Button type="submit" size="lg" className="w-full" loading={saving} icon={<KeyRound className="h-4 w-4" />}>Guardar nueva contraseña</Button>
        </form>
      )}
    </AuthShell>
  );
}
