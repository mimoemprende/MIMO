import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { isSupabaseConfigured } from '../../lib/supabase';
import { Alert, Spinner } from '../../components/ui';
import { ConfigNotice } from '../../components/ConfigNotice';
import { AuthShell } from '../public/AuthShell';

export function RequireMember({ children }: { children: ReactNode }) {
  const { loading, session, profile, business, settings, error } = useAuth();
  const loc = useLocation();
  if (!isSupabaseConfigured) return <AuthShell title="Panel administrativo"><ConfigNotice what="El panel administrativo" /></AuthShell>;
  if (loading) return <div className="min-h-screen"><Spinner label="Cargando su autolavado…" /></div>;
  if (!session) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (error) return <AuthShell title="No se pudo cargar"><Alert>{error}</Alert></AuthShell>;
  if (!profile) return <Navigate to="/bienvenida" replace />;
  if (!business || !settings) return <div className="min-h-screen"><Spinner label="Cargando su autolavado…" /></div>;
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-mimo-orange" />
        <h1 className="mt-3 font-display text-xl font-bold">Solo para administradores</h1>
        <p className="mt-1 text-sm text-slate-600">Su usuario es de tipo operario. Pida al administrador del autolavado que realice esta acción.</p>
      </div>
    );
  }
  return <>{children}</>;
}
