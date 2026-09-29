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

interface TabDef {
  id: ActiveTab;
  label: string;
  icon: typeof Syringe;
  activeTone: string;
  iconTone: string;
  badgeTone: string;
  count?: number;
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
  const tabs: TabDef[] = [
    { id: 'ACCESO_PERIFERICO', label: 'Vías', icon: Syringe, activeTone: 'text-sky-900 ring-sky-500/20', iconTone: 'text-sky-700', badgeTone: 'bg-sky-100 text-sky-800', count: viasCount },
    { id: 'UPP', label: 'LPP', icon: Bandage, activeTone: 'text-rose-900 ring-rose-500/20', iconTone: 'text-rose-700', badgeTone: 'bg-rose-100 text-rose-800', count: uppCount },
    { id: 'SONDA_VESICAL', label: 'Sondas', icon: Droplets, activeTone: 'text-teal-900 ring-teal-500/20', iconTone: 'text-teal-700', badgeTone: 'bg-teal-100 text-teal-800', count: sondaCount },
    { id: 'STATS', label: 'Estadísticas', icon: BarChart3, activeTone: 'text-indigo-950 ring-indigo-500/20', iconTone: 'text-indigo-700', badgeTone: '' },
    {
      id: 'HISTORY',
      label: 'Hist.',
      icon: ClipboardList,
      activeTone: 'text-slate-900 ring-slate-500/20',
      iconTone: 'text-slate-900',
      badgeTone: pendingCount > 0 ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700',
      count: historyCount,
    },
  ];

  return (
    <nav
      aria-label="Rondas"
      className="bg-slate-200/70 p-1 rounded-[var(--radius-sm)] mx-3 my-2 md:mx-4 flex gap-1 border border-slate-300/60 shadow-inner"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            aria-current={active ? 'page' : undefined}
            aria-label={tab.id === 'HISTORY' && pendingCount > 0 ? `Historial, ${pendingCount} sin confirmar` : undefined}
            className={`flex-1 min-w-0 min-h-[54px] sm:min-h-[46px] py-1.5 sm:py-2 px-0.5 sm:px-1 rounded-[calc(var(--radius-sm)-4px)] text-[10px] sm:text-[11px] md:text-sm leading-tight font-bold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 transition-[transform,box-shadow,background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] cursor-pointer ${
              active
                ? `bg-white shadow-[var(--shadow-rest)] border border-slate-200/90 ring-2 ${tab.activeTone}`
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <Icon className={`w-4 h-4 shrink-0 ${active ? tab.iconTone : 'text-slate-600'}`} />
            <span className="inline-flex items-center gap-0.5">
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0 ${tab.badgeTone}`}>{tab.count}</span>
              )}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
