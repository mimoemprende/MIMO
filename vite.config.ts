import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * VITE_BASE_PATH: ruta base del despliegue.
 *   "/"        → dominio propio, Vercel, Netlify (por defecto)
 *   "/mimo/"   → GitHub Pages de proyecto (https://usuario.github.io/mimo/)
 */
function normalizeBase(b?: string): string {
  if (!b || b.trim() === '') return '/';
  let v = b.trim();
  if (!v.startsWith('/')) v = `/${v}`;
  if (!v.endsWith('/')) v = `${v}/`;
  return v;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = normalizeBase(env.VITE_BASE_PATH);
  const siteUrl = (env.VITE_PUBLIC_SITE_URL?.trim() || '').replace(/\/?$/, '/');

  const htmlVars: Plugin = {
    name: 'mimo-html-vars',
    transformIndexHtml: (html) => html.replaceAll('__BASE__', base).replaceAll('__SITE_URL__', siteUrl === '/' ? base : siteUrl),
  };

  return {
    base,
    plugins: [react(), htmlVars],
    server: { port: 5173, host: true },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            supabase: ['@supabase/supabase-js'],
            ui: ['lucide-react', 'qrcode'],
          },
        },
      },
    },
  };
});
