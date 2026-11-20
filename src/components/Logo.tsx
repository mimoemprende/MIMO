import { asset } from '../lib/paths';

/** Logotipos oficiales de MIMO (imágenes originales, sin alterar proporciones). Reemplazables en /public/assets. */
export function Logo({ className = 'h-9 w-auto' }: { className?: string }) {
  return <img src={asset('assets/logo-mimo.png')} alt="MIMO" className={`${className} object-contain`} width={1536} height={509} />;
}

export function LogoSlogan({ className = 'h-40 w-auto' }: { className?: string }) {
  return (
    <img src={asset('assets/logo-mimo-eslogan.png')} alt="MIMO · LAVA · CUIDA · REGRESA" className={`${className} object-contain`} width={1536} height={1024} />
  );
}
