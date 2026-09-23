import React from 'react';
import { Syringe, Bandage, ClipboardList, BarChart3, Droplets } from 'lucide-react';
import type { FormType } from '../../types/form';

export type ActiveTab = FormType | 'HISTORY' | 'STATS';

interface ModuleTabsProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  viasCount: number;
  uppCount: number;
  sondaCount: number;
  historyCount: number;
  pendingCount: number;
}

export const ModuleTabs: React.FC<ModuleTabsProps> = ({
  activeTab,
  onSelectTab,
  viasCount,
  uppCount,
  sondaCount,
  historyCount,
  pendingCount,
}) => {
  return (
    <div className="bg-slate-200/70 p-1 rounded-[var(--radius-sm)] mx-3 my-2 md:mx-4 flex gap-1 border border-slate-300/60 shadow-inner overflow-x-auto scrollbar-none">
      <button
        type="button"
        onClick={() => onSelectTab('ACCESO_PERIFERICO')}
        className={`flex-1 min-h-[46px] py-2 px-1 rounded-[calc(var(--radius-sm)-4px)] text-[11px] md:text-sm font-bold flex items-center justify-center gap-1 transition-[transform,box-shadow,background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] cursor-pointer ${
          activeTab === 'ACCESO_PERIFERICO'
            ? 'bg-white text-sky-900 shadow-[var(--shadow-rest)] border border-slate-200/90 ring-2 ring-sky-500/20'
            : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
        }`}
      >
        <Syringe className={`w-4 h-4 shrink-0 ${activeTab === 'ACCESO_PERIFERICO' ? 'text-sky-700' : 'text-slate-600'}`} />
        <span className="truncate">Vías</span>
        {viasCount > 0 && (
          <span className="ml-0.5 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-sky-100 text-sky-800 shrink-0">
            {viasCount}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => onSelectTab('UPP')}
        className={`flex-1 min-h-[46px] py-2 px-1 rounded-[calc(var(--radius-sm)-4px)] text-[11px] md:text-sm font-bold flex items-center justify-center gap-1 transition-[transform,box-shadow,background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] cursor-pointer ${
          activeTab === 'UPP'
            ? 'bg-white text-rose-900 shadow-[var(--shadow-rest)] border border-slate-200/90 ring-2 ring-rose-500/20'
            : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
        }`}
      >
        <Bandage className={`w-4 h-4 shrink-0 ${activeTab === 'UPP' ? 'text-rose-700' : 'text-slate-600'}`} />
        <span className="truncate">LPP</span>
        {uppCount > 0 && (
          <span className="ml-0.5 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 shrink-0">
            {uppCount}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => onSelectTab('SONDA_VESICAL')}
        className={`flex-1 min-h-[46px] py-2 px-1 rounded-[calc(var(--radius-sm)-4px)] text-[11px] md:text-sm font-bold flex items-center justify-center gap-1 transition-[transform,box-shadow,background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] cursor-pointer ${
          activeTab === 'SONDA_VESICAL'
            ? 'bg-white text-teal-900 shadow-[var(--shadow-rest)] border border-slate-200/90 ring-2 ring-teal-500/20'
            : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
        }`}
      >
        <Droplets className={`w-4 h-4 shrink-0 ${activeTab === 'SONDA_VESICAL' ? 'text-teal-700' : 'text-slate-600'}`} />
        <span className="truncate">Sondas</span>
        {sondaCount > 0 && (
          <span className="ml-0.5 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-teal-100 text-teal-800 shrink-0">
            {sondaCount}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => onSelectTab('STATS')}
        className={`flex-1 min-h-[46px] py-2 px-1 rounded-[calc(var(--radius-sm)-4px)] text-[11px] md:text-sm font-bold flex items-center justify-center gap-1 transition-[transform,box-shadow,background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] cursor-pointer ${
          activeTab === 'STATS'
            ? 'bg-white text-indigo-950 shadow-[var(--shadow-rest)] border border-slate-200/90 ring-2 ring-indigo-500/20'
            : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
        }`}
      >
        <BarChart3 className={`w-4 h-4 shrink-0 ${activeTab === 'STATS' ? 'text-indigo-700' : 'text-slate-600'}`} />
        <span className="truncate">Estadísticas</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectTab('HISTORY')}
        className={`relative flex-1 min-h-[46px] py-2 px-1 rounded-[calc(var(--radius-sm)-4px)] text-[11px] md:text-sm font-bold flex items-center justify-center gap-1 transition-[transform,box-shadow,background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] cursor-pointer ${
          activeTab === 'HISTORY'
            ? 'bg-white text-slate-900 shadow-[var(--shadow-rest)] border border-slate-200/90 ring-2 ring-slate-500/20'
            : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
        }`}
      >
        <ClipboardList className={`w-4 h-4 shrink-0 ${activeTab === 'HISTORY' ? 'text-slate-900' : 'text-slate-600'}`} />
        <span className="truncate">Hist.</span>

        {historyCount > 0 && (
          <span
            className={`ml-0.5 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
              pendingCount > 0 ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {historyCount}
          </span>
        )}
      </button>
    </div>
  );
};
