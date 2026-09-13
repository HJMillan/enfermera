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
    <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl py-2.5 px-3 md:px-6">
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
          className={`flex-1 min-h-[50px] md:min-h-[54px] rounded-2xl font-black text-sm md:text-base flex items-center justify-center gap-2 shadow-lg touch-active cursor-pointer transition-all ${buttonBg} disabled:opacity-60`}
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Guardando registro...</span>
            </>
          ) : (
            <>
              {hasCondition ? <Save className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
              <span>{buttonText}</span>
              <span className="text-[11px] bg-black/20 px-2 py-0.5 rounded font-mono hidden sm:inline">
                [Enter]
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
