import { ServerCrash } from 'lucide-react';
import { Alert } from './ui';

/** Aviso honesto cuando el backend no está configurado: nada se simula como real. */
export function ConfigNotice({ what = 'Esta función' }: { what?: string }) {
  return (
    <Alert kind="warning">
      <div className="flex items-start gap-2">
        <ServerCrash className="hidden h-4 w-4 shrink-0" aria-hidden />
        <span><b>{what} no está disponible:</b> el backend (Supabase) aún no está configurado en este despliegue. Defina <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> (vea README).</span>
      </div>
    </Alert>
  );
}
