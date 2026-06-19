import { useEffect, useRef, useCallback } from 'react';

interface UseAutoDismissOptions {
  seconds: number;
  enabled: boolean;
  onDismiss: () => void;
  isDragging: boolean;
}

export function useAutoDismiss({ seconds, enabled, onDismiss, isDragging }: UseAutoDismissOptions): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPausedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    if (!enabled || seconds <= 0 || isDragging) return;

    timerRef.current = setTimeout(() => {
      if (!isPausedRef.current) {
        onDismiss();
      }
    }, seconds * 1000);
  }, [seconds, enabled, isDragging, onDismiss, clearTimer]);

  // Pause on hover
  useEffect(() => {
    const root = document.getElementById('content-root');
    if (!root) return;

    const handleEnter = () => {
      isPausedRef.current = true;
      clearTimer();
    };

    const handleLeave = () => {
      isPausedRef.current = false;
      startTimer();
    };

    root.addEventListener('mouseenter', handleEnter);
    root.addEventListener('mouseleave', handleLeave);

    return () => {
      root.removeEventListener('mouseenter', handleEnter);
      root.removeEventListener('mouseleave', handleLeave);
    };
  }, [startTimer, clearTimer]);

  // Cancel on drag
  useEffect(() => {
    if (isDragging) {
      clearTimer();
    } else {
      startTimer();
    }
  }, [isDragging, startTimer, clearTimer]);

  // Start timer on mount
  useEffect(() => {
    startTimer();
    return clearTimer;
  }, [startTimer, clearTimer]);
}
