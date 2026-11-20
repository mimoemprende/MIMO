import { useCallback, useEffect, useRef, useState } from 'react';
import { friendlyError } from '../lib/errors';

/** Carga asíncrona con estados de carga/error y recarga manual. */
export function useLoader<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const reload = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await fnRef.current()); }
    catch (e) { setError(friendlyError(e)); }
    finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void reload(); }, deps);
  return { data, loading, error, reload, setData };
}
