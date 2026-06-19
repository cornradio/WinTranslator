import { useEffect, useRef, useCallback } from 'react';

/**
 * Measures content height and sends resize IPC to main process.
 * Debounced to avoid excessive IPC during fast streaming.
 */
export function useAutoResize(deps: unknown[]): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doResize = useCallback(() => {
    const root = document.getElementById('content-root');
    if (!root) return;

    const height = root.scrollHeight + 2; // +2 for border
    window.electronAPI?.popup.resize(height);
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(doResize, 50);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}
