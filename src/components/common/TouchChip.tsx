import React from 'react';

interface TouchChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  subtitle?: string;
  color?: 'primary' | 'danger' | 'warning' | 'success';
}

export const TouchChip: React.FC<TouchChipProps> = ({
  label,
  selected,
  onClick,
  icon,
  subtitle,
  color = 'primary',
}) => {
  const getSelectedStyles = () => {
    if (!selected) {
      return 'bg-white border-slate-200 text-slate-700 shadow-[var(--shadow-rest)] hover:bg-slate-50 hover:border-slate-300 hover:shadow-[var(--shadow-hover)] hover:-translate-y-0.5 hover:scale-[1.015]';
    }
    switch (color) {
      case 'danger':
        return 'bg-rose-600 border-rose-600 text-white shadow-[var(--shadow-hover)] ring-2 ring-rose-300/60 hover:-translate-y-0.5 hover:scale-[1.015]';
      case 'warning':
        return 'bg-amber-500 border-amber-500 text-white shadow-[var(--shadow-hover)] ring-2 ring-amber-300/60 hover:-translate-y-0.5 hover:scale-[1.015]';
      case 'success':
        return 'bg-emerald-600 border-emerald-600 text-white shadow-[var(--shadow-hover)] ring-2 ring-emerald-300/60 hover:-translate-y-0.5 hover:scale-[1.015]';
      case 'primary':
      default:
        return 'bg-sky-600 border-sky-600 text-white shadow-[var(--shadow-hover)] ring-2 ring-sky-300/60 hover:-translate-y-0.5 hover:scale-[1.015]';
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group min-h-[48px] px-2 py-1.5 sm:px-3.5 sm:py-2 rounded-[var(--radius-sm)] border font-medium text-xs sm:text-sm transition-[transform,box-shadow,background-color,border-color,color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1 flex items-center justify-center gap-1.5 cursor-pointer select-none w-full text-center ${getSelectedStyles()}`}
    >
      {icon && (
        <span className="text-base flex items-center shrink-0 transition-transform duration-[var(--duration-fast)] ease-[var(--ease-standard)] group-hover:scale-105">
          {icon}
        </span>
      )}
      <div className="flex flex-col text-center leading-tight min-w-0 max-w-full">
        <span className="break-words">{label}</span>
        {subtitle && (
          <span className={`text-[10px] ${selected ? 'text-white/85' : 'text-slate-500'}`}>
            {subtitle}
          </span>
        )}
      </div>
    </button>
  );
};
