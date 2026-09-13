import { useState, useEffect, useCallback, useRef } from 'react';

export function useWakeLock(initialEnabled = true) {
  const [isActive, setIsActive] = useState(false);
  const [isSupported] = useState(() => typeof navigator !== 'undefined' && 'wakeLock' in navigator);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const enabledRef = useRef(initialEnabled);

  const requestLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return false;
    try {
      if (wakeLockRef.current) {
        return true;
      }
      const lock = await navigator.wakeLock.request('screen');
      wakeLockRef.current = lock;
      setIsActive(true);

      lock.addEventListener('release', () => {
        wakeLockRef.current = null;
        setIsActive(false);
      });

      return true;
    } catch (err) {
      console.warn('Wake Lock request failed:', err);
      setIsActive(false);
      return false;
    }
  }, []);

  const releaseLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch (err) {
        console.warn('Wake Lock release error:', err);
      }
      wakeLockRef.current = null;
    }
    setIsActive(false);
  }, []);

  const toggleWakeLock = useCallback(async () => {
    if (isActive) {
      enabledRef.current = false;
      await releaseLock();
    } else {
      enabledRef.current = true;
      await requestLock();
    }
  }, [isActive, releaseLock, requestLock]);

  // Manejar cambios de visibilidad de la pestaña
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && enabledRef.current) {
        await requestLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [requestLock]);

  // Intentar adquirirlo en el montaje si está habilitado
  useEffect(() => {
    let cancelled = false;
    if (initialEnabled) {
      void (async () => {
        const acquired = await requestLock();
        if (cancelled && acquired) {
          void releaseLock();
        }
      })();
    }
    return () => {
      cancelled = true;
      void releaseLock();
    };
  }, [initialEnabled, requestLock, releaseLock]);

  return {
    isSupported,
    isActive,
    toggleWakeLock,
  };
}
