import { useState } from 'react';
import { BarChart3, Building2, Calendar, ChevronDown, ChevronUp, Filter, RefreshCw } from 'lucide-react';
import type { StatsFilters } from '../../types/stats';
import { SECTORS } from '../../config/sectorConfig';
import { EXTRA_FILTERS, EXTRA_FILTER_LABELS, PRESETS, RONDAS, applyPreset } from './statsUtils';

interface StatsFiltersPanelProps {
  filters: StatsFilters;
  summary: string;
  extraCount: number;
  loading: boolean;
  onChange: (patch: Partial<StatsFilters> | ((prev: StatsFilters) => StatsFilters)) => void;
  onRefresh: () => void;
}

const chip = (active: boolean, activeClass: string) =>
  `px-2.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold border cursor-pointer active:scale-[0.98] ${
    active ? activeClass : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
  }`;

export function StatsFiltersPanel({ filters, summary, extraCount, loading, onChange, onRefresh }: StatsFiltersPanelProps) {
  const [showMore, setShowMore] = useState(false);

  return (
    <div className="bg-white p-4 rounded-[var(--radius-md)] border border-slate-200/80 shadow-[var(--shadow-rest)] space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-extrabold text-slate-900 text-base flex items-center gap-1.5">
            <BarChart3 className="w-5 h-5 text-sky-700" />
            Estadísticas de la ronda
          </h2>
          <p className="text-[11px] text-slate-600 font-medium">Datos del archivo de la ronda.</p>
          <p className="text-[11px] text-slate-500 font-medium">{summary}</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="px-3 py-2 rounded-[var(--radius-sm)] bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-[var(--shadow-rest)] active:scale-[0.98] cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      <div role="group" aria-labelledby="stats-fecha">
        <span id="stats-fecha" className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1 mb-1.5">
          <Calendar className="w-3.5 h-3.5" /> Fecha
        </span>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={filters.preset === p.id}
              onClick={() => onChange((prev) => applyPreset(p.id, prev))}
              className={chip(filters.preset === p.id, 'bg-slate-900 text-white border-slate-900')}
            >
              {p.label}
            </button>
          ))}
        </div>
        {filters.preset === 'rango' && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <label className="text-[11px] font-bold text-slate-600">
              Desde
              <input
                type="date"
                value={filters.from}
                max={filters.to || undefined}
                onChange={(e) => onChange({ from: e.target.value, preset: 'rango' })}
                className="mt-1 w-full min-h-[44px] px-3 rounded-[var(--radius-sm)] border border-slate-200 text-xs font-semibold bg-slate-50"
              />
            </label>
            <label className="text-[11px] font-bold text-slate-600">
              Hasta
              <input
                type="date"
                value={filters.to}
                min={filters.from || undefined}
                onChange={(e) => onChange({ to: e.target.value, preset: 'rango' })}
                className="mt-1 w-full min-h-[44px] px-3 rounded-[var(--radius-sm)] border border-slate-200 text-xs font-semibold bg-slate-50"
              />
            </label>
          </div>
        )}
      </div>

      <div role="group" aria-labelledby="stats-sector">
        <span id="stats-sector" className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1 mb-1.5">
          <Building2 className="w-3.5 h-3.5" /> Sector
        </span>
        <div className="flex flex-wrap gap-1.5">
          {['', ...SECTORS].map((sec) => (
            <button
              key={sec || 'todos'}
              type="button"
              aria-pressed={filters.sector === sec}
              onClick={() => onChange({ sector: sec })}
              className={`min-w-9 ${chip(filters.sector === sec, 'bg-sky-700 text-white border-sky-700')}`}
            >
              {sec || 'Todos'}
            </button>
          ))}
        </div>
      </div>

      <div role="group" aria-labelledby="stats-ronda">
        <span id="stats-ronda" className="text-[11px] font-bold text-slate-600 uppercase mb-1.5 block">
          Qué ronda querés ver
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {RONDAS.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={filters.ronda === r.id}
              onClick={() => onChange({ ronda: r.id })}
              className={`py-2 ${chip(filters.ronda === r.id, 'bg-slate-900 text-white border-slate-900')}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowMore((v) => !v)}
        aria-expanded={showMore}
        aria-controls="stats-more-filters"
        className="w-full flex items-center justify-between text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-[var(--radius-sm)] cursor-pointer"
      >
        <span className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-sky-700" />
          Más filtros
          {extraCount > 0 && <span className="bg-sky-700 text-white text-[10px] px-1.5 py-0.5 rounded-full">{extraCount}</span>}
        </span>
        {showMore ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {showMore && (
        <div id="stats-more-filters" className="flex flex-wrap gap-1.5 pt-1">
          {EXTRA_FILTER_LABELS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={filters[key]}
              onClick={() => onChange((prev) => ({ ...prev, [key]: !prev[key] }))}
              className={`px-2.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold border cursor-pointer ${
                filters[key] ? 'bg-amber-500 text-white border-amber-600' : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChange(EXTRA_FILTERS)}
            className="px-2.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold border border-slate-300 text-slate-600 cursor-pointer"
          >
            Limpiar filtros extra
          </button>
        </div>
      )}
    </div>
  );
}
