import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Business, BusinessSettings, Profile } from '../lib/types';

interface AuthState {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  business: Business | null;
  settings: BusinessSettings | null;
  error: string | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadMembership = useCallback(async (s: Session | null) => {
    if (!supabase || !s) { setProfile(null); setBusiness(null); setSettings(null); return; }
    setError(null);
    const { data: p, error: pe } = await supabase.from('profiles').select('*').eq('auth_user_id', s.user.id).maybeSingle();
    if (pe) { setError(pe.message); return; }
    if (!p) { setProfile(null); setBusiness(null); setSettings(null); return; }
    const [{ data: b, error: be }, { data: st, error: se }] = await Promise.all([
      supabase.from('businesses').select('*').eq('id', p.business_id).single(),
      supabase.from('business_settings').select('*').eq('business_id', p.business_id).single(),
    ]);
    if (be || se) { setError((be ?? se)!.message); return; }
    // Se asignan juntos para que el panel nunca vea un perfil sin negocio.
    setBusiness(b as Business);
    setSettings(st as BusinessSettings);
    setProfile(p as Profile);
  }, []);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadMembership(data.session);
      if (active) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        // Diferido para no bloquear el callback de auth.
        setTimeout(() => { void loadMembership(s); }, 0);
      }
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [loadMembership]);

  const refresh = useCallback(async () => { await loadMembership(session); }, [loadMembership, session]);
  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setSession(null); setProfile(null); setBusiness(null); setSettings(null);
  }, []);

  return (
    <Ctx.Provider value={{ loading, session, profile, business, settings, error, refresh, signOut, isAdmin: profile?.role === 'admin' }}>
      {children}
    </Ctx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- el hook vive junto a su proveedor
export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth fuera de AuthProvider');
  return v;
}
