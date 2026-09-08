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
      return 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300';
    }
    switch (color) {
      case 'danger':
        return 'bg-rose-600 border-rose-600 text-white shadow-sm shadow-rose-200';
      case 'warning':
        return 'bg-amber-500 border-amber-500 text-white shadow-sm shadow-amber-200';
      case 'success':
        return 'bg-emerald-600 border-emerald-600 text-white shadow-sm shadow-emerald-200';
      case 'primary':
      default:
        return 'bg-sky-600 border-sky-600 text-white shadow-sm shadow-sky-200';
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[48px] px-2 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border font-medium text-xs sm:text-sm transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer touch-active select-none w-full text-center ${getSelectedStyles()}`}
    >
      {icon && <span className="text-base flex items-center shrink-0">{icon}</span>}
      <div className="flex flex-col text-center leading-tight min-w-0 max-w-full">
        <span className="break-words">{label}</span>
        {subtitle && (
          <span className={`text-[10px] ${selected ? 'text-white/80' : 'text-slate-600'}`}>
            {subtitle}
          </span>
        )}
      </div>
    </button>
  );
};
