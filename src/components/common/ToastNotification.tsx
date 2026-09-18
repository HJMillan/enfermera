import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, X, RotateCcw } from 'lucide-react';

export interface ToastData {
  type: 'success' | 'warning' | 'error';
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  durationMs?: number;
}

interface ToastNotificationProps {
  toast: ToastData | null;
  onClose: () => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const timeout = toast.durationMs ?? (toast.action ? 5000 : 3500);
    const timer = setTimeout(() => {
      onClose();
    }, timeout);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';

  return (
    <aside
      aria-label="Notificaciones"
      className="fixed left-3 right-3 md:left-auto md:right-4 md:max-w-md z-50 animate-fade-in"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
    >
      <div
        className={`flex items-center gap-3 p-3 rounded-2xl shadow-2xl border text-xs md:text-sm backdrop-blur-md ${
          isSuccess
            ? 'bg-slate-900/95 text-white border-slate-700 shadow-slate-950/40'
            : 'bg-rose-950/95 text-white border-rose-800 shadow-rose-950/40'
        }`}
      >
        {isSuccess ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
        )}

        <div className="flex-1 font-semibold leading-snug">{toast.message}</div>

        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick();
              onClose();
            }}
            className="flex items-center gap-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-3 py-1.5 rounded-xl text-xs shadow-xs touch-active cursor-pointer transition-all shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{toast.action.label}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 shrink-0"
          title="Cerrar aviso"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
