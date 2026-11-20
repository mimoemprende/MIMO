import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Building2, Users } from 'lucide-react';
import { AuthShell } from '../public/AuthShell';
import { Alert, Button, Field, Input, Spinner } from '../../components/ui';
import { ConfigNotice } from '../../components/ConfigNotice';
import { useAuth } from '../../hooks/useAuth';
import { requireSupabase, supabase } from '../../lib/supabase';
import { friendlyError } from '../../lib/errors';
import { PENDING_ONBOARDING_KEY } from '../public/Register';

interface Invite { invitation_id: string; business_name: string; role: 'admin' | 'operario' }

export default function Onboarding() {
  const nav = useNavigate();
  const { loading, session, profile, refresh, signOut } = useAuth();
  const pending = (() => { try { return JSON.parse(localStorage.getItem(PENDING_ONBOARDING_KEY) ?? 'null') as { full_name: string; business_name: string } | null; } catch { return null; } })();
  const [f, setF] = useState({
    full_name: pending?.full_name ?? (session?.user.user_metadata?.full_name as string | undefined) ?? '',
    business_name: pending?.business_name ?? '', address: '', phone: '',
  });
  const [invite, setInvite] = useState<Invite | null>(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || !session || profile) { setChecking(false); return; }
    supabase.rpc('my_pending_invitation').then(({ data }) => {
      const row = (data as Invite[] | null)?.[0];
      if (row) setInvite(row);
      setChecking(false);
    });
  }, [session, profile]);

  if (!supabase) return <AuthShell title="Bienvenida"><ConfigNotice /></AuthShell>;
  if (loading || checking) return <Spinner />;
  if (!session) return <Navigate to="/login" replace />;
  if (profile) return <Navigate to="/app" replace />;

  const done = async () => { localStorage.removeItem(PENDING_ONBOARDING_KEY); await refresh(); nav('/app', { replace: true }); };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (f.full_name.trim().length < 2 || f.business_name.trim().length < 2) return setError('Escriba su nombre y el nombre del autolavado.');
    setBusy(true); setError(null);
    const { error } = await requireSupabase().rpc('create_business', { p_business_name: f.business_name, p_full_name: f.full_name, p_address: f.address || null, p_phone: f.phone || null });
    setBusy(false);
    if (error) return setError(friendlyError(error));
    await done();
  };

  const accept = async () => {
    if (f.full_name.trim().length < 2) return setError('Escriba su nombre.');
    setBusy(true); setError(null);
    const { error } = await requireSupabase().rpc('accept_invitation', { p_full_name: f.full_name });
    setBusy(false);
    if (error) return setError(friendlyError(error));
    await done();
  };

  return (
    <AuthShell title="Terminemos de configurar" subtitle={session.user.email ?? undefined}>
      {invite && (
        <div className="mb-6 space-y-3 rounded-2xl bg-mimo-cyan-50 p-4">
          <div className="flex items-center gap-2 font-semibold text-mimo-blue"><Users className="h-5 w-5" />Tiene una invitación</div>
          <p className="text-sm">El autolavado <b>{invite.business_name}</b> le autorizó como <b>{invite.role === 'admin' ? 'administrador' : 'operario'}</b>.</p>
          <Field label="Su nombre" required>{(id) => <Input id={id} value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />}</Field>
          <Button className="w-full" loading={busy} onClick={accept}>Unirme a {invite.business_name}</Button>
          <p className="text-center text-xs text-slate-500">o cree un autolavado nuevo abajo</p>
        </div>
      )}
      <form onSubmit={create} className="space-y-4">
        <div className="flex items-center gap-2 font-semibold"><Building2 className="h-5 w-5 text-mimo-blue" />Crear mi autolavado</div>
        {!invite && <Field label="Su nombre" required>{(id) => <Input id={id} value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />}</Field>}
        <Field label="Nombre del autolavado" required>{(id) => <Input id={id} value={f.business_name} onChange={(e) => setF({ ...f, business_name: e.target.value })} />}</Field>
        <Field label="Dirección">{(id) => <Input id={id} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />}</Field>
        <Field label="Teléfono">{(id) => <Input id={id} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />}</Field>
        {error && <Alert>{error}</Alert>}
        <Button type="submit" size="lg" className="w-full" variant={invite ? 'secondary' : 'primary'} loading={busy}>Crear autolavado</Button>
      </form>
      <button onClick={() => void signOut()} className="mt-4 block w-full text-center text-sm text-slate-500 hover:underline">Cerrar sesión</button>
    </AuthShell>
  );
}
