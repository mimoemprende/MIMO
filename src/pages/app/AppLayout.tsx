import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, MessageSquareHeart, Settings, LogOut, AlertTriangle, UserCircle, type LucideIcon } from 'lucide-react';
import { Logo } from '../../components/Logo';
import { useAuth } from '../../hooks/useAuth';

interface NavItem { to: string; label: string; icon: LucideIcon; end?: boolean; adminOnly?: boolean }
const items: NavItem[] = [
  { to: '/app', label: 'Panel', icon: LayoutDashboard, end: true },
  { to: '/app/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/app/encuestas', label: 'Encuestas', icon: MessageSquareHeart, adminOnly: true },
  { to: '/app/configuracion', label: 'Configuración', icon: Settings, adminOnly: true },
  { to: '/app/cuenta', label: 'Mi cuenta', icon: UserCircle },
];

export default function AppLayout() {
  const { business, profile, settings, signOut, isAdmin } = useAuth();
  const nav = useNavigate();
  const visible = items.filter((i) => !i.adminOnly || isAdmin);
  const logout = async () => { await signOut(); nav('/login', { replace: true }); };
  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-mimo-blue text-white' : 'text-slate-700 hover:bg-mimo-blue-50 hover:text-mimo-blue'}`;

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <Link to="/app" className="px-5 py-5"><Logo className="h-9 w-auto" /></Link>
        <div className="mx-4 rounded-xl bg-mimo-blue-50 px-3 py-2.5">
          <p className="truncate text-sm font-bold text-mimo-blue">{business?.name}</p>
          <p className="truncate text-xs text-slate-600">{profile?.full_name} · {profile?.role === 'admin' ? 'Administrador' : 'Operario'}</p>
        </div>
        <nav className="mt-4 flex-1 space-y-1 px-3" aria-label="Panel">
          {visible.map((i) => <NavLink key={i.to} to={i.to} end={i.end} className={linkCls}><i.icon className="h-5 w-5" />{i.label}</NavLink>)}
        </nav>
        <div className="p-3">
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"><LogOut className="h-5 w-5" />Cerrar sesión</button>
          <p className="mt-3 px-3 text-[10px] font-bold tracking-[0.25em] text-mimo-blue">LAVA · CUIDA · REGRESA</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <Link to="/app"><Logo className="h-8 w-auto" /></Link>
          <div className="flex items-center gap-2">
            <span className="max-w-[140px] truncate text-xs font-semibold text-mimo-blue">{business?.name}</span>
            <button onClick={logout} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Cerrar sesión"><LogOut className="h-5 w-5" /></button>
          </div>
        </header>
        {settings && settings.capacity === null && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
            <AlertTriangle className="mr-1 inline h-4 w-4" />Su autolavado aún no tiene <b>capacidad configurada</b>; no se pueden registrar vehículos.{' '}
            {isAdmin ? <Link to="/app/configuracion" className="font-semibold underline">Configurar ahora</Link> : 'Pida al administrador que la configure.'}
          </div>
        )}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 lg:px-8 lg:pb-10"><Outlet /></main>
        <nav className="fixed inset-x-0 bottom-0 z-30 grid border-t border-slate-200 bg-white lg:hidden" style={{ gridTemplateColumns: `repeat(${visible.length}, minmax(0, 1fr))` }} aria-label="Panel móvil">
          {visible.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${isActive ? 'text-mimo-blue' : 'text-slate-500'}`}>
              <i.icon className="h-5 w-5" />{i.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
