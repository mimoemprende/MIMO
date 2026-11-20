import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <h1 className="font-display text-2xl font-bold text-mimo-ink">Algo salió mal</h1>
          <p className="mt-2 text-sm text-slate-600">Ocurrió un error inesperado en la pantalla. Sus datos guardados no se han perdido.</p>
          <button onClick={() => window.location.reload()} className="mt-6 rounded-xl bg-mimo-blue px-5 py-2.5 font-semibold text-white">Recargar</button>
        </div>
      );
    }
    return this.props.children;
  }
}
