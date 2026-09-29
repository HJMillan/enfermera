import React, { useEffect, useRef } from 'react';

interface ModalShellProps {
  /** id del título visible, para aria-labelledby. */
  labelledBy: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Clases del panel (tamaño, alto máximo, etc.). */
  panelClassName?: string;
  /** z-index del fondo. */
  zClassName?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Contenedor accesible de modales: role="dialog", cierre con Esc,
 * foco atrapado dentro del panel y devuelto al elemento anterior al cerrar.
 */
export const ModalShell: React.FC<ModalShellProps> = ({
  labelledBy,
  onClose,
  children,
  panelClassName = 'max-w-lg max-h-[90vh]',
  zClassName = 'z-50',
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first || panel)?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );
      if (items.length === 0) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      previous?.focus?.();
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 ${zClassName} flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-md`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`bg-white w-full rounded-[var(--radius-lg)] shadow-[var(--shadow-elevated)] border border-slate-200/80 overflow-hidden flex flex-col outline-none animate-fade-in ${panelClassName}`}
      >
        {children}
      </div>
    </div>
  );
};
