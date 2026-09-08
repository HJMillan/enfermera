import React from 'react';
import { Syringe, Bandage, ClipboardList } from 'lucide-react';
import type { FormType } from '../../types/form';

export type ActiveTab = FormType | 'HISTORY';

interface ModuleTabsProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  viasCount: number;
  uppCount: number;
  historyCount: number;
  pendingCount: number;
}

export const ModuleTabs: React.FC<ModuleTabsProps> = ({
  activeTab,
  onSelectTab,
  viasCount,
  uppCount,
  historyCount,
  pendingCount,
}) => {
  return (
    <div className="bg-slate-200/80 p-1 rounded-2xl mx-3 my-2 md:mx-4 flex gap-1 border border-slate-300/80 shadow-inner">
      <button
        type="button"
        onClick={() => onSelectTab('ACCESO_PERIFERICO')}
        className={`flex-1 min-h-[46px] py-2 px-2 rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-1.5 transition-all touch-active cursor-pointer ${
          activeTab === 'ACCESO_PERIFERICO'
            ? 'bg-white text-sky-800 shadow-sm border border-slate-200 ring-2 ring-sky-500/20'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
        }`}
      >
        <Syringe className={`w-4 h-4 shrink-0 ${activeTab === 'ACCESO_PERIFERICO' ? 'text-sky-700' : 'text-slate-600'}`} />
        <span className="truncate"><span className="hidden sm:inline">Ronda 1: </span>Vías</span>
        {viasCount > 0 && (
          <span className="ml-1 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-sky-100 text-sky-800 shrink-0">
            {viasCount}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => onSelectTab('UPP')}
        className={`flex-1 min-h-[46px] py-2 px-1.5 rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-1 transition-all touch-active cursor-pointer ${
          activeTab === 'UPP'
            ? 'bg-white text-rose-800 shadow-sm border border-slate-200 ring-2 ring-rose-500/20'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
        }`}
      >
        <Bandage className={`w-4 h-4 shrink-0 ${activeTab === 'UPP' ? 'text-rose-700' : 'text-slate-600'}`} />
        <span className="truncate"><span className="hidden sm:inline">Ronda 2: </span>UPP</span>
        {uppCount > 0 && (
          <span className="ml-1 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 shrink-0">
            {uppCount}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => onSelectTab('HISTORY')}
        className={`relative flex-1 min-h-[46px] py-2 px-2 rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-1.5 transition-all touch-active cursor-pointer ${
          activeTab === 'HISTORY'
            ? 'bg-white text-slate-900 shadow-sm border border-slate-200 ring-2 ring-slate-500/20'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
        }`}
      >
        <ClipboardList className="w-4 h-4 text-slate-600" />
        <span className="truncate">Historial</span>

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
