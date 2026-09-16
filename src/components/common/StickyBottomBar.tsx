import React from 'react';
import { Save, CheckCircle, RefreshCw } from 'lucide-react';

interface StickyBottomBarProps {
  formId: string;
  isSubmitting: boolean;
  cama: string;
  habitacion: string;
  sector: string;
  hasCondition: boolean;
  roundType: 'ACCESO_PERIFERICO' | 'UPP';
  altType?: string;
}

export const StickyBottomBar: React.FC<StickyBottomBarProps> = ({
  formId,
  isSubmitting,
  cama,
  habitacion,
  sector,
  hasCondition,
  roundType,
  altType,
}) => {
  const isVias = roundType === 'ACCESO_PERIFERICO';

  let buttonText: string;
  let buttonBg: string;

  if (isVias) {
    if (hasCondition) {
      buttonText = 'Guardar Vía y +1 Cama';
      buttonBg = 'bg-sky-700 hover:bg-sky-800 shadow-sky-200 text-white';
    } else if (altType === 'acceso_central') {
      buttonText = 'Guardar (Acceso Central)';
      buttonBg = 'bg-indigo-700 hover:bg-indigo-800 shadow-indigo-200 text-white';
    } else if (altType === 'percutaneo') {
      buttonText = 'Guardar (Percutáneo)';
      buttonBg = 'bg-purple-700 hover:bg-purple-800 shadow-purple-200 text-white';
    } else {
      buttonText = 'Guardar (Sin Vía) y +1 Cama';
      buttonBg = 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 text-white';
    }
  } else {
    // UPP
    if (hasCondition) {
      buttonText = 'Guardar UPP y +1 Cama';
      buttonBg = 'bg-rose-700 hover:bg-rose-800 shadow-rose-200 text-white';
    } else {
      buttonText = 'Guardar (Piel Íntegra) y +1 Cama';
      buttonBg = 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 text-white';
    }
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 bg-white/90 backdrop-blur-xl border-t border-slate-200/80 shadow-[var(--shadow-elevated)] py-2.5 px-3 md:px-6 transition-[box-shadow,border-color] duration-[var(--duration-base)] ease-[var(--ease-standard)]">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-2.5">
        {/* Contexto compacto a la izquierda (visible en tablet/desktop o pequeño en móvil) */}
        <div className="hidden xs:flex flex-col min-w-0 pr-1">
          <span className="text-[10px] uppercase font-bold text-slate-500 leading-tight">
            Sec {sector} · Hab {habitacion}
          </span>
          <span className="text-xs font-black text-slate-800 truncate">
            Cama {cama}
          </span>
        </div>

        {/* Botón de Acción Primaria en la Zona del Pulgar */}
        <button
          type="submit"
          form={formId}
          onClick={() => {
            const form = document.getElementById(formId) as HTMLFormElement | null;
            if (form && !isSubmitting) {
              if (form.requestSubmit) {
                form.requestSubmit();
              } else {
                form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
              }
            }
          }}
          disabled={isSubmitting}
          className={`group flex-1 min-h-[50px] md:min-h-[54px] rounded-[var(--radius-md)] font-black text-sm md:text-base flex items-center justify-center gap-2 shadow-[var(--shadow-hover)] cursor-pointer transition-[transform,box-shadow,background-color,filter] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] hover:scale-[1.015] hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${buttonBg} disabled:opacity-60 disabled:hover:scale-100 disabled:hover:translate-y-0`}
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Guardando registro...</span>
            </>
          ) : (
            <>
              {hasCondition ? (
                <Save className="w-5 h-5 transition-transform duration-[var(--duration-fast)] ease-[var(--ease-standard)] group-hover:scale-110" />
              ) : (
                <CheckCircle className="w-5 h-5 transition-transform duration-[var(--duration-fast)] ease-[var(--ease-standard)] group-hover:scale-110" />
              )}
              <span>{buttonText}</span>
              <span className="text-[11px] bg-black/20 px-2 py-0.5 rounded-[var(--radius-sm)] font-mono hidden sm:inline">
                [Enter]
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
