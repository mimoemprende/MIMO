"""
Prueba E2E de los flujos que dependen del CORREO (Supabase Auth con "Confirm email" activo):
  1) registro → pantalla "Revise su correo" → login bloqueado → enlace de confirmación → /bienvenida → autolavado creado
  2) "¿Olvidó su contraseña?" → correo → /restablecer → nueva contraseña → login con la nueva
  3) enlace de recuperación inválido/vencido → mensaje claro
Requiere un backend con SMTP que deje los correos en MAIL_DIR (ver README · Pruebas). Uso:
  BASE_URL=http://localhost:4175/mimo MAIL_DIR=/tmp/mails python tests/e2e_email_flows.py
"""
import email, os, re, time, uuid, quopri, html
from email import policy
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get("BASE_URL", "http://localhost:5173")
MAIL_DIR = Path(os.environ.get("MAIL_DIR", "/tmp/mails"))
CHROME = os.environ.get("CHROME_PATH", "/usr/bin/google-chrome")
RUN = uuid.uuid4().hex[:6]
EMAIL = f"correo.{RUN}@mimo-e2e.test"


def wait_mail(to: str, since: float, timeout=20):
    end = time.time() + timeout
    while time.time() < end:
        for f in sorted(MAIL_DIR.glob("*.eml")):
            if float(f.stem) < since:
                continue
            msg = email.message_from_bytes(f.read_bytes(), policy=policy.default)
            if to.lower() in str(msg["To"]).lower():
                body = msg.get_body(preferencelist=("html", "plain")).get_content()
                links = re.findall(r'href="([^"]+)"', body) or re.findall(r"https?://\S+", body)
                link = html.unescape([l for l in links if "verify" in l or "token" in l][0])
                return msg["Subject"], link
        time.sleep(0.5)
    raise AssertionError(f"No llegó correo para {to}")


def main():
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME if Path(CHROME).exists() else None)
        ctx = b.new_context(viewport={"width": 1280, "height": 860})
        pg = ctx.new_page()
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)))

        # 1) Registro con confirmación de correo
        t0 = time.time()
        pg.goto(f"{BASE}/registro")
        pg.get_by_label("Su nombre").fill("Admin Correo")
        pg.get_by_label("Nombre del autolavado").fill(f"Lavadero Correo {RUN}")
        pg.get_by_label("Correo electrónico").fill(EMAIL)
        pg.get_by_label("Contraseña *", exact=True).fill("ClaveInicial123")
        pg.get_by_label("Repita la contraseña").fill("ClaveInicial123")
        pg.get_by_role("button", name="Crear cuenta").click()
        expect(pg.get_by_role("heading", name="Revise su correo")).to_be_visible()
        print("OK  registro → pantalla 'Revise su correo'")

        pg.goto(f"{BASE}/login")
        pg.get_by_label("Correo electrónico").fill(EMAIL)
        pg.get_by_label("Contraseña").fill("ClaveInicial123")
        pg.get_by_role("button", name="Entrar").click()
        expect(pg.get_by_text("Debe confirmar su correo")).to_be_visible()
        print("OK  login bloqueado antes de confirmar el correo")

        subject, link = wait_mail(EMAIL, t0)
        pg.goto(link)
        pg.wait_for_url(re.compile(r"/bienvenida"), timeout=15000)
        expect(pg.get_by_label("Nombre del autolavado")).to_have_value(f"Lavadero Correo {RUN}")
        pg.get_by_role("button", name="Crear autolavado").click()
        pg.wait_for_url(re.compile(r"/app$"))
        expect(pg.get_by_text(f"Lavadero Correo {RUN}").first).to_be_visible()
        print(f"OK  enlace de confirmación ('{subject}') → /bienvenida → autolavado creado")

        pg.get_by_role("button", name="Cerrar sesión").click()
        pg.wait_for_url(re.compile(r"/login"))

        # 2) Recuperación de contraseña
        t1 = time.time()
        pg.get_by_label("Correo electrónico").fill(EMAIL)
        pg.get_by_role("button", name="¿Olvidó su contraseña?").click()
        expect(pg.get_by_text("recibirá un enlace para restablecer")).to_be_visible()
        subject, link = wait_mail(EMAIL, t1)
        pg.goto(link)
        pg.wait_for_url(re.compile(r"/restablecer"), timeout=15000)
        pg.get_by_label("Nueva contraseña *", exact=True).fill("ClaveNueva789")
        pg.get_by_label("Repita la nueva contraseña").fill("ClaveDistinta1")
        pg.get_by_role("button", name="Guardar nueva contraseña").click()
        expect(pg.get_by_text("Las contraseñas no coinciden.")).to_be_visible()
        pg.get_by_label("Repita la nueva contraseña").fill("ClaveNueva789")
        pg.get_by_role("button", name="Guardar nueva contraseña").click()
        expect(pg.get_by_text("Su contraseña fue actualizada.")).to_be_visible()
        pg.get_by_role("button", name="Ir al panel").click()
        pg.wait_for_url(re.compile(r"/app$"))
        pg.get_by_role("button", name="Cerrar sesión").click()
        pg.wait_for_url(re.compile(r"/login"))
        pg.get_by_label("Correo electrónico").fill(EMAIL)
        pg.get_by_label("Contraseña").fill("ClaveInicial123")
        pg.get_by_role("button", name="Entrar").click()
        expect(pg.get_by_text("Correo o contraseña incorrectos.")).to_be_visible()
        pg.get_by_label("Contraseña").fill("ClaveNueva789")
        pg.get_by_role("button", name="Entrar").click()
        pg.wait_for_url(re.compile(r"/app"))
        print(f"OK  recuperación ('{subject}') → /restablecer → nueva contraseña funciona y la anterior no")

        # 3) Enlace reutilizado / inválido
        ctx2 = b.new_context()
        p2 = ctx2.new_page()
        p2.goto(link)  # el token de recuperación ya se usó
        p2.wait_for_url(re.compile(r"/restablecer"), timeout=15000)
        expect(p2.get_by_text(re.compile("no es válido|No encontramos un enlace"))).to_be_visible(timeout=8000)
        p2.goto(f"{BASE}/restablecer")
        expect(p2.get_by_text("No encontramos un enlace de recuperación válido")).to_be_visible(timeout=8000)
        print("OK  enlace usado o ausente → mensaje claro, sin formulario")

        assert not errors, errors
        b.close()
    print("\nE2E CORREO COMPLETO: 5 verificaciones OK")


if __name__ == "__main__":
    main()
