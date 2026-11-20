import { Link } from 'react-router-dom';
import { PublicLayout } from '../../components/PublicLayout';

export default function NotFound() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="font-display text-6xl font-extrabold text-mimo-blue">404</p>
        <h1 className="mt-4 font-display text-2xl font-bold">Página no encontrada</h1>
        <Link to="/" className="mt-6 inline-block rounded-xl bg-mimo-blue px-5 py-2.5 font-semibold text-white">Volver al inicio</Link>
      </div>
    </PublicLayout>
  );
}
