// Proxy local que imita las rutas de Supabase: /auth/v1 → GoTrue, /rest/v1 → PostgREST
import http from 'node:http';
// [prefijo, puerto, quitarPrefijo]. GoTrue local genera enlaces de correo como /verify (Supabase real usa /auth/v1/verify).
const routes = [['/auth/v1', 9999, true], ['/rest/v1', 3000, true], ['/verify', 9999, false]];
http.createServer((req, res) => {
  const cors = { 'access-control-allow-origin': req.headers.origin || '*', 'access-control-allow-headers': req.headers['access-control-request-headers'] || '*', 'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS', 'access-control-expose-headers': 'content-range, x-total-count', 'access-control-allow-credentials': 'true' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  const r = routes.find(([p]) => req.url.startsWith(p));
  if (!r) { res.writeHead(404, cors); return res.end('not found'); }
  const path = r[2] ? (req.url.slice(r[0].length) || '/') : req.url;
  const headers = { ...req.headers, host: `127.0.0.1:${r[1]}` };
  // Igual que Kong en Supabase: si no hay Authorization, usar la apikey.
  if (!headers.authorization && headers.apikey) headers.authorization = `Bearer ${headers.apikey}`;
  const p = http.request({ host: '127.0.0.1', port: r[1], method: req.method, path, headers }, (pr) => {
    const h = { ...pr.headers, ...cors }; res.writeHead(pr.statusCode, h); pr.pipe(res);
  });
  p.on('error', (e) => { res.writeHead(502, cors); res.end(String(e)); });
  req.pipe(p);
}).listen(54321, '127.0.0.1', () => console.log('proxy on 54321'));
