/**
 * Rutas conscientes de la ruta base del despliegue (VITE_BASE_PATH).
 * Ej.: GitHub Pages de proyecto → https://usuario.github.io/mimo/  (base "/mimo/").
 */
export const BASE = import.meta.env.BASE_URL; // siempre termina en "/"

/** Archivo de /public respetando la base: asset('assets/logo-mimo.png'). */
export function asset(path: string): string {
  return `${BASE}${path.replace(/^\//, '')}`;
}

/** URL absoluta de una ruta de la app (para redirecciones de Supabase Auth y enlaces QR). */
export function absoluteAppUrl(route: string): string {
  return `${window.location.origin}${BASE}${route.replace(/^\//, '')}`;
}
