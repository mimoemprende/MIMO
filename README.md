# MIMO · Plataforma web para administrar autolavados (MVP)

**LAVA · CUIDA · REGRESA**

MIMO tiene dos zonas:

- **Sitio público comercial** (`/`): presentación, módulos, cómo funciona, beneficios, preguntas frecuentes, formulario de solicitud de demostración y **3 demostraciones interactivas** (agenda, seguimiento QR y encuesta), marcadas como *DEMO — datos ficticios*, que no tocan la base de datos.
- **Aplicación administrativa multiempresa** (`/app`): cada autolavado se registra y administra **solo** sus usuarios, servicios, vehículos, agenda, capacidad y encuestas. El aislamiento lo aplica la base de datos (Row Level Security de PostgreSQL), no la interfaz.
- **Seguimiento público del cliente** (`/s/<token>`): interfaz móvil sin cuenta que muestra solo el estado actual (Libre / En curso / Finalizado), la última actualización y, al finalizar, la encuesta.

**Tecnología:** React 18 + TypeScript + Vite 5 + Tailwind CSS 3 + Supabase (Auth + PostgreSQL + RLS). QR generado localmente con `qrcode`. Fuentes Inter y Plus Jakarta Sans incluidas en el proyecto (sin depender de Google Fonts).

> **Resumen para publicar:** 1) cree el proyecto Supabase y ejecute el SQL · 2) suba este repositorio a GitHub · 3) configure 2 variables · 4) GitHub Actions compila y publica. Vea la sección **8. Publicar en Internet desde GitHub**.

---

## 1. Requisitos

- Node.js 18 o superior (probado con Node 22) y npm.
- Una cuenta gratuita en [Supabase](https://supabase.com).

## 2. Instalación rápida (unos 10 minutos)

### 2.1 Crear el proyecto en Supabase
1. En supabase.com → **New project**. Elija la región más cercana (por ejemplo, São Paulo).
2. Vaya a **SQL Editor → New query**, pegue el contenido completo de `supabase/migrations/20261119000000_mimo_schema.sql` y pulse **Run**. Debe terminar sin errores.
3. Vaya a **Authentication → URL Configuration**:
   - **Site URL:** `http://localhost:5173` (en producción, su dominio).
   - **Redirect URLs:** añada `http://localhost:5173/**` y, en producción, `https://su-dominio.com/**`.
4. **Authentication → Providers → Email:** deje **Confirm email** ACTIVADO en producción (esto protege las invitaciones: nadie puede reclamar un correo que no es suyo). Para una demostración local rápida puede desactivarlo temporalmente.
5. **Authentication → Email Templates** (opcional, recomendado): pegue las plantillas en español de `supabase/templates/` en *Confirm signup* y *Reset Password*.

### 2.2 Configurar variables de entorno
```bash
cp .env.example .env.local
```
Complete `.env.local` con **Project Settings → API**:
- `VITE_SUPABASE_URL` → *Project URL*
- `VITE_SUPABASE_ANON_KEY` → *anon public key* (es pública por diseño; la seguridad la dan las políticas RLS)
- `VITE_PUBLIC_SITE_URL` → URL con la que el cliente abrirá el QR (en local `http://localhost:5173`)
- `VITE_BASE_PATH` → `/` (solo cambia para GitHub Pages de proyecto; el workflow lo calcula solo)

> **Nunca** coloque la `service_role key` en el frontend ni en el repositorio. Este proyecto no la necesita.

### 2.3 Ejecutar
```bash
npm install
npm run dev
```
Abra http://localhost:5173

> Si no configura Supabase, el sitio público y las demos funcionan igual. El inicio de sesión, el panel, el seguimiento y el formulario de contacto muestran un aviso claro de “backend no configurado” y **no simulan** envíos exitosos.

## 3. Crear el primer administrador
1. Abra `/registro` y complete su nombre, el nombre del autolavado, el correo y la contraseña (mínimo 8 caracteres).
2. Si *Confirm email* está activo, abra el enlace del correo y luego inicie sesión en `/login`.
3. En `/bienvenida` confirme los datos y pulse **Crear autolavado**. Usted queda como **administrador** de ese autolavado.
4. Vaya a **Configuración → Capacidad y horario** y defina la **capacidad** (vehículos simultáneos). Mientras no exista capacidad, el sistema **no permite registrar vehículos**.
5. En **Configuración → Servicios**, cree su catálogo (nombre, precio COP y duración).
6. **Usuarios adicionales:** en **Configuración → Usuarios**, cree una invitación con el correo y el rol (*Operario* o *Administrador*). La persona se registra en `/registro` con ese correo y en `/bienvenida` verá la opción **Unirme a <autolavado>**. El correo de invitación **no se envía automáticamente**: avísele usted.

Para un segundo autolavado, otra persona se registra normalmente: obtiene un espacio independiente.

## 4. Uso diario
- **Agenda** (`/app/agenda`): vista Día o Semana (en móvil, lista cronológica). Filtros por estado de reserva y estado operativo, y búsqueda por nombre, teléfono o placa en todas las fechas.
  - **Nueva reserva:** fecha, hora y duración estimada (se prellena con la duración del servicio). Se valida la capacidad de esa franja.
  - **Llegada sin cita:** se registra con la hora actual y se valida la capacidad de ese momento.
  - Al guardar, se genera automáticamente el **QR y el enlace** del servicio.
- **Detalle del servicio:** cambie el estado operativo (Libre / En curso / Finalizado), edite o reprograme, cambie el estado de la reserva (pendiente / confirmada / cancelada / atendida), copie el enlace, descargue el QR, genere uno nuevo (el anterior deja de funcionar) o revóquelo.
- **Cliente:** escanea el QR, ve el estado y la última actualización. La página se actualiza sola cada 15 segundos. Al pasar a “Finalizado”, responde la encuesta una sola vez.
- **Encuestas** (`/app/encuestas`, solo administradores): promedio, cantidad, distribución, “volverían”, comentarios y filtros por periodo y servicio.

## 5. Estructura
```
mimo/
├─ .github/workflows/
│  ├─ ci.yml                 Lint + tipos + pruebas + build + pruebas SQL (Postgres 16) en cada push/PR
│  ├─ deploy-pages.yml       Compila y publica en GitHub Pages al hacer push a main
│  └─ supabase-migrate.yml   (manual) aplica supabase/migrations a su proyecto Supabase
├─ public/assets/            logo-mimo.png (principal) y logo-mimo-eslogan.png (con eslogan): ORIGINALES
├─ src/
│  ├─ demos/                 Demos públicas (estado local, datos ficticios por diseño del documento maestro)
│  ├─ components/            UI reutilizable, formulario de reservas, layout público
│  ├─ hooks/                 useAuth (sesión + negocio), useLoader
│  ├─ lib/                   supabase, api, rutas con base, fecha/COP (America/Bogota), estados, errores
│  ├─ pages/public/          Landing, contacto, login, registro, restablecer contraseña, privacidad, /s/:token
│  └─ pages/app/             Panel, Agenda, Detalle, Encuestas, Configuración, Mi cuenta, Bienvenida
├─ supabase/
│  ├─ migrations/            Esquema completo: tablas, índices, RLS, funciones, triggers, permisos
│  ├─ templates/             Plantillas de correo en español (confirmación y recuperación)
│  └─ tests/                 Pruebas SQL automatizadas
├─ tests/                    E2E en navegador (Playwright) + backend local opcional (local-stack/)
├─ vercel.json · netlify.toml · public/_redirects   Publicación alternativa
└─ .env.example              Variables necesarias (sin secretos)
```
**Para reemplazar los logos**, sustituya los archivos de `public/assets/` conservando sus nombres.

## 6. Seguridad (resumen)
- **RLS activado en todas las tablas.** Las políticas usan `is_member(business_id)` e `is_admin(business_id)`, calculadas desde `profiles` con el usuario autenticado (`auth.uid()`).
- Se crean **sin políticas de INSERT directo**: `businesses`, `profiles`, `tracking_links`, `service_updates` y `surveys`. Solo se escriben mediante funciones `SECURITY DEFINER` que validan permisos.
- La **capacidad** se valida en un trigger de la base de datos, con un bloqueo por negocio para evitar condiciones de carrera. El trigger verifica la pertenencia antes de evaluar la capacidad, para no revelar datos de otro negocio en los mensajes.
- **Enlaces públicos:** token aleatorio de 256 bits, revocable y con vencimiento configurable. El rol anónimo **no lee ninguna tabla**: solo ejecuta `get_public_tracking(token)` (datos mínimos, placa parcial `•••123`) y `submit_survey(token, …)`.
- **Operario:** lee la agenda y cambia el estado operativo. No crea, edita ni borra reservas, ni lee encuestas o configuración (bloqueado en RLS).
- **Formulario de contacto:** el rol anónimo solo inserta, y solo con consentimiento. El equipo MIMO lee las solicitudes en Supabase → Table editor → `demo_requests`.
- Las contraseñas las gestiona Supabase Auth. No hay secretos en el repositorio: la clave *anon/publishable* es pública por diseño.

## 7. Pruebas
| Prueba | Comando | Qué valida |
|---|---|---|
| Todo lo de CI | `npm run check` | ESLint (0 avisos), TypeScript estricto, pruebas unitarias, build de producción |
| SQL | `PGHOST=… PGUSER=postgres PGPASSWORD=… npm run test:sql` | Aislamiento RLS entre 2 negocios, capacidad, tokens, encuesta única, operario, contacto |
| E2E navegador | `BASE_URL=http://localhost:5173 npm run test:e2e` | 28 flujos completos de la interfaz (requiere confirmación automática de correo) |
| E2E correo | `BASE_URL=… MAIL_DIR=… python3 tests/e2e_email_flows.py` | Confirmación de registro y recuperación de contraseña por correo |

`tests/local-stack/setup.sh` levanta en Linux un backend compatible con Supabase (Postgres + Supabase Auth + PostgREST) para correr las pruebas E2E sin tocar su proyecto real.

## 8. Publicar en Internet desde GitHub

### 8.1 Subir el repositorio
El proyecto ya trae un repositorio git inicializado con un primer commit en `main`.
```bash
cd mimo
git remote add origin https://github.com/<usuario>/<repo>.git
git push -u origin main
```
(O cree el repositorio vacío en github.com → *New repository*, sin README, y use los comandos que GitHub le muestra.)

### 8.2 Opción A — GitHub Pages (todo dentro de GitHub, gratis)
1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. **Settings → Secrets and variables → Actions → pestaña *Variables* → New repository variable:**
   - `VITE_SUPABASE_URL` = su Project URL
   - `VITE_SUPABASE_ANON_KEY` = su clave pública *anon* (o *publishable*)
   - *(opcional)* `CUSTOM_DOMAIN` = su dominio, p. ej. `app.mimo.com.co`
3. **Actions → "Publicar en GitHub Pages" → Run workflow** (o haga cualquier push a `main`). Al terminar, la URL aparece en el resumen del workflow: `https://<usuario>.github.io/<repo>/`.
4. En **Supabase → Authentication → URL Configuration:** Site URL = esa URL. Añada `https://<usuario>.github.io/<repo>/**` en Redirect URLs.

El workflow calcula la ruta base (`/<repo>/`), crea `404.html` para que funcionen las rutas internas al recargar (`/app/...`, `/s/<token>`) y falla con un mensaje claro si faltan las variables de Supabase.

### 8.3 Opción B — Vercel o Netlify (conectados a GitHub)
- **Vercel:** *Add New → Project* → importe el repositorio → framework **Vite** → *Environment Variables*: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PUBLIC_SITE_URL=https://<su-app>.vercel.app` → *Deploy*. `vercel.json` ya incluye la regla SPA y cabeceras de seguridad.
- **Netlify:** *Add new site → Import from Git* → el build se toma de `netlify.toml` → añada las mismas variables → *Deploy*. `public/_redirects` ya incluye la regla SPA.
- Luego actualice Site URL y Redirect URLs en Supabase con su dominio.

Cada push a `main` vuelve a publicar automáticamente. El workflow **CI** valida el código en cada push y en cada pull request.

### 8.4 Base de datos desde GitHub (opcional)
En lugar de pegar el SQL a mano, agregue el **secreto** `SUPABASE_DB_URL` (Supabase → Project Settings → Database → Connection string → URI, con su contraseña). Luego ejecute **Actions → "Aplicar migraciones a Supabase" → Run workflow**. Solo aplica migraciones nuevas. Esto se probó con `supabase db push` contra Postgres; el workflow no se ha ejecutado aún en GitHub.

### 8.5 Antes de abrir al público
- [ ] *Confirm email* activado y plantillas en español cargadas.
- [ ] SMTP propio configurado (Authentication → SMTP Settings): el correo integrado de Supabase tiene un límite muy bajo de envíos por hora.
- [ ] Site URL y Redirect URLs con el dominio final.
- [ ] Texto de `/privacidad` revisado por el equipo y asesoría legal.

---

## 9. Checklist final de funciones

### ✅ Funciona realmente y fue probado aquí
Se probó con la base de datos real (PostgreSQL 16 + Supabase Auth v2.169 + PostgREST v12, la misma pila de Supabase) y Chrome, sobre el **build de producción publicado bajo una subruta igual a la de GitHub Pages** (`/mimo/`). 28 + 5 flujos automáticos:

- **Sitio público:** todas las secciones y metadatos. Los enlaces del menú llevan a su sección, también desde otra página. Menú móvil. Pestañas de demos y preguntas frecuentes desplegables.
- **Demos:** agenda (día, filtros, búsqueda, abrir, crear, reprogramar, cancelar, conflicto de capacidad), seguimiento (3 estados, simular siguiente) y encuesta (validación, envío de prueba). Todas tienen reinicio y un botón “Crear mi cuenta real”.
- **Formulario de contacto:** validación, consentimiento obligatorio y guardado real en la base de datos. Sin backend, muestra error y no simula éxito.
- **Cuentas:** registro sin y **con confirmación de correo** (correo real recibido y enlace abierto), creación del autolavado, cierre de sesión, nuevo inicio de sesión con datos persistentes, **recuperación de contraseña por correo**, enlace usado o inválido con mensaje claro, cambio de nombre y de contraseña en *Mi cuenta*.
- **Configuración:** capacidad, horario de atención (con aviso fuera de horario), servicios (crear, editar, activar/desactivar, eliminar), invitar, anular invitación y retirar miembros.
- **Agenda:** reserva con cita, llegada sin cita, conflicto de capacidad (franja y momento actual), bloqueo sin capacidad configurada, vista día y semana, búsqueda, filtros, editar/reprogramar, cambio de estado de reserva, eliminar.
- **Seguimiento:** QR y enlace generados al registrar, copiar enlace, descargar QR, estado reflejado en el celular del cliente con **actualización automática a los 15 s**, sin datos privados, token inválido, revocado o regenerado.
- **Encuesta:** validación, una respuesta por servicio, visible en el panel del administrador con estadísticas.
- **Seguridad:** el autolavado B no ve nada del A (ni por URL directa). El operario no tiene encuestas, configuración ni edición. Pruebas SQL de RLS, tokens y permisos.
- **Calidad:** ESLint con 0 avisos, TypeScript estricto, 9 pruebas unitarias, instalación limpia con `npm ci` y build correcto.

### 🟡 Implementado, pero no verificado en este entorno
- Ejecución de los workflows en los servidores de GitHub (validados con `actionlint`; sus comandos se ejecutaron localmente).
- Despliegue real en Vercel o Netlify (la configuración está incluida).
- Safari/iOS y Firefox (probado en Chrome de escritorio y en modo móvil).

### 🔧 Necesita que usted configure servicios externos
1. **Supabase** (gratuito): crear el proyecto, ejecutar el SQL y copiar URL + clave pública. Sin esto, solo funcionan el sitio y las demos (la app lo avisa).
2. **GitHub:** subir el repositorio, activar Pages y crear 2 variables (o conectar Vercel/Netlify).
3. **SMTP propio** para producción: los correos de confirmación y recuperación dependen de él a partir de pocos usuarios.
4. **Dominio propio** (opcional).

### ⛔ Fuera de alcance según el documento maestro (fase 2)
No se simula ninguna de estas funciones: notificaciones automáticas por WhatsApp o correo al cliente, aviso por correo al equipo MIMO cuando llega una solicitud de demo (hoy se consulta en Supabase), pagos, carga de archivos para el logo del negocio (hoy se usa una URL), captcha o límite de envíos en el formulario público, exportación de reportes.

### ❓ Decisiones de negocio pendientes (documentadas, no inventadas)
1. **Regla exacta de capacidad.** Supuesto aplicado: la capacidad es el número de vehículos simultáneos. Cada registro ocupa capacidad desde su inicio hasta *inicio + duración estimada*, y la libera al pasar a Finalizado o cancelarse. Falta definir qué pasa con los vehículos que superan su hora estimada y con las reservas existentes si se reduce la capacidad.
2. **Llegadas sin cita:** hoy validan solo la capacidad del momento (§21.4). ¿Deben bloquearse si chocan con citas próximas?
3. **Significado de “Libre”:** hoy es el estado inicial de cada servicio.
4. **Vencimiento de los enlaces QR:** configurable; por defecto no vencen.
5. **Formato de “¿Qué le pareció el servicio?”:** escala de 1 a 5 con etiqueta.
6. **¿“Finalizado” debe marcar la reserva como “atendida”?** Hoy son estados independientes.
7. **Horario de atención:** solo avisa, no bloquea.
8. **Asignación de vehículos a operarios:** no definida.
9. **Retención de datos:** plazo no definido.
10. **Precios del plan MIMO:** no definidos.
11. **Demo de seguimiento:** el documento (§20.2) menciona 7 etapas, pero §21 prevalece: se usan 3.
