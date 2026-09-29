import React, { useSyncExternalStore } from 'react';
import { RefreshCw } from 'lucide-react';
import { applyUpdate, getWaitingWorker, subscribeUpdate } from '../../utils/serviceWorker';

/** Aviso de versión nueva de la app (service worker en espera). */
export const UpdateBanner: React.FC = () => {
  const waiting = useSyncExternalStore(subscribeUpdate, getWaitingWorker);
  if (!waiting) return null;

  return (
    <div role="status" className="bg-sky-700 text-white text-xs font-bold px-3 py-2 flex items-center justify-center gap-3">
      <span>Hay una versión nueva de la app.</span>
      <button
        type="button"
        onClick={applyUpdate}
        className="flex items-center gap-1 bg-white text-sky-800 px-2.5 py-1 rounded-[var(--radius-sm)] cursor-pointer active:scale-[0.98]"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Actualizar
      </button>
    </div>
  );
};
