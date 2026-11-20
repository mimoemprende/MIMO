"""
Prueba end-to-end de MIMO contra un backend compatible con Supabase (local o real).
Requiere: pip install playwright && playwright install chromium (o CHROME_PATH), la app corriendo en BASE_URL
y un backend con confirmación de correo DESACTIVADA (autoconfirm) para crear cuentas de prueba.

Uso:  BASE_URL=http://localhost:5173 python tests/e2e_local.py
Crea cuentas ficticias *@mimo-e2e.test. Guarda capturas en tests/screenshots/.
"""
import os, re, time, uuid
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get("BASE_URL", "http://localhost:5173")
CHROME = os.environ.get("CHROME_PATH", "/usr/bin/google-chrome")
SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(exist_ok=True)
RUN = uuid.uuid4().hex[:6]
PWD = "ClaveSegura123"
results = []


def step(name):
    def deco(fn):
        def wrapper(*a, **k):
            t = time.time()
            fn(*a, **k)
            results.append(f"OK  {name} ({time.time()-t:.1f}s)")
            print(results[-1], flush=True)
        return wrapper
    return deco


def shot(page, name, full=True):
    page.screenshot(path=str(SHOTS / f"{name}.png"), full_page=full)


def register(page, name, business, email):
    page.goto(f"{BASE}/registro")
    page.get_by_label("Su nombre").fill(name)
    page.get_by_label("Nombre del autolavado").fill(business)
    page.get_by_label("Correo electrónico").fill(email)
    page.get_by_label("Contraseña *", exact=True).fill(PWD)
    page.get_by_label("Repita la contraseña").fill(PWD)
    page.get_by_role("button", name="Crear cuenta").click()
    page.wait_for_url(re.compile(r"/bienvenida"))


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME if Path(CHROME).exists() else None)
        ctx = browser.new_context(viewport={"width": 1366, "height": 900}, locale="es-CO", timezone_id="America/Bogota")
        page = ctx.new_page()
        console_errors = []
        page.on("pageerror", lambda e: console_errors.append(str(e)))

        @step("Sitio público: carga, secciones, metadatos")
        def landing():
            page.goto(f"{BASE}/")
            expect(page.get_by_role("heading", level=1)).to_contain_text("Administre su autolavado")
            for sec in ["funcionalidades", "como-funciona", "demo", "preguntas", "contacto"]:
                assert page.locator(f"#{sec}").count() == 1, sec
            assert page.locator('meta[name="description"]').count() == 1
            assert page.locator('meta[property="og:image"]').count() == 1
            # Los logos oficiales cargan
            for src in ["assets/logo-mimo.png", "assets/logo-mimo-eslogan.png"]:
                img = page.locator(f'img[src$="{src}"]').first
                assert img.evaluate("i => i.complete && i.naturalWidth > 0"), src
            shot(page, "01_landing_desktop")
        landing()

        @step("Demo agenda: DEMO visible, conflicto de capacidad, reserva y reinicio")
        def demo_agenda():
            page.goto(f"{BASE}/#demo")
            expect(page.get_by_text("DEMO — datos ficticios").first).to_be_visible()
            page.get_by_role("button", name="Nueva reserva").click()
            dlg = page.get_by_role("dialog")
            dlg.get_by_label("Nombre del cliente (ficticio)").fill("Prueba Demo")
            dlg.get_by_label("Placa (ejemplo)").fill("DEM999")
            dlg.get_by_label("Hora").fill("09:45")
            dlg.get_by_role("button", name="Guardar en la demo").click()
            expect(dlg.get_by_text("Conflicto de capacidad")).to_be_visible()
            dlg.get_by_label("Hora").fill("17:00")
            dlg.get_by_role("button", name="Guardar en la demo").click()
            expect(page.get_by_text("Prueba Demo")).to_be_visible()
            shot(page.locator("#demo"), "02_demo_agenda") if False else page.locator("#demo").screenshot(path=str(SHOTS / "02_demo_agenda.png"))
            page.get_by_role("button", name="Reiniciar demostración").click()
            expect(page.get_by_text("Prueba Demo")).to_have_count(0)
        demo_agenda()

        @step("Demo seguimiento: 3 estados, simular siguiente, reinicio")
        def demo_tracking():
            page.get_by_role("tab", name="Seguimiento QR").click()
            page.get_by_role("button", name="Simular siguiente estado").click()
            page.get_by_role("button", name="Simular siguiente estado").click()
            expect(page.get_by_text("¡Su vehículo está listo!")).to_be_visible()
            page.locator("#demo").screenshot(path=str(SHOTS / "03_demo_tracking.png"))
            page.get_by_role("button", name="Reiniciar demostración").click()
            expect(page.get_by_text("¡Su vehículo está listo!")).to_have_count(0)
        demo_tracking()

        @step("Demo encuesta: validación, envío de prueba y reinicio")
        def demo_survey():
            page.get_by_role("tab", name="Encuesta").click()
            page.get_by_role("button", name="Enviar respuesta de prueba").click()
            expect(page.get_by_text("Seleccione una calificación.")).to_be_visible()
            page.get_by_role("radio", name="5 - Excelente").click()
            page.get_by_role("radio", name="Sí").click()
            page.get_by_role("button", name="Enviar respuesta de prueba").click()
            expect(page.get_by_text("¡Gracias por su opinión!")).to_be_visible()
            page.locator("#demo").screenshot(path=str(SHOTS / "04_demo_survey.png"))
            page.get_by_role("button", name="Reiniciar demostración").click()
        demo_survey()

        @step("Formulario de contacto: validación y envío real a la base de datos")
        def contact():
            page.goto(f"{BASE}/#contacto")
            page.get_by_role("button", name="Enviar solicitud").click()
            expect(page.get_by_text("Debe aceptar ser contactado")).to_be_visible()
            form = page.locator("#contacto form")
            form.get_by_role("textbox", name="Nombre", exact=True).fill("Persona E2E")
            form.get_by_label("Autolavado").fill(f"Lavadero E2E {RUN}")
            form.get_by_label("Ciudad").fill("Medellín")
            form.get_by_label("Teléfono o correo").fill("e2e@mimo-e2e.test")
            form.get_by_role("checkbox").check()
            form.get_by_role("button", name="Enviar solicitud").click()
            expect(page.get_by_text("Recibimos su solicitud")).to_be_visible()
        contact()

        # ------------------ Negocio A ------------------
        emailA = f"admin.a.{RUN}@mimo-e2e.test"

        @step("Registro e onboarding del autolavado A")
        def reg_a():
            register(page, "Admin Uno", f"Autolavado A {RUN}", emailA)
            page.get_by_role("button", name="Crear autolavado").click()
            page.wait_for_url(re.compile(r"/app$"))
            expect(page.get_by_text("capacidad configurada")).to_be_visible()
            shot(page, "05_dashboard_vacio")
        reg_a()

        @step("Sin capacidad configurada: no permite registrar vehículos")
        def no_capacity():
            page.goto(f"{BASE}/app/agenda?nuevo=cita")
            dlg = page.get_by_role("dialog")
            dlg.get_by_label("Nombre del cliente").fill("Cliente Ficticio")
            dlg.get_by_label("Teléfono").fill("3001112233")
            dlg.get_by_label("Placa").fill("AAA111")
            dlg.get_by_label("Fecha").fill("2030-05-10")
            dlg.get_by_label("Hora").fill("10:00")
            dlg.get_by_label("Duración estimada (min)").fill("60")
            dlg.get_by_role("button", name="Crear reserva").click()
            expect(dlg.get_by_text("configure la capacidad")).to_be_visible()
            page.keyboard.press("Escape")
        no_capacity()

        @step("Configuración: capacidad=1, horario y servicio")
        def config():
            page.goto(f"{BASE}/app/configuracion")
            page.get_by_role("tab", name="Capacidad y horario").click()
            page.get_by_label("Vehículos que puede atender al mismo tiempo").fill("1")
            page.get_by_role("button", name="Guardar configuración").click()
            expect(page.get_by_text("Configuración guardada.")).to_be_visible()
            page.get_by_role("tab", name="Servicios").click()
            page.get_by_role("button", name="Nuevo servicio").click()
            dlg = page.get_by_role("dialog")
            dlg.get_by_label("Nombre").fill("Lavado general")
            dlg.get_by_label("Precio (COP)").fill("25000")
            dlg.get_by_label("Duración (min)").fill("45")
            dlg.get_by_role("button", name="Guardar servicio").click()
            expect(page.get_by_role("cell", name="Lavado general", exact=True)).to_be_visible()
            expect(page.get_by_role("cell", name=re.compile(r"^\$\s?25\.000$"))).to_be_visible()
            shot(page, "06_config_servicios")
        config()

        @step("Crear reserva → QR generado; reserva superpuesta → conflicto de capacidad")
        def reservations():
            page.goto(f"{BASE}/app/agenda?nuevo=cita")
            dlg = page.get_by_role("dialog")
            dlg.get_by_label("Nombre del cliente").fill("Cliente Ficticio Uno")
            dlg.get_by_label("Teléfono").fill("3001112233")
            dlg.get_by_label("Placa").fill("abc 123")
            dlg.get_by_label("Servicio").select_option(label="Lavado general · 45 min")
            assert dlg.get_by_label("Duración estimada (min)").input_value() == "45"
            dlg.get_by_label("Fecha").fill("2030-05-10")
            dlg.get_by_label("Hora").fill("10:00")
            dlg.get_by_role("button", name="Crear reserva").click()
            page.wait_for_url(re.compile(r"/app/servicios/"))
            expect(page.get_by_role("heading", name="ABC123")).to_be_visible()
            expect(page.get_by_role("img", name=re.compile("Código QR"))).to_be_visible()
            shot(page, "07_detalle_qr")
            page.goto(f"{BASE}/app/agenda?nuevo=cita")
            dlg = page.get_by_role("dialog")
            dlg.get_by_label("Nombre del cliente").fill("Cliente Ficticio Dos")
            dlg.get_by_label("Teléfono").fill("3004445566")
            dlg.get_by_label("Placa").fill("DEF456")
            dlg.get_by_label("Fecha").fill("2030-05-10")
            dlg.get_by_label("Hora").fill("10:30")
            dlg.get_by_label("Duración estimada (min)").fill("30")
            dlg.get_by_role("button", name="Crear reserva").click()
            expect(dlg.get_by_text(re.compile("capacidad configurada es de 1"))).to_be_visible()
            dlg.screenshot(path=str(SHOTS / "08_conflicto_capacidad.png"))
            dlg.get_by_label("Hora").fill("11:00")
            dlg.get_by_role("button", name="Crear reserva").click()
            page.wait_for_url(re.compile(r"/app/servicios/"))
        reservations()

        @step("Llegada sin cita (walk-in) y conflicto si la capacidad actual está llena")
        def walkin():
            page.goto(f"{BASE}/app/agenda?nuevo=sin-cita")
            dlg = page.get_by_role("dialog")
            dlg.get_by_label("Nombre del cliente").fill("Cliente Sin Cita")
            dlg.get_by_label("Teléfono").fill("3007778899")
            dlg.get_by_label("Placa").fill("WLK001")
            dlg.get_by_label("Duración estimada (min)").fill("40")
            dlg.get_by_role("button", name="Registrar llegada").click()
            page.wait_for_url(re.compile(r"/app/servicios/"))
            expect(page.get_by_text("Sin cita").first).to_be_visible()
            page.goto(f"{BASE}/app/agenda?nuevo=sin-cita")
            dlg = page.get_by_role("dialog")
            dlg.get_by_label("Nombre del cliente").fill("Otro Sin Cita")
            dlg.get_by_label("Teléfono").fill("3007778800")
            dlg.get_by_label("Placa").fill("WLK002")
            dlg.get_by_label("Duración estimada (min)").fill("40")
            dlg.get_by_role("button", name="Registrar llegada").click()
            expect(dlg.get_by_text(re.compile("capacidad configurada"))).to_be_visible()
            page.keyboard.press("Escape")
        walkin()

        @step("Agenda: vista día/semana, búsqueda por placa y filtros")
        def agenda_views():
            page.goto(f"{BASE}/app/agenda?fecha=2030-05-10")
            expect(page.get_by_text("Cliente Ficticio Uno")).to_be_visible()
            page.get_by_role("button", name="Semana").click()
            expect(page.get_by_text("ABC123").first).to_be_visible()
            page.get_by_label("Buscar por nombre, teléfono o placa").fill("def4")
            expect(page.get_by_text("Resultados de búsqueda")).to_be_visible()
            expect(page.get_by_text("Cliente Ficticio Dos")).to_be_visible()
            expect(page.get_by_text("Cliente Ficticio Uno")).to_have_count(0)
            page.get_by_label("Buscar por nombre, teléfono o placa").fill("")
            page.get_by_role("button", name="Día").click()
            page.get_by_label("Estado operativo").select_option("Finalizado")
            expect(page.get_by_text("No hay registros para este día")).to_be_visible()
            page.get_by_label("Estado operativo").select_option("")
            shot(page, "09_agenda")
        agenda_views()

        public_url = {}

        @step("Cambio de estado operativo reflejado en el enlace público (sin cuenta)")
        def tracking():
            page.goto(f"{BASE}/app/agenda?fecha=2030-05-10")
            page.get_by_text("Cliente Ficticio Uno").click()
            page.wait_for_url(re.compile(r"/app/servicios/"))
            url = page.locator("div.break-all").inner_text().strip()
            assert re.search(r"/s/[a-f0-9]{64}$", url), url
            public_url["v"] = url
            anon = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, locale="es-CO", timezone_id="America/Bogota")
            cp = anon.new_page()
            cp.goto(url)
            expect(cp.get_by_text("Estado actual")).to_be_visible()
            expect(cp.get_by_text("•••123")).to_be_visible()
            body = cp.content()
            assert "3001112233" not in body and "Cliente Ficticio Uno" not in body, "Datos privados expuestos"
            page.get_by_role("button", name="En curso").click()
            expect(page.get_by_text("Estado actualizado a “En curso”")).to_be_visible()
            cp.get_by_role("button", name="Actualizar ahora").click()
            expect(cp.locator("section").get_by_text("En curso").first).to_be_visible()
            cp.screenshot(path=str(SHOTS / "10_cliente_en_curso_movil.png"), full_page=True)
            page.get_by_role("button", name="Finalizado").click()
            expect(page.get_by_text("Estado actualizado a “Finalizado”")).to_be_visible()
            # Espera la actualización automática (cada 15 s)
            expect(cp.get_by_text("¡Su vehículo está listo!")).to_be_visible(timeout=20000)
            public_url["ctx"] = anon
            public_url["page"] = cp
        tracking()

        @step("Encuesta: una respuesta por servicio, guardada y visible al admin")
        def survey():
            cp = public_url["page"]
            cp.get_by_role("button", name="Enviar opinión").click()
            expect(cp.get_by_text("Seleccione qué le pareció el servicio.")).to_be_visible()
            cp.get_by_role("radio", name="4 - Bueno").click()
            cp.get_by_role("radio", name="Sí").click()
            cp.get_by_label("Sugerencia o queja (opcional)").fill("Muy buena atención (respuesta de prueba)")
            cp.screenshot(path=str(SHOTS / "11_cliente_encuesta_movil.png"), full_page=True)
            cp.get_by_role("button", name="Enviar opinión").click()
            expect(cp.get_by_text("ya recibimos su opinión")).to_be_visible()
            cp.reload()
            expect(cp.get_by_text("ya recibimos su opinión")).to_be_visible()
            assert cp.get_by_role("button", name="Enviar opinión").count() == 0
            page.goto(f"{BASE}/app/encuestas")
            expect(page.get_by_text("Muy buena atención (respuesta de prueba)")).to_be_visible()
            expect(page.get_by_text("4.0")).to_be_visible()
            shot(page, "12_encuestas_admin")
        survey()

        @step("Token inválido no muestra datos")
        def bad_token():
            cp = public_url["page"]
            cp.goto(f"{BASE}/s/{'0'*64}")
            expect(cp.get_by_text("Enlace no disponible")).to_be_visible()
            cp.goto(f"{BASE}/s/abc")
            expect(cp.get_by_text("Enlace no disponible")).to_be_visible()
        bad_token()

        @step("Revocar enlace: el cliente deja de verlo")
        def revoke():
            page.goto(f"{BASE}/app/agenda?fecha=2030-05-10")
            page.get_by_text("Cliente Ficticio Uno").click()
            page.get_by_role("button", name="Revocar").click()
            expect(page.get_by_text("Enlace revocado")).to_be_visible()
            cp = public_url["page"]
            cp.goto(public_url["v"])
            expect(cp.get_by_text("Enlace no disponible")).to_be_visible()
            page.get_by_role("button", name="Generar QR y enlace").click()
            expect(page.get_by_role("img", name=re.compile("Código QR"))).to_be_visible()
        revoke()

        @step("Copiar enlace y descargar QR")
        def copy_download():
            ctx.grant_permissions(["clipboard-read", "clipboard-write"])
            page.get_by_role("button", name="Copiar enlace").click()
            expect(page.get_by_text("Enlace copiado.")).to_be_visible()
            clip = page.evaluate("navigator.clipboard.readText()")
            assert re.search(r"/s/[a-f0-9]{64}$", clip), clip
            with page.expect_download() as d:
                page.get_by_role("link", name="Descargar QR").click()
            assert d.value.suggested_filename == "mimo-qr-ABC123.png", d.value.suggested_filename
        copy_download()

        @step("Editar/reprogramar: conflicto, guardado y cambio de estado de reserva")
        def edit():
            page.goto(f"{BASE}/app/agenda?fecha=2030-05-10")
            page.get_by_text("Cliente Ficticio Dos").click()
            page.wait_for_url(re.compile(r"/app/servicios/"))
            page.get_by_role("button", name="Editar / reprogramar").click()
            dlg = page.get_by_role("dialog")
            dlg.get_by_label("Hora").fill("10:15")   # choca con ABC123? ya está Finalizado → libre
            dlg.get_by_label("Estado de la reserva").select_option("confirmada")
            dlg.get_by_label("Notas").fill("Reprogramada en prueba E2E")
            dlg.get_by_role("button", name="Guardar cambios").click()
            expect(page.get_by_text("Cambios guardados.")).to_be_visible()
            expect(page.get_by_text("Reprogramada en prueba E2E")).to_be_visible()
            expect(page.get_by_text("Confirmada").first).to_be_visible()
            expect(page.get_by_text("10/05/2030 10:15")).to_be_visible()
        edit()

        @step("Horario de atención: aviso fuera de horario")
        def hours():
            page.goto(f"{BASE}/app/configuracion")
            page.get_by_role("tab", name="Capacidad y horario").click()
            row = page.locator("div.grid", has=page.get_by_text("Viernes", exact=True)).last
            row.get_by_role("checkbox").check()
            page.get_by_label("Viernes apertura").fill("08:00")
            page.get_by_label("Viernes cierre").fill("18:00")
            page.get_by_role("button", name="Guardar configuración").click()
            expect(page.get_by_text("Configuración guardada.")).to_be_visible()
            page.goto(f"{BASE}/app/agenda?nuevo=cita")
            dlg = page.get_by_role("dialog")
            dlg.get_by_label("Fecha").fill("2030-05-10")
            dlg.get_by_label("Hora").fill("19:00")
            dlg.get_by_label("Duración estimada (min)").fill("30")
            expect(dlg.get_by_text("fuera del horario de atención configurado (08:00–18:00)")).to_be_visible()
            page.keyboard.press("Escape")
        hours()

        @step("Servicios: desactivar/activar, editar y eliminar")
        def services():
            page.on("dialog", lambda d: d.accept())
            page.goto(f"{BASE}/app/configuracion")
            page.get_by_role("tab", name="Servicios").click()
            page.get_by_role("button", name="Nuevo servicio").click()
            dlg = page.get_by_role("dialog")
            dlg.get_by_label("Nombre").fill("Servicio temporal")
            dlg.get_by_role("button", name="Guardar servicio").click()
            row = page.get_by_role("row", name=re.compile("Servicio temporal"))
            row.get_by_role("button", name="Activo").click()
            expect(row.get_by_role("button", name="Inactivo")).to_be_visible()
            row.get_by_role("button", name="Inactivo").click()
            expect(row.get_by_role("button", name="Activo")).to_be_visible()
            row.get_by_role("button", name="Editar Servicio temporal").click()
            page.get_by_role("dialog").get_by_label("Nombre").fill("Servicio temporal editado")
            page.get_by_role("dialog").get_by_role("button", name="Guardar servicio").click()
            row = page.get_by_role("row", name=re.compile("Servicio temporal editado"))
            row.get_by_role("button", name="Eliminar Servicio temporal editado").click()
            expect(page.get_by_text("Servicio temporal editado")).to_have_count(0)
        services()

        @step("Eliminar registro definitivamente")
        def delete():
            page.goto(f"{BASE}/app/agenda?nuevo=cita")
            dlg = page.get_by_role("dialog")
            dlg.get_by_label("Nombre del cliente").fill("Para Borrar")
            dlg.get_by_label("Teléfono").fill("3000000009")
            dlg.get_by_label("Placa").fill("DEL999")
            dlg.get_by_label("Fecha").fill("2030-06-01")
            dlg.get_by_label("Hora").fill("09:00")
            dlg.get_by_label("Duración estimada (min)").fill("30")
            dlg.get_by_role("button", name="Crear reserva").click()
            page.wait_for_url(re.compile(r"/app/servicios/"))
            page.get_by_role("button", name="Eliminar", exact=True).click()
            page.get_by_role("button", name="Eliminar definitivamente").click()
            page.wait_for_url(re.compile(r"/app/agenda"))
            page.get_by_label("Buscar por nombre, teléfono o placa").fill("DEL999")
            expect(page.get_by_text("Sin resultados")).to_be_visible()
        delete()

        @step("Navegación pública: enlaces del menú desde otra página llevan a su sección")
        def public_nav():
            page.goto(f"{BASE}/privacidad")
            page.get_by_role("navigation", name="Principal").get_by_role("link", name="Demo").click()
            page.wait_for_url(re.compile(r"#demo$"))
            page.wait_for_timeout(600)
            assert page.evaluate("Math.abs(document.getElementById('demo').getBoundingClientRect().top) < 120")
            page.get_by_role("link", name="Ver privacidad").click()
            page.wait_for_url(re.compile(r"/privacidad$"))
            page.get_by_role("link", name="Crear mi cuenta real").count()
        public_nav()

        @step("Panel con indicadores")
        def dashboard():
            page.goto(f"{BASE}/app")
            expect(page.get_by_text("Capacidad ocupada ahora")).to_be_visible()
            expect(page.get_by_text("Encuestas (últimos 30 días)")).to_be_visible()
            shot(page, "13_dashboard")
        dashboard()

        @step("Invitar operario")
        def invite():
            page.goto(f"{BASE}/app/configuracion")
            page.get_by_role("tab", name="Usuarios").click()
            page.get_by_label("Correo").fill(f"operario.{RUN}@mimo-e2e.test")
            page.get_by_role("button", name="Crear invitación").click()
            expect(page.get_by_text("Invitación creada")).to_be_visible()
        invite()

        detail_url = {}

        @step("Cerrar sesión y volver a entrar: datos persisten")
        def relogin():
            page.goto(f"{BASE}/app/agenda?fecha=2030-05-10")
            page.get_by_text("Cliente Ficticio Uno").click()
            page.wait_for_url(re.compile(r"/app/servicios/"))
            detail_url["v"] = page.url
            page.get_by_role("button", name="Cerrar sesión").click()
            page.wait_for_url(re.compile(r"/login"))
            page.goto(f"{BASE}/app")
            page.wait_for_url(re.compile(r"/login"))
            page.get_by_label("Correo electrónico").fill(emailA)
            page.get_by_label("Contraseña").fill(PWD)
            page.get_by_role("button", name="Entrar").click()
            page.wait_for_url(re.compile(r"/app"))
            page.goto(f"{BASE}/app/agenda?fecha=2030-05-10")
            expect(page.get_by_text("Cliente Ficticio Uno")).to_be_visible()
        relogin()

        # ------------------ Negocio B (aislamiento) ------------------
        @step("Autolavado B no ve datos de A (ni por URL directa)")
        def isolation():
            ctxB = browser.new_context(viewport={"width": 1366, "height": 900})
            pb = ctxB.new_page()
            register(pb, "Admin Dos", f"Autolavado B {RUN}", f"admin.b.{RUN}@mimo-e2e.test")
            pb.get_by_role("button", name="Crear autolavado").click()
            pb.wait_for_url(re.compile(r"/app$"))
            pb.goto(f"{BASE}/app/agenda?fecha=2030-05-10")
            expect(pb.get_by_text("No hay registros para este día")).to_be_visible()
            pb.get_by_label("Buscar por nombre, teléfono o placa").fill("ABC")
            expect(pb.get_by_text("Sin resultados")).to_be_visible()
            pb.goto(detail_url["v"])
            expect(pb.get_by_text("Registro no encontrado")).to_be_visible()
            pb.goto(f"{BASE}/app/encuestas")
            expect(pb.get_by_text("Aún no hay respuestas")).to_be_visible()
            ctxB.close()
        isolation()

        @step("Operario invitado: se une a A, ve agenda, sin encuestas ni configuración")
        def operario():
            ctxO = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True)
            po = ctxO.new_page()
            register(po, "Operario Uno", "Invitado", f"operario.{RUN}@mimo-e2e.test")
            expect(po.get_by_text("Tiene una invitación")).to_be_visible()
            po.get_by_role("button", name=re.compile("Unirme a")).click()
            po.wait_for_url(re.compile(r"/app$"))
            nav = po.get_by_role("navigation", name="Panel móvil")
            assert nav.get_by_text("Encuestas").count() == 0 and nav.get_by_text("Configuración").count() == 0
            po.goto(f"{BASE}/app/encuestas")
            expect(po.get_by_text("Solo para administradores")).to_be_visible()
            po.goto(f"{BASE}/app/agenda?fecha=2030-05-10")
            expect(po.get_by_text("Cliente Ficticio Dos")).to_be_visible()
            po.get_by_text("Cliente Ficticio Dos").click()
            po.get_by_role("button", name="En curso").click()
            expect(po.get_by_text("Estado actualizado a “En curso”")).to_be_visible()
            assert po.get_by_role("button", name="Editar / reprogramar").count() == 0
            po.screenshot(path=str(SHOTS / "14_operario_movil.png"), full_page=True)
            # Mi cuenta: cambiar nombre y contraseña, y volver a entrar con la nueva
            po.goto(f"{BASE}/app/cuenta")
            po.get_by_label("Nombre", exact=False).first.fill("Operario Renombrado")
            po.get_by_role("button", name="Guardar nombre").click()
            expect(po.get_by_text("Nombre actualizado.")).to_be_visible()
            po.get_by_label("Nueva contraseña *", exact=True).fill("corta")
            po.get_by_role("button", name="Actualizar contraseña").click()
            expect(po.get_by_text("al menos 8 caracteres")).to_be_visible()
            po.get_by_label("Nueva contraseña *", exact=True).fill("NuevaClave456")
            po.get_by_label("Repita la nueva contraseña").fill("NuevaClave456")
            po.get_by_role("button", name="Actualizar contraseña").click()
            expect(po.get_by_text("Contraseña actualizada")).to_be_visible()
            po.get_by_role("button", name="Cerrar sesión").click()
            po.wait_for_url(re.compile(r"/login"))
            po.get_by_label("Correo electrónico").fill(f"operario.{RUN}@mimo-e2e.test")
            po.get_by_label("Contraseña").fill(PWD)
            po.get_by_role("button", name="Entrar").click()
            expect(po.get_by_text("Correo o contraseña incorrectos.")).to_be_visible()
            po.get_by_label("Contraseña").fill("NuevaClave456")
            po.get_by_role("button", name="Entrar").click()
            po.wait_for_url(re.compile(r"/app"))
            ctxO.close()
        operario()

        @step("Admin: anular invitación y retirar a un miembro")
        def members():
            page.goto(f"{BASE}/app/configuracion")
            page.get_by_role("tab", name="Usuarios").click()
            page.get_by_label("Correo").fill(f"nadie.{RUN}@mimo-e2e.test")
            page.get_by_role("button", name="Crear invitación").click()
            expect(page.get_by_text(f"nadie.{RUN}@mimo-e2e.test")).to_be_visible()
            page.get_by_role("listitem").filter(has_text=f"nadie.{RUN}").get_by_role("button", name="Anular").click()
            expect(page.get_by_text(f"nadie.{RUN}@mimo-e2e.test")).to_have_count(0)
            expect(page.get_by_text("Operario Renombrado")).to_be_visible()
            page.get_by_role("listitem").filter(has_text="Operario Renombrado").get_by_role("button", name="Retirar").click()
            expect(page.get_by_text("Operario Renombrado")).to_have_count(0)
        members()

        @step("Responsive: sitio público y agenda en móvil")
        def mobile():
            m = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True)
            mp = m.new_page()
            mp.goto(f"{BASE}/")
            mp.screenshot(path=str(SHOTS / "15_landing_movil.png"), full_page=False)
            mp.get_by_role("button", name="Abrir menú").click()
            expect(mp.get_by_role("navigation", name="Principal móvil")).to_be_visible()
            m.close()
        mobile()

        assert not console_errors, f"Errores de JavaScript: {console_errors}"
        browser.close()
    print("\n".join(results))
    print(f"\nE2E COMPLETO: {len(results)} pasos OK")


if __name__ == "__main__":
    main()
