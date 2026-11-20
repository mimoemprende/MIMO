import { useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X, LogIn } from 'lucide-react';
import { Logo, LogoSlogan } from './Logo';

const links = [
  { hash: '#inicio', label: 'Inicio' },
  { hash: '#funcionalidades', label: 'Funcionalidades' },
  { hash: '#como-funciona', label: 'Cómo funciona' },
  { hash: '#demo', label: 'Demo' },
  { hash: '#precios', label: 'Precios' },
  { hash: '#preguntas', label: 'Preguntas' },
  { hash: '#contacto', label: 'Contacto' },
];

export function PublicLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">Saltar al contenido</a>
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" aria-label="MIMO inicio"><Logo className="h-9 w-auto sm:h-10" /></Link>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Principal">
            {links.map((l) => <Link key={l.hash} to={{ pathname: '/', hash: l.hash }} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-mimo-blue-50 hover:text-mimo-blue">{l.label}</Link>)}
          </nav>
          <div className="hidden items-center gap-2 lg:flex">
            <NavLink to="/login" className="inline-flex items-center gap-1.5 rounded-xl bg-mimo-blue px-4 py-2 text-sm font-semibold text-white hover:bg-mimo-blue-dark"><LogIn className="h-4 w-4" />Iniciar sesión</NavLink>
          </div>
          <button className="rounded-lg p-2 lg:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Abrir menú">{open ? <X /> : <Menu />}</button>
        </div>
        {open && (
          <nav className="border-t border-slate-100 bg-white px-4 pb-4 lg:hidden" aria-label="Principal móvil">
            {links.map((l) => <Link key={l.hash} to={{ pathname: '/', hash: l.hash }} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 font-medium text-slate-700 hover:bg-mimo-blue-50">{l.label}</Link>)}
            <Link to="/login" onClick={() => setOpen(false)} className="mt-2 block rounded-xl bg-mimo-blue px-4 py-3 text-center font-semibold text-white">Iniciar sesión</Link>
          </nav>
        )}
      </header>
      <main id="contenido" className="flex-1">{children}</main>
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[auto_1fr_auto] md:items-center">
          <div className="w-fit rounded-2xl bg-[#FDFDFD] p-2 ring-1 ring-slate-200"><LogoSlogan className="h-28 w-auto" /></div>
          <p className="text-sm text-slate-600 md:px-8">MIMO es una herramienta para administrar autolavados: agenda, seguimiento del estado del servicio y encuestas de satisfacción. No es un directorio ni un marketplace.</p>
          <div className="flex flex-col gap-2 text-sm">
            <Link to="/login" className="font-medium text-mimo-blue hover:underline">Acceso para autolavados</Link>
            <Link to="/registro" className="font-medium text-mimo-blue hover:underline">Registrar mi autolavado</Link>
            <Link to="/privacidad" className="font-medium text-mimo-blue hover:underline">Privacidad y datos</Link>
          </div>
        </div>
        <div className="border-t border-slate-200 py-4 text-center text-xs text-slate-500">© {new Date().getFullYear()} MIMO · LAVA · CUIDA · REGRESA</div>
      </footer>
    </div>
  );
}
