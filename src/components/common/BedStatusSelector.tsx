import React from 'react';
import { ChevronDown, Hotel, X } from 'lucide-react';
import { BED_STATUS_OPTIONS } from '../../config/bedStatus';

interface BedStatusSelectorProps {
  value: string;
  onChange: (status: string) => void;
  cama: string;
  habitacion: string;
}

export const BedStatusSelector: React.FC<BedStatusSelectorProps> = ({
  value,
  onChange,
  cama,
  habitacion,
}) => {
  const isSpecialStatus = Boolean(value);

  return (
    <div
      className={`rounded-2xl border p-3 md:p-3.5 transition-all shadow-xs ${
        isSpecialStatus
          ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-200/60'
          : 'bg-white border-slate-200'
      }`}
    >
      {/* Encabezado con Identificación de Cama y Estado */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Hotel className={`w-4 h-4 shrink-0 ${isSpecialStatus ? 'text-amber-600' : 'text-sky-700'}`} />
          <span className="text-xs font-bold text-slate-700 truncate">
            Estado de la Cama <strong className="text-slate-900 font-extrabold">{cama}</strong> (Hab {habitacion})
          </span>
        </div>

        {isSpecialStatus && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-[11px] font-bold text-amber-800 hover:text-rose-700 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-2 py-0.5 rounded-lg flex items-center gap-1 touch-active cursor-pointer transition-all shrink-0"
            title="Restablecer a Paciente en Cama"
          >
            <X className="w-3 h-3" />
            <span>Restablecer</span>
          </button>
        )}
      </div>

      {/* Control Dropdown (Mobile y Desktop) */}
      <div className="relative w-full">
        <select
          id="bed-status-select"
          aria-label="Seleccionar estado de la cama"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full min-h-[46px] pl-3.5 pr-10 rounded-xl text-xs sm:text-sm font-bold appearance-none outline-none cursor-pointer transition-all border ${
            isSpecialStatus
              ? 'bg-amber-100/70 border-amber-400 text-amber-950 focus:ring-2 focus:ring-amber-300'
              : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
          }`}
        >
          {BED_STATUS_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id} className="bg-white text-slate-900 font-medium py-1">
              {opt.label}
            </option>
          ))}
        </select>

        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 flex items-center">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      {/* Botones de Acceso Rápido de 1 Toque (Desktop y Mobile scroll) */}
      <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        <span className="text-[10px] uppercase font-bold text-slate-600 shrink-0 mr-0.5">
          Atajos:
        </span>
        {BED_STATUS_OPTIONS.filter((opt) => opt.id !== '').map((opt) => {
          const isSelected = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(isSelected ? '' : opt.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap border transition-all flex items-center gap-1 touch-active cursor-pointer shrink-0 ${
                isSelected
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <span>{opt.icon}</span>
              <span>{opt.id}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
