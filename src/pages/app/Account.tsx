import { useState, type FormEvent } from 'react';
import { KeyRound, Save, UserCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { requireSupabase } from '../../lib/supabase';
import { friendlyError } from '../../lib/errors';
import { Alert, Button, Card, Field, Input, PageHeader } from '../../components/ui';

export default function Account() {
  const { profile, session, business, refresh } = useAuth();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [nameMsg, setNameMsg] = useState<{ k: 'success' | 'error'; t: string } | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [pwMsg, setPwMsg] = useState<{ k: 'success' | 'error'; t: string } | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return setNameMsg({ k: 'error', t: 'Escriba su nombre (mínimo 2 caracteres).' });
    setSavingName(true); setNameMsg(null);
    const { error } = await requireSupabase().from('profiles').update({ full_name: name.trim() }).eq('id', profile!.id);
    setSavingName(false);
    if (error) return setNameMsg({ k: 'error', t: friendlyError(error) });
    await refresh(); setNameMsg({ k: 'success', t: 'Nombre actualizado.' });
  };

  const savePw = async (e: FormEvent) => {
    e.preventDefault();
    if (p1.length < 8) return setPwMsg({ k: 'error', t: 'La contraseña debe tener al menos 8 caracteres.' });
    if (p1 !== p2) return setPwMsg({ k: 'error', t: 'Las contraseñas no coinciden.' });
    setSavingPw(true); setPwMsg(null);
    const { error } = await requireSupabase().auth.updateUser({ password: p1 });
    setSavingPw(false);
    if (error) return setPwMsg({ k: 'error', t: friendlyError(error) });
    setP1(''); setP2(''); setPwMsg({ k: 'success', t: 'Contraseña actualizada. Úsela en su próximo inicio de sesión.' });
  };

  return (
    <div>
      <PageHeader title="Mi cuenta" subtitle={`${session?.user.email ?? ''} · ${business?.name ?? ''} · ${profile?.role === 'admin' ? 'Administrador' : 'Operario'}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="flex items-center gap-2 font-display text-lg font-bold"><UserCircle className="h-5 w-5 text-mimo-blue" />Datos personales</h2>
          <form onSubmit={saveName} className="mt-4 space-y-4">
            <Field label="Nombre" required>{(id) => <Input id={id} value={name} onChange={(e) => { setName(e.target.value); setNameMsg(null); }} />}</Field>
            <Field label="Correo" hint="El correo de acceso no se puede cambiar desde aquí.">{(id) => <Input id={id} value={session?.user.email ?? ''} disabled />}</Field>
            {nameMsg && <Alert kind={nameMsg.k}>{nameMsg.t}</Alert>}
            <Button type="submit" loading={savingName} icon={<Save className="h-4 w-4" />}>Guardar nombre</Button>
          </form>
        </Card>
        <Card>
          <h2 className="flex items-center gap-2 font-display text-lg font-bold"><KeyRound className="h-5 w-5 text-mimo-blue" />Cambiar contraseña</h2>
          <form onSubmit={savePw} className="mt-4 space-y-4" noValidate>
            <Field label="Nueva contraseña" required hint="Mínimo 8 caracteres.">{(id) => <Input id={id} type="password" autoComplete="new-password" value={p1} onChange={(e) => { setP1(e.target.value); setPwMsg(null); }} />}</Field>
            <Field label="Repita la nueva contraseña" required>{(id) => <Input id={id} type="password" autoComplete="new-password" value={p2} onChange={(e) => { setP2(e.target.value); setPwMsg(null); }} />}</Field>
            {pwMsg && <Alert kind={pwMsg.k}>{pwMsg.t}</Alert>}
            <Button type="submit" loading={savingPw} icon={<KeyRound className="h-4 w-4" />}>Actualizar contraseña</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
