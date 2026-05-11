import { useState, useEffect, useCallback } from 'react';

export function useGeminiTake(
  fetcher: () => Promise<string>,
  deps: unknown[] = []
) {
  const [take, setTake] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await fetcher();
      setTake(result);
    } catch {
      setError(true);
      setTake('Unable to load AI analysis. Tap to retry.');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { load(); }, [load]);

  return { take, loading, error, retry: load };
}
