import React from 'react';
import { Check, X } from 'lucide-react';

interface ToggleYesNoProps {
  label?: string;
  description?: string;
  value: boolean | undefined;
  onChange: (val: boolean) => void;
  yesText?: string;
  noText?: string;
}

export const ToggleYesNo: React.FC<ToggleYesNoProps> = ({
  label,
  description,
  value,
  onChange,
  yesText = 'SÍ',
  noText = 'NO',
}) => {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {(label || description) && (
        <div className="flex flex-col">
          {label && <span className="font-semibold text-slate-800 text-sm md:text-base">{label}</span>}
          {description && <span className="text-xs text-slate-600">{description}</span>}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2.5 w-full">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`group min-h-[50px] rounded-[var(--radius-sm)] font-bold text-base flex items-center justify-center gap-2 border-2 transition-[transform,box-shadow,background-color,border-color,color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 ${
            value === true
              ? 'bg-emerald-600 border-emerald-600 text-white shadow-[var(--shadow-hover)] ring-2 ring-emerald-300/70 hover:scale-[1.015] hover:-translate-y-0.5'
              : 'bg-white border-slate-200 text-slate-700 shadow-[var(--shadow-rest)] hover:bg-slate-50 hover:border-slate-300 hover:shadow-[var(--shadow-hover)] hover:-translate-y-0.5'
          }`}
        >
          <Check className={`w-5 h-5 transition-transform duration-[var(--duration-fast)] ease-[var(--ease-standard)] group-hover:scale-110 ${value === true ? 'text-white stroke-[3]' : 'text-slate-600'}`} />
          <span>{yesText}</span>
        </button>

        <button
          type="button"
          onClick={() => onChange(false)}
          className={`group min-h-[50px] rounded-[var(--radius-sm)] font-bold text-base flex items-center justify-center gap-2 border-2 transition-[transform,box-shadow,background-color,border-color,color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-1 ${
            value === false
              ? 'bg-rose-600 border-rose-600 text-white shadow-[var(--shadow-hover)] ring-2 ring-rose-300/70 hover:scale-[1.015] hover:-translate-y-0.5'
              : 'bg-white border-slate-200 text-slate-700 shadow-[var(--shadow-rest)] hover:bg-slate-50 hover:border-slate-300 hover:shadow-[var(--shadow-hover)] hover:-translate-y-0.5'
          }`}
        >
          <X className={`w-5 h-5 transition-transform duration-[var(--duration-fast)] ease-[var(--ease-standard)] group-hover:scale-110 ${value === false ? 'text-white stroke-[3]' : 'text-slate-600'}`} />
          <span>{noText}</span>
        </button>
      </div>
    </div>
  );
};
