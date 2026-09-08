import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

export interface ToastData {
  type: 'success' | 'warning' | 'error';
  message: string;
}

interface ToastNotificationProps {
  toast: ToastData | null;
  onClose: () => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';

  return (
    <aside
      aria-label="Notificaciones"
      className="fixed bottom-4 left-3 right-3 md:left-auto md:right-4 md:max-w-md z-50 animate-bounce-short"
    >
      <div
        className={`flex items-start gap-3 p-3.5 rounded-2xl shadow-xl border text-sm backdrop-blur-md ${
          isSuccess
            ? 'bg-emerald-900/95 text-white border-emerald-700 shadow-emerald-950/20'
            : 'bg-slate-900/95 text-white border-slate-700 shadow-black/30'
        }`}
      >
        {isSuccess ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
        )}
        <div className="flex-1 font-medium leading-snug">{toast.message}</div>
        <button
          type="button"
          onClick={onClose}
          className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
