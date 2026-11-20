import { PublicLayout } from '../../components/PublicLayout';

export default function Privacy() {
  return (
    <PublicLayout>
      <article className="mx-auto max-w-3xl px-4 py-14 text-slate-700">
        <h1 className="font-display text-3xl font-bold text-mimo-ink">Privacidad y uso de datos</h1>
        <p className="mt-2 text-sm text-slate-500">Texto base del MVP. Debe ser revisado y aprobado por el equipo MIMO (y asesoría legal) antes de uso comercial.</p>
        <h2 className="mt-8 font-display text-xl font-bold text-mimo-ink">Qué datos se recogen</h2>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li><b>Autolavados:</b> nombre del negocio, dirección, teléfono, nombre y correo de los usuarios autorizados.</li>
          <li><b>Clientes del autolavado:</b> nombre, teléfono y placa del vehículo, registrados por el autolavado para gestionar el servicio.</li>
          <li><b>Encuestas:</b> calificación del servicio, si volvería y la sugerencia o queja opcional.</li>
          <li><b>Formulario de contacto:</b> nombre, autolavado, ciudad, teléfono o correo y mensaje, con su consentimiento.</li>
        </ul>
        <h2 className="mt-8 font-display text-xl font-bold text-mimo-ink">Para qué se usan</h2>
        <p className="mt-2">Para que cada autolavado organice su agenda, informe el estado del servicio a su cliente y conozca su opinión. Los datos de un autolavado no son visibles para otros autolavados. Las respuestas de encuestas solo las ve el autolavado que prestó el servicio.</p>
        <h2 className="mt-8 font-display text-xl font-bold text-mimo-ink">Enlace de seguimiento</h2>
        <p className="mt-2">El enlace/QR muestra únicamente el estado del servicio, el nombre del autolavado y una placa parcialmente oculta. No muestra teléfonos, nombres completos ni otros clientes. El autolavado puede revocarlo o reemplazarlo en cualquier momento.</p>
        <h2 className="mt-8 font-display text-xl font-bold text-mimo-ink">Retención y eliminación</h2>
        <p className="mt-2"><b>Pendiente de definición por el equipo:</b> el plazo de conservación de reservas, encuestas y solicitudes de contacto. Mientras tanto, el autolavado puede eliminar sus registros desde el panel, y las solicitudes de contacto se eliminan a petición escribiendo al equipo MIMO.</p>
      </article>
    </PublicLayout>
  );
}
