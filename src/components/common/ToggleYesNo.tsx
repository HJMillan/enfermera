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
          className={`min-h-[50px] rounded-xl font-bold text-base flex items-center justify-center gap-2 border-2 transition-all duration-150 touch-active cursor-pointer ${
            value === true
              ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-200 ring-2 ring-emerald-300 ring-offset-1'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Check className={`w-5 h-5 ${value === true ? 'text-white stroke-[3]' : 'text-slate-600'}`} />
          <span>{yesText}</span>
        </button>

        <button
          type="button"
          onClick={() => onChange(false)}
          className={`min-h-[50px] rounded-xl font-bold text-base flex items-center justify-center gap-2 border-2 transition-all duration-150 touch-active cursor-pointer ${
            value === false
              ? 'bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-200 ring-2 ring-rose-300 ring-offset-1'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <X className={`w-5 h-5 ${value === false ? 'text-white stroke-[3]' : 'text-slate-600'}`} />
          <span>{noText}</span>
        </button>
      </div>
    </div>
  );
};
