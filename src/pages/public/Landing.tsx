import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  CalendarDays, QrCode, MessageSquareHeart, ArrowRight, NotebookPen, Eye, MessagesSquare, LineChart,
  ClipboardList, RefreshCw, Smartphone, Star, ChevronDown, Building2, ShieldCheck,
} from 'lucide-react';
import { PublicLayout } from '../../components/PublicLayout';
import { LogoSlogan } from '../../components/Logo';
import DemoAgenda from '../../demos/DemoAgenda';
import DemoTracking from '../../demos/DemoTracking';
import DemoSurvey from '../../demos/DemoSurvey';
import ContactForm from './ContactForm';

const modules = [
  {
    icon: CalendarDays, title: 'Agenda digital', demo: 'agenda',
    text: 'Registre reservas con fecha y hora y vehículos que llegan sin cita. MIMO verifica la capacidad que usted configura para no aceptar más vehículos de los que puede atender.',
    benefit: 'Deje atrás la agenda en papel y evite cruces de horario.',
  },
  {
    icon: QrCode, title: 'Seguimiento del vehículo', demo: 'seguimiento',
    text: 'Cada servicio tiene un código QR y un enlace único. Su cliente ve desde el celular el estado actual —Libre, En curso o Finalizado— y la hora de la última actualización.',
    benefit: 'Su cliente consulta el estado sin tener que llamar.',
  },
  {
    icon: MessageSquareHeart, title: 'Encuestas de satisfacción', demo: 'encuesta',
    text: 'Al finalizar, el cliente responde desde el mismo enlace: qué le pareció el servicio, si volvería y una sugerencia o queja. Usted consulta las respuestas en su panel.',
    benefit: 'Conozca la opinión real de sus clientes para mejorar.',
  },
];

const steps = [
  { icon: ClipboardList, title: 'Registre el vehículo', text: 'Desde una reserva programada o una llegada sin cita.' },
  { icon: QrCode, title: 'Comparta el QR', text: 'El cliente lo escanea con la cámara del celular. No necesita crear cuenta.' },
  { icon: RefreshCw, title: 'Actualice el estado', text: 'Su equipo marca Libre, En curso o Finalizado desde el panel.' },
  { icon: Star, title: 'Reciba su opinión', text: 'Al finalizar, el cliente responde la encuesta desde el mismo enlace.' },
];

const benefits = [
  { icon: NotebookPen, title: 'Operación organizada', text: 'Agenda, llegadas sin cita y capacidad en un solo lugar.' },
  { icon: Eye, title: 'Visibilidad de cada servicio', text: 'Sepa qué vehículos están en curso y cuáles finalizaron.' },
  { icon: MessagesSquare, title: 'Mejor comunicación', text: 'El cliente consulta el estado sin tener que llamar.' },
  { icon: LineChart, title: 'Retroalimentación', text: 'Respuestas de encuestas guardadas y fáciles de revisar.' },
];

const faqs = [
  { q: '¿Quién utiliza MIMO?', a: 'El propietario, administrador o encargado del autolavado, y opcionalmente operarios autorizados por él. Cada autolavado tiene su propio espacio y sus datos no son visibles para otros negocios.' },
  { q: '¿El cliente necesita crear una cuenta?', a: 'No. El cliente solo escanea el código QR o abre el enlace de su servicio. Ese enlace muestra únicamente su vehículo, nunca información de otros clientes.' },
  { q: '¿Cómo se comparte el enlace de seguimiento?', a: 'Al registrar el vehículo, MIMO genera un QR y un enlace único. Puede mostrar el QR en pantalla para que el cliente lo escanee, imprimirlo o copiar el enlace y enviarlo por el medio que usted ya utiliza. El envío automático por WhatsApp o correo no está incluido en esta versión.' },
  { q: '¿Qué significa “seguimiento en vivo”?', a: 'Significa que el cliente ve el estado del servicio tal como lo actualiza el personal del autolavado (Libre, En curso o Finalizado) y la hora de la última actualización. No es GPS, no muestra la ubicación del vehículo y no es vídeo en vivo.' },
  { q: '¿Cómo se controla la capacidad?', a: 'Cada autolavado configura cuántos vehículos puede atender al mismo tiempo. MIMO revisa esa capacidad al crear reservas y al registrar llegadas sin cita, y explica el conflicto cuando no hay cupo.' },
  { q: '¿Cuánto cuesta?', a: 'Los planes y precios aún no están definidos. Escríbanos desde el formulario de contacto y le contaremos cómo participar en una prueba.' },
];

type DemoKey = 'agenda' | 'seguimiento' | 'encuesta';

export default function Landing() {
  const [demo, setDemo] = useState<DemoKey>('agenda');
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const location = useLocation();
  // Navegación a secciones (#demo, #contacto…) también al venir desde otra página.
  useEffect(() => {
    if (!location.hash) return;
    const t = setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 50);
    return () => clearTimeout(t);
  }, [location.hash, location.key]);
  const goDemo = (k: DemoKey) => { setDemo(k); document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' }); };

  return (
    <PublicLayout>
      {/* HERO */}
      <section id="inicio" className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-mimo-cyan/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-mimo-blue/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-mimo-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-mimo-blue"><Building2 className="h-3.5 w-3.5" />Plataforma para autolavados</p>
            <h1 className="mt-4 text-balance font-display text-4xl font-extrabold leading-tight text-mimo-ink sm:text-5xl">
              Administre su autolavado <span className="text-mimo-blue">sin agenda de papel</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg text-slate-600">
              Organice reservas y llegadas sin cita, informe a sus clientes el estado de su vehículo con un QR y conozca su opinión con encuestas al finalizar.
            </p>
            <p className="mt-3 font-display text-sm font-bold tracking-[0.3em] text-mimo-blue">LAVA · CUIDA · REGRESA</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#demo" className="inline-flex items-center justify-center gap-2 rounded-xl bg-mimo-blue px-6 py-3 font-semibold text-white shadow-lg shadow-mimo-blue/20 hover:bg-mimo-blue-dark">Ver demostración <ArrowRight className="h-4 w-4" /></a>
              <a href="#contacto" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-mimo-blue ring-1 ring-inset ring-mimo-blue-100 hover:bg-mimo-blue-50">Solicitar información</a>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-mimo-yellow" aria-hidden />
            <div className="absolute -bottom-3 left-6 h-4 w-4 rounded-full bg-mimo-orange" aria-hidden />
            <div className="rounded-[2rem] bg-[#FDFDFD] p-6 shadow-card ring-1 ring-slate-200">
              <LogoSlogan className="mx-auto h-auto w-full max-w-md" />
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEMA / PROPUESTA */}
      <section className="bg-mimo-gradient text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-3">
          <div className="md:col-span-1">
            <h2 className="font-display text-3xl font-bold">¿Por qué MIMO?</h2>
            <p className="mt-2 text-white/85">Un autolavado atiende muchos vehículos al día. Cuando todo depende de papel y llamadas, se pierde tiempo y claridad.</p>
          </div>
          {[
            ['Agendas en papel', 'Reservas cruzadas, tachones y vehículos sin registrar. MIMO centraliza reservas y llegadas sin cita, y respeta su capacidad.'],
            ['Clientes que preguntan', '“¿Ya está listo?”. Con MIMO el cliente consulta el estado de su servicio desde el celular, sin crear cuenta.'],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl bg-white/10 p-5 ring-1 ring-white/20">
              <h3 className="font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-white/85">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FUNCIONALIDADES */}
      <section id="funcionalidades" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold">Tres módulos, una sola herramienta</h2>
          <p className="mt-2 text-slate-600">Pensados para el día a día del administrador del autolavado.</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {modules.map((m) => (
            <article key={m.title} className="flex flex-col rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-200">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mimo-blue text-white"><m.icon className="h-6 w-6" /></div>
              <h3 className="mt-4 font-display text-xl font-bold">{m.title}</h3>
              <p className="mt-2 flex-1 text-sm text-slate-600">{m.text}</p>
              <p className="mt-4 rounded-xl bg-mimo-cyan-50 px-3 py-2 text-sm font-medium text-mimo-blue">{m.benefit}</p>
              <button onClick={() => goDemo(m.demo as DemoKey)} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-mimo-blue hover:underline">Probar la demostración <ArrowRight className="h-4 w-4" /></button>
            </article>
          ))}
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como-funciona" className="scroll-mt-20 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-3xl font-bold">Cómo funciona</h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.title} className="relative rounded-3xl bg-white p-6 ring-1 ring-slate-200">
                <span className="absolute -top-3 left-6 rounded-full bg-mimo-yellow px-2.5 py-0.5 text-xs font-bold text-mimo-ink">Paso {i + 1}</span>
                <s.icon className="h-8 w-8 text-mimo-blue" />
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{s.text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 flex items-center gap-2 text-sm text-slate-600"><Smartphone className="h-4 w-4 text-mimo-blue" />El seguimiento muestra el estado que actualiza su equipo. No usa GPS ni vídeo.</p>
        </div>
      </section>

      {/* DEMOS */}
      <section id="demo" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold">Pruebe MIMO ahora</h2>
            <p className="mt-2 text-slate-600">Demostraciones interactivas con datos ficticios. Nada de lo que haga aquí se guarda ni afecta datos reales.</p>
          </div>
        </div>
        <div role="tablist" aria-label="Demostraciones" className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {([['agenda', 'Agenda', CalendarDays], ['seguimiento', 'Seguimiento QR', QrCode], ['encuesta', 'Encuesta', MessageSquareHeart]] as const).map(([k, l, Icon]) => (
            <button key={k} role="tab" aria-selected={demo === k} onClick={() => setDemo(k)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${demo === k ? 'bg-mimo-blue text-white' : 'bg-slate-100 text-slate-700 hover:bg-mimo-blue-50'}`}>
              <Icon className="h-4 w-4" />{l}
            </button>
          ))}
        </div>
        <div className="mt-6" role="tabpanel">
          {demo === 'agenda' && <DemoAgenda />}
          {demo === 'seguimiento' && <DemoTracking />}
          {demo === 'encuesta' && <DemoSurvey />}
        </div>
      </section>

      {/* BENEFICIOS */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-3xl font-bold">Beneficios para su autolavado</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((b) => (
              <div key={b.title} className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
                <b.icon className="h-6 w-6 text-mimo-orange" />
                <h3 className="mt-3 font-semibold">{b.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{b.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 flex items-center gap-2 text-sm text-slate-600"><ShieldCheck className="h-4 w-4 text-mimo-blue" />Los datos de cada autolavado están aislados: ningún negocio puede ver la información de otro.</p>
        </div>
      </section>

      {/* FAQ */}
      <section id="preguntas" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-16">
        <h2 className="font-display text-3xl font-bold">Preguntas frecuentes</h2>
        <div className="mt-8 divide-y divide-slate-200 rounded-2xl ring-1 ring-slate-200">
          {faqs.map((f, i) => (
            <div key={f.q}>
              <button className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold" aria-expanded={faqOpen === i} onClick={() => setFaqOpen(faqOpen === i ? null : i)}>
                {f.q}<ChevronDown className={`h-5 w-5 shrink-0 text-mimo-blue transition ${faqOpen === i ? 'rotate-180' : ''}`} />
              </button>
              {faqOpen === i && <p className="px-5 pb-5 text-sm text-slate-600">{f.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* CONTACTO */}
      <section id="contacto" className="scroll-mt-20 bg-mimo-gradient">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2">
          <div className="text-white">
            <h2 className="font-display text-3xl font-bold">¿Quiere probar MIMO en su autolavado?</h2>
            <p className="mt-3 text-white/85">Déjenos sus datos y el equipo de MIMO se pondrá en contacto para mostrarle la plataforma.</p>
            <p className="mt-6 text-white/85">¿Ya tiene acceso?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link to="/login" className="rounded-xl bg-white px-5 py-2.5 font-semibold text-mimo-blue hover:bg-mimo-blue-50">Iniciar sesión</Link>
              <Link to="/registro" className="rounded-xl bg-mimo-yellow px-5 py-2.5 font-semibold text-mimo-ink hover:brightness-95">Registrar mi autolavado</Link>
            </div>
          </div>
          <ContactForm />
        </div>
      </section>
    </PublicLayout>
  );
}
