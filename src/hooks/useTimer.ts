import { useState, useEffect, useRef } from 'react';

export function useTimer(isActive: boolean, initialSeconds = 0) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setSeconds(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (isActive) {
      timerRef.current = window.setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive]);

  const reset = (newVal = 0) => {
    setSeconds(newVal);
  };

  return { seconds, reset };
}
