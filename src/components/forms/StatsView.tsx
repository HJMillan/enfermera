import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronUp,
  Filter,
  RefreshCw,
  Settings,
  ShieldAlert,
  Syringe,
  Bandage,
  Building2,
  Droplets,
} from 'lucide-react';
import { SECTORS } from '../../config/sectorConfig';
import { getCurrentDateISO } from '../../utils/dateUtils';
import { getStoredWebhookUrl } from '../../services/storageService';
import { fetchSheetStatistics } from '../../services/webhookService';
import { APP_VERSION, SCRIPT_VERSION } from '../../config/version';
import type { StatsAlerta, StatsFilters, StatsPayload, StatsPreset, StatsRonda } from '../../types/stats';
import { CountTile, Donut, HBar, SectionHelp, StackedBar, pct } from './StatsCharts';

const FILTERS_KEY = 'pe_stats_filters_v1';
const PAYLOAD_CACHE_KEY = 'pe_stats_last_payload_v1';

interface CachedStats {
  filters: StatsFilters;
  payload: StatsPayload;
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(base: Date, delta: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + delta);
  return d;
}

function normalizeFilters(next: StatsFilters): StatsFilters {
  if (next.from && next.to && next.from > next.to) {
    return { ...next, from: next.to, to: next.from };
  }
  return next;
}

function defaultFilters(): StatsFilters {
  const today = getCurrentDateISO();
  return {
    preset: 'hoy',
    from: today,
    to: today,
    sector: '',
    ronda: 'ambas',
    evaluables: false,
    alertas: false,
    conVia: false,
    rotuloIncompleto: false,
    conUpp: false,
    bradenAlto: false,
  };
}

function applyPreset(preset: StatsPreset, current: StatsFilters): StatsFilters {
  const today = new Date();
  const todayIso = isoDate(today);
  if (preset === 'hoy') return { ...current, preset, from: todayIso, to: todayIso };
  if (preset === 'ayer') {
    const y = isoDate(addDays(today, -1));
    return { ...current, preset, from: y, to: y };
  }
  if (preset === '7d') return { ...current, preset, from: isoDate(addDays(today, -6)), to: todayIso };
  if (preset === 'mes') {
    return { ...current, preset, from: isoDate(new Date(today.getFullYear(), today.getMonth(), 1)), to: todayIso };
  }
  if (preset === 'todo') return { ...current, preset, from: '', to: '' };
  return { ...current, preset };
}

function loadSavedFilters(): StatsFilters {
  try {
    const raw = localStorage.getItem(FILTERS_KEY);
    if (!raw) return defaultFilters();
    const saved = { ...defaultFilters(), ...JSON.parse(raw) } as StatsFilters;
    if (saved.preset === 'hoy' || saved.preset === 'ayer' || saved.preset === '7d' || saved.preset === 'mes') {
      return applyPreset(saved.preset, saved);
    }
    return normalizeFilters(saved);
  } catch {
    return defaultFilters();
  }
}

function readPayloadCache(): CachedStats | null {
  try {
    const raw = localStorage.getItem(PAYLOAD_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedStats;
    if (parsed?.payload?.status === 'success' && parsed.payload.cobertura) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function writePayloadCache(filters: StatsFilters, payload: StatsPayload) {
  try {
    localStorage.setItem(PAYLOAD_CACHE_KEY, JSON.stringify({ filters, payload } satisfies CachedStats));
  } catch {
    /* quota / private mode */
  }
}

function formatRange(filters: StatsFilters): string {
  if (filters.preset === 'todo' || (!filters.from && !filters.to)) return 'Todo el archivo';
  if (filters.from && filters.to && filters.from === filters.to) {
    const [y, m, d] = filters.from.split('-');
    return `${d}/${m}/${y}`;
  }
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };
  if (filters.from && filters.to) return `${fmt(filters.from)} – ${fmt(filters.to)}`;
  if (filters.from) return `desde ${fmt(filters.from)}`;
  return `hasta ${fmt(filters.to)}`;
}

function sectorPerifDen(row: { viasEvaluables?: number; viasUnicas: number; noEvaluablesVias?: number }): number {
  if (typeof row.viasEvaluables === 'number') return row.viasEvaluables;
  return Math.max(0, row.viasUnicas - (row.noEvaluablesVias || 0));
}

const PRESETS: { id: StatsPreset; label: string }[] = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'ayer', label: 'Ayer' },
  { id: '7d', label: '7 días' },
  { id: 'mes', label: 'Este mes' },
  { id: 'rango', label: 'Elegir fechas' },
  { id: 'todo', label: 'Todo' },
];

const RONDAS: { id: StatsRonda; label: string }[] = [
  { id: 'ambas', label: 'Todas' },
  { id: 'vias', label: 'Solo vías' },
  { id: 'upp', label: 'Solo piel' },
  { id: 'sondas', label: 'Solo sondas' },
];

const VIA_UBIC: Record<string, string> = {
  MSD: 'Brazo derecho',
  MSI: 'Brazo izquierdo',
  MID: 'Pierna derecha',
  MII: 'Pierna izquierda',
};

const UPP_UBIC: Record<string, string> = {
  Sacra: 'Sacro',
  'Talón': 'Talón',
  'Glúteo': 'Glúteo',
  Posterior: 'Espalda',
  Otra: 'Otra zona',
};

const ALERT_HINT: Record<string, string> = {
  Infiltración: 'La vía se salió hacia el tejido',
  Eritema: 'La piel alrededor está enrojecida',
  'Rótulo incompleto': 'Falta fecha, nombre, legajo, turno o ABB',
  'LPP III-IV': 'Lesión profunda: hay que priorizarla',
  'UPP III-IV': 'Lesión profunda: hay que priorizarla',
  'Braden alto': 'Alto riesgo de que aparezca o empeore una úlcera',
};

const INFUSION_LABEL: Record<string, string> = {
  continua: 'Continua (todo el tiempo)',
  Continua: 'Continua (todo el tiempo)',
  intermitente: 'Intermitente (a ratos)',
  Intermitente: 'Intermitente (a ratos)',
};

const NUT_LABEL: Record<string, string> = {
  Oral: 'Come por boca',
  NPT: 'Nutrición por vena (NPT)',
  'Enteral SN': 'Sonda nasogástrica',
  'Enteral BG': 'Botón gástrico',
};

const DISP_LABEL: Record<string, string> = {
  Aro: 'Aro de alivio',
  'Guantes con agua': 'Guantes con agua',
  Otro: 'Otro apoyo',
};

const GRADO_HINT: Record<string, string> = {
  I: 'Enrojecimiento que no palidece',
  II: 'Ampolla o peladura',
  III: 'Pérdida de piel más profunda',
  IV: 'Llega a músculo o hueso',
};

function rename(label: string, dict: Record<string, string>): string {
  return dict[label] || label;
}

function displayAlertTipo(tipo: string): string {
  return tipo === 'UPP III-IV' ? 'LPP III-IV' : tipo;
}

function groupAlertas(items: StatsAlerta[]): { tipo: string; count: number; hint: string }[] {
  const map = new Map<string, number>();
  for (const a of items) {
    const tipo = displayAlertTipo(a.tipo);
    map.set(tipo, (map.get(tipo) || 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tipo, count]) => ({ tipo, count, hint: ALERT_HINT[tipo] || '' }));
}

const VIA_ALERTS = new Set(['Infiltración', 'Eritema', 'Rótulo incompleto']);
const LPP_ALERTS = new Set(['LPP III-IV', 'UPP III-IV', 'Braden alto']);

function alertasDeRonda(items: StatsAlerta[], ronda: StatsRonda): StatsAlerta[] {
  if (ronda === 'vias') return items.filter((a) => VIA_ALERTS.has(a.tipo));
  if (ronda === 'upp') return items.filter((a) => LPP_ALERTS.has(a.tipo));
  if (ronda === 'sondas') return [];
  return items;
}

interface StatsViewProps {
  hasWebhook?: boolean;
}

export const StatsView: React.FC<StatsViewProps> = ({ hasWebhook }) => {
  const [filters, setFilters] = useState<StatsFilters>(loadSavedFilters);
  const [showMore, setShowMore] = useState(false);
  const [data, setData] = useState<StatsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqIdRef = useRef(0);
  const webhookReady = hasWebhook ?? Boolean(getStoredWebhookUrl()?.trim());

  const extraCount = [
    filters.evaluables,
    filters.alertas,
    filters.conVia,
    filters.rotuloIncompleto,
    filters.conUpp,
    filters.bradenAlto,
  ].filter(Boolean).length;

  useEffect(() => {
    localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
  }, [filters]);

  const updateFilters = useCallback((patch: Partial<StatsFilters> | ((prev: StatsFilters) => StatsFilters)) => {
    setFilters((prev) => {
      const merged = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch };
      return normalizeFilters(merged);
    });
  }, []);

  const load = useCallback(async (nextFilters: StatsFilters) => {
    if (!getStoredWebhookUrl()?.trim()) {
      setError(null);
      return;
    }
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchSheetStatistics(nextFilters);
      if (reqId !== reqIdRef.current) return;
      setData(payload);
      writePayloadCache(nextFilters, payload);
    } catch (err) {
      if (reqId !== reqIdRef.current) return;
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las estadísticas.');
      setData((prev) => prev ?? readPayloadCache()?.payload ?? null);
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(filters);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [filters, load, webhookReady]);

  useEffect(() => {
    return () => {
      reqIdRef.current += 1;
    };
  }, []);

  const summary = useMemo(() => {
    const bits = [formatRange(filters)];
    bits.push(filters.sector ? `Sector ${filters.sector}` : 'Todos los sectores');
    if (filters.ronda === 'vias') bits.push('Solo vías');
    if (filters.ronda === 'upp') bits.push('Solo piel');
    if (filters.ronda === 'sondas') bits.push('Solo sondas');
    if (extraCount) bits.push(`${extraCount} filtro${extraCount > 1 ? 's' : ''} extra`);
    return bits.join(' · ');
  }, [filters, extraCount]);

  const showVias = filters.ronda === 'ambas' || filters.ronda === 'vias';
  const showUpp = filters.ronda === 'ambas' || filters.ronda === 'upp';
  const showSondas = filters.ronda === 'ambas' || filters.ronda === 'sondas';
  const vias = data?.vias;
  const upp = data?.upp;
  const sondas = data?.sondas;
  const cobertura = data?.cobertura;
  const showingStale = Boolean(error && data);
  const rotuloDen = vias ? vias.rotuloCompleto + vias.rotuloIncompleto : 0;
  const alertasVisibles = useMemo(
    () => alertasDeRonda(data?.alertas || [], filters.ronda),
    [data?.alertas, filters.ronda]
  );
  const alertasTotal =
    filters.ronda === 'ambas' ? (data?.alertasTotal ?? alertasVisibles.length) : alertasVisibles.length;
  const alertasShown = alertasVisibles.length;
  const alertasAgrupadas = useMemo(() => groupAlertas(alertasVisibles), [alertasVisibles]);
  const pielSana = upp ? Math.max(0, upp.evaluadas - upp.conUpp - (upp.noEvaluables || 0)) : 0;
  const bradenSinDato = upp
    ? Math.max(0, upp.conUpp - upp.bradenAlto - upp.bradenModerado - upp.bradenBajo)
    : 0;

  const lectura = useMemo(() => {
    const parts: string[] = [];
    if (showVias && vias && cobertura) {
      parts.push(
        `Se recorrieron ${cobertura.viasUnicas} cama${cobertura.viasUnicas === 1 ? '' : 's'} de vías.`
      );
      if (vias.conPeriferico) {
        parts.push(
          `${vias.conPeriferico} tienen catéter en el brazo o la pierna (${pct(vias.conPeriferico, vias.evaluadas)}%).`
        );
      }
      if (vias.rotuloIncompleto) {
        parts.push(`${vias.rotuloIncompleto} tienen el rótulo incompleto.`);
      }
      const clin = vias.infiltracion + vias.eritema;
      if (clin) parts.push(`${clin} con infiltración o enrojecimiento.`);
    }
    if (showUpp && upp && cobertura) {
      parts.push(
        `En piel se recorrieron ${cobertura.uppUnicas} cama${cobertura.uppUnicas === 1 ? '' : 's'}.`
      );
      parts.push(
        upp.conUpp
          ? `${upp.conUpp} ${upp.conUpp === 1 ? 'tiene' : 'tienen'} lesión por presión (LPP).`
          : 'Ninguna cama relevada tiene úlcera en este recorte.'
      );
      if (upp.bradenAlto) parts.push(`${upp.bradenAlto} con riesgo alto (Braden 12 o menos).`);
    }
    if (showSondas && sondas && cobertura) {
      const sondasUnicas = cobertura.sondasUnicas ?? sondas.evaluadas;
      parts.push(
        `En sondas se recorrieron ${sondasUnicas} cama${sondasUnicas === 1 ? '' : 's'}.`
      );
      parts.push(
        sondas.conSonda
          ? `${sondas.conSonda} ${sondas.conSonda === 1 ? 'tiene' : 'tienen'} sonda vesical.`
          : 'Ninguna cama relevada tiene sonda en este recorte.'
      );
    }
    if (alertasTotal) parts.push(`${alertasTotal} aviso${alertasTotal === 1 ? '' : 's'} para revisar.`);
    return parts.join(' ');
  }, [showVias, showUpp, showSondas, vias, upp, sondas, cobertura, alertasTotal]);

  if (!webhookReady) {
    return (
      <div className="px-3 pb-12 md:px-4 max-w-4xl mx-auto">
        <div className="bg-white p-6 rounded-[var(--radius-md)] border border-slate-200/80 shadow-[var(--shadow-rest)] text-center space-y-3">
          <BarChart3 className="w-10 h-10 text-slate-300 mx-auto" />
          <h2 className="font-extrabold text-slate-900 text-base">Estadísticas del archivo</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Los números salen del Google Sheet compartido, no de este celular. Pedile a quien configura la app que
            cargue la dirección del archivo en Ajustes.
          </p>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-800 bg-sky-50 px-3 py-1.5 rounded-[var(--radius-sm)] border border-sky-200">
            <Settings className="w-3.5 h-3.5" />
            Abrí el engranaje arriba a la derecha
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 pb-12 md:px-4 space-y-3.5 max-w-4xl mx-auto">
      <div className="bg-white p-4 rounded-[var(--radius-md)] border border-slate-200/80 shadow-[var(--shadow-rest)] space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-extrabold text-slate-900 text-base flex items-center gap-1.5">
              <BarChart3 className="w-5 h-5 text-sky-700" />
              Estadísticas de la ronda
            </h2>
            <p className="text-[11px] text-slate-600 font-medium">
              Datos del archivo de la ronda.
            </p>
            <p className="text-[11px] text-slate-500 font-medium">{summary}</p>
          </div>
          <button
            type="button"
            onClick={() => void load(filters)}
            disabled={loading}
            className="px-3 py-2 rounded-[var(--radius-sm)] bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-[var(--shadow-rest)] active:scale-[0.98] cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>

        <div>
          <span className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1 mb-1.5">
            <Calendar className="w-3.5 h-3.5" /> Fecha
          </span>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => updateFilters(applyPreset(p.id, filters))}
                className={`px-2.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold border cursor-pointer active:scale-[0.98] ${
                  filters.preset === p.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
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
                  onChange={(e) => updateFilters({ from: e.target.value, preset: 'rango' })}
                  className="mt-1 w-full min-h-[44px] px-3 rounded-[var(--radius-sm)] border border-slate-200 text-xs font-semibold bg-slate-50"
                />
              </label>
              <label className="text-[11px] font-bold text-slate-600">
                Hasta
                <input
                  type="date"
                  value={filters.to}
                  min={filters.from || undefined}
                  onChange={(e) => updateFilters({ to: e.target.value, preset: 'rango' })}
                  className="mt-1 w-full min-h-[44px] px-3 rounded-[var(--radius-sm)] border border-slate-200 text-xs font-semibold bg-slate-50"
                />
              </label>
            </div>
          )}
        </div>

        <div>
          <span className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1 mb-1.5">
            <Building2 className="w-3.5 h-3.5" /> Sector
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => updateFilters({ sector: '' })}
              className={`px-2.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold border cursor-pointer ${
                filters.sector === ''
                  ? 'bg-sky-700 text-white border-sky-700'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              Todos
            </button>
            {SECTORS.map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => updateFilters({ sector: sec })}
                className={`min-w-9 px-2.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold border cursor-pointer ${
                  filters.sector === sec
                    ? 'bg-sky-700 text-white border-sky-700'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                {sec}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-[11px] font-bold text-slate-600 uppercase mb-1.5 block">Qué ronda querés ver</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {RONDAS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => updateFilters({ ronda: r.id })}
                className={`py-2 rounded-[var(--radius-sm)] text-xs font-bold border cursor-pointer ${
                  filters.ronda === r.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="w-full flex items-center justify-between text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-[var(--radius-sm)] cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-sky-700" />
            Más filtros
            {extraCount > 0 && (
              <span className="bg-sky-700 text-white text-[10px] px-1.5 py-0.5 rounded-full">{extraCount}</span>
            )}
          </span>
          {showMore ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showMore && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {(
              [
                ['evaluables', 'Ocultar camas libres / ausentes'],
                ['alertas', 'Solo las que hay que revisar'],
                ['conVia', 'Con catéter periférico'],
                ['rotuloIncompleto', 'Rótulo incompleto'],
                ['conUpp', 'Con úlcera'],
                ['bradenAlto', 'Riesgo alto de úlcera'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => updateFilters({ [key]: !filters[key] })}
                className={`px-2.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold border cursor-pointer ${
                  filters[key]
                    ? 'bg-amber-500 text-white border-amber-600'
                    : 'bg-white text-slate-700 border-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => updateFilters(defaultFilters())}
              className="px-2.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold border border-slate-300 text-slate-600 cursor-pointer"
            >
              Limpiar
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-[var(--radius-md)] bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {error}
            {showingStale ? ' Se muestra la última lectura correcta.' : ''}
          </span>
        </div>
      )}

      {loading && !data && (
        <div className="bg-white p-8 rounded-[var(--radius-md)] border border-slate-200 text-center text-xs font-bold text-slate-600">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-700" />
          Leyendo el Google Sheet...
        </div>
      )}

      {data && cobertura && (
        <>
          <p className="text-[11px] text-slate-500 font-medium px-1">
            {showingStale ? 'Última lectura correcta' : 'Archivo leído'}
            {data.generatedAt ? ` ${data.generatedAt}` : ''}
            {loading ? ' · actualizando…' : ''}
            {' · '}app v{APP_VERSION}
            {data.version ? ` · script v${data.version}` : ' · script sin versión'}
          </p>
          {data.version && data.version !== SCRIPT_VERSION && (
            <p className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-[var(--radius-sm)] px-3 py-2">
              El script del Sheet es v{data.version} y esta app espera v{SCRIPT_VERSION}. Pegá el Code.gs
              actualizado e implementá una nueva versión.
            </p>
          )}
          {!data.version && (
            <p className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-[var(--radius-sm)] px-3 py-2">
              El script no informa versión. Pegá el Code.gs v{SCRIPT_VERSION} e implementá una nueva versión
              para Estadísticas.
            </p>
          )}

          {lectura && (
            <div className="bg-sky-50 border border-sky-100 rounded-[var(--radius-md)] px-3.5 py-3">
              <p className="text-[11px] font-bold text-sky-800 uppercase tracking-wide mb-1">Resumen</p>
              <p className="text-sm font-semibold text-sky-950 leading-relaxed">{lectura}</p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {showVias && (
              <CountTile
                label="Camas de vías"
                value={cobertura.viasUnicas}
                hint={`${cobertura.registrosVias} carga${cobertura.registrosVias === 1 ? '' : 's'} en el recorte`}
                tone="sky"
              />
            )}
            {showUpp && (
              <CountTile
                label="Camas de piel"
                value={cobertura.uppUnicas}
                hint={`${cobertura.registrosUpp} carga${cobertura.registrosUpp === 1 ? '' : 's'} en el recorte`}
                tone="rose"
              />
            )}
            {showSondas && (
              <CountTile
                label="Camas de sondas"
                value={cobertura.sondasUnicas ?? 0}
                hint={`${cobertura.registrosSondas ?? 0} carga${(cobertura.registrosSondas ?? 0) === 1 ? '' : 's'} en el recorte`}
                tone="sky"
              />
            )}
            <CountTile
              label="Hay que revisar"
              value={alertasTotal}
              hint={alertasTotal ? 'Vía complicada, rótulo o úlcera grave' : 'Nada urgente en este recorte'}
              tone={alertasTotal ? 'amber' : 'emerald'}
            />
            <CountTile
              label="Libres / ausentes"
              value={
                showVias && showUpp
                  ? `${cobertura.noEvaluablesVias} · ${cobertura.noEvaluablesUpp}`
                  : showVias
                    ? cobertura.noEvaluablesVias
                    : cobertura.noEvaluablesUpp
              }
              hint={showVias && showUpp ? 'Vías · Piel (quirófano, diálisis, libre…)' : 'Quirófano, diálisis, libre…'}
              tone="slate"
            />
          </div>

          {showVias && vias && (
            <section className="bg-white p-4 rounded-[var(--radius-md)] border border-slate-200/80 shadow-[var(--shadow-rest)] space-y-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <Syringe className="w-4 h-4 text-sky-700" />
                  Cómo están las vías
                </h3>
                <SectionHelp>
                  Una cama, un dato: si se cargó más de una vez, cuenta la última. El catéter periférico es el del brazo
                  o la pierna.
                </SectionHelp>
              </div>
              {vias.evaluadas === 0 ? (
                <p className="text-xs text-slate-600">No hay camas de vías en este recorte del archivo.</p>
              ) : (
                <div className="space-y-5">
                  <Donut
                    center={`${pct(vias.conPeriferico, vias.evaluadas)}%`}
                    sub="brazo o pierna"
                    slices={[
                      {
                        label: 'Catéter en brazo o pierna',
                        value: vias.conPeriferico,
                        color: '#0284c7',
                        hint: 'Acceso periférico',
                      },
                      {
                        label: 'Vía central',
                        value: vias.central,
                        color: '#4f46e5',
                        hint: 'No se evalúa como periférico',
                      },
                      { label: 'Percutáneo', value: vias.percutaneo, color: '#7c3aed' },
                      { label: 'Sin vía', value: vias.nada, color: '#94a3b8' },
                      { label: 'Libre / ausente', value: vias.noEvaluables || 0, color: '#f59e0b' },
                    ]}
                  />

                  {rotuloDen > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-extrabold text-slate-800">Rótulo de la vía</p>
                      <SectionHelp>Completo = fecha, nombre, legajo, turno y ABB.</SectionHelp>
                      <StackedBar
                        total={rotuloDen}
                        segments={[
                          { label: 'Completo', value: vias.rotuloCompleto, color: '#059669' },
                          { label: 'Falta algún dato', value: vias.rotuloIncompleto, color: '#d97706' },
                        ]}
                      />
                    </div>
                  )}

                  {vias.conPeriferico > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-extrabold text-slate-800">
                        {`Problemas del catéter (${vias.conPeriferico} periféricos)`}
                      </p>
                      <HBar
                        label="Infiltración (se salió al tejido)"
                        value={vias.infiltracion}
                        total={vias.conPeriferico}
                        color="#e11d48"
                      />
                      <HBar
                        label="Piel enrojecida alrededor"
                        value={vias.eritema}
                        total={vias.conPeriferico}
                        color="#f43f5e"
                      />
                      <HBar
                        label="Sin retorno de sangre"
                        value={vias.sinRetorno}
                        total={vias.conPeriferico}
                        color="#ea580c"
                      />
                      <HBar
                        label="No se ve el punto de punción"
                        value={vias.puncionNoVisible}
                        total={vias.conPeriferico}
                        color="#d97706"
                      />
                    </div>
                  )}

                  {vias.conPeriferico > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-extrabold text-slate-800">Cómo está pegada la curación</p>
                      <StackedBar
                        total={vias.conPeriferico}
                        segments={[
                          {
                            label: 'Bien adherida',
                            value: Math.max(
                              0,
                              vias.conPeriferico - vias.adherenciaParcial - vias.adherenciaNula
                            ),
                            color: '#059669',
                          },
                          { label: 'A medias', value: vias.adherenciaParcial, color: '#64748b' },
                          { label: 'No pega', value: vias.adherenciaNula, color: '#334155' },
                        ]}
                      />
                    </div>
                  )}

                  {vias.ubicaciones.some((u) => u.count > 0) && (
                    <div className="space-y-2">
                      <p className="text-xs font-extrabold text-slate-800">Dónde está el catéter</p>
                      {vias.ubicaciones
                        .filter((u) => u.count > 0)
                        .map((u) => (
                          <HBar
                            key={u.label}
                            label={rename(u.label, VIA_UBIC)}
                            value={u.count}
                            total={vias.conPeriferico}
                            color="#0369a1"
                          />
                        ))}
                    </div>
                  )}

                  {vias.infusiones.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-extrabold text-slate-800">Cómo corre el suero</p>
                      {vias.infusiones
                        .filter((t) => t.count > 0)
                        .map((t) => (
                          <HBar
                            key={t.label}
                            label={rename(t.label, INFUSION_LABEL)}
                            value={t.count}
                            total={vias.conPeriferico}
                            color="#0ea5e9"
                          />
                        ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {showUpp && upp && (
            <section className="bg-white p-4 rounded-[var(--radius-md)] border border-slate-200/80 shadow-[var(--shadow-rest)] space-y-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <Bandage className="w-4 h-4 text-rose-700" />
                  Cómo está la piel
                </h3>
                <SectionHelp>
                  LPP (lesión por presión) = daño de la piel por quedar mucho tiempo en la misma posición. Cuanto más
                  bajo el Braden, más riesgo (12 o menos es alto).
                </SectionHelp>
              </div>
              {upp.evaluadas === 0 ? (
                <p className="text-xs text-slate-600">No hay camas de piel en este recorte del archivo.</p>
              ) : (
                <div className="space-y-5">
                  <Donut
                    center={String(upp.conUpp)}
                    sub={upp.conUpp === 1 ? 'cama con úlcera' : 'camas con úlcera'}
                    slices={[
                      { label: 'Con úlcera', value: upp.conUpp, color: '#e11d48' },
                      { label: 'Piel sin úlcera', value: pielSana, color: '#059669' },
                      { label: 'Libre / ausente', value: upp.noEvaluables || 0, color: '#f59e0b' },
                    ]}
                  />

                  {upp.conUpp > 0 && (
                    <>
                      <div className="space-y-2">
                        <p className="text-xs font-extrabold text-slate-800">Qué tan profunda es</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {(['I', 'II', 'III', 'IV'] as const).map((g) => (
                            <div
                              key={g}
                              className="bg-rose-50 border border-rose-100 rounded-[var(--radius-sm)] p-2.5"
                            >
                              <span className="block text-[10px] font-extrabold text-rose-800">Grado {g}</span>
                              <span className="block text-xl font-black text-rose-950 tabular-nums">
                                {upp.grados[g]}
                              </span>
                              <span className="block text-[10px] font-medium text-rose-700 leading-tight">
                                {GRADO_HINT[g]}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-extrabold text-slate-800">Riesgo Braden (solo camas con úlcera)</p>
                        <StackedBar
                          total={upp.conUpp}
                          segments={[
                            { label: 'Alto (12 o menos)', value: upp.bradenAlto, color: '#be123c' },
                            { label: 'Moderado (13-14)', value: upp.bradenModerado, color: '#d97706' },
                            { label: 'Bajo (más de 14)', value: upp.bradenBajo, color: '#059669' },
                            { label: 'Sin puntaje', value: bradenSinDato, color: '#94a3b8' },
                          ]}
                        />
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-extrabold text-slate-800">Cuidados puestos</p>
                        <HBar
                          label="Ya está en tratamiento"
                          value={upp.conTratamiento}
                          total={upp.conUpp}
                          color="#059669"
                        />
                        <HBar
                          label="Pasó por área cerrada"
                          value={upp.areaCerrada}
                          total={upp.conUpp}
                          color="#475569"
                        />
                        <HBar
                          label="Colchón anti-escaras"
                          value={upp.colchonSi}
                          total={upp.conUpp}
                          color="#0284c7"
                        />
                      </div>
                    </>
                  )}

                  {upp.ubicaciones.some((u) => u.count > 0) && (
                    <div className="space-y-2">
                      <p className="text-xs font-extrabold text-slate-800">Dónde está la úlcera</p>
                      {upp.ubicaciones
                        .filter((u) => u.count > 0)
                        .map((u) => (
                          <HBar
                            key={u.label}
                            label={rename(u.label, UPP_UBIC)}
                            value={u.count}
                            total={upp.conUpp}
                            color="#be123c"
                          />
                        ))}
                    </div>
                  )}

                  {upp.tratamientos.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-extrabold text-slate-800">Qué curación se está usando</p>
                      {upp.tratamientos.map((t) => (
                        <HBar key={t.label} label={t.label} value={t.count} total={upp.conUpp} color="#fb7185" />
                      ))}
                    </div>
                  )}

                  {upp.dispositivos.some((d) => d.count > 0) && (
                    <div className="space-y-2">
                      <p className="text-xs font-extrabold text-slate-800">Apoyos para aliviar presión</p>
                      {upp.dispositivos
                        .filter((d) => d.count > 0)
                        .map((d) => (
                          <HBar
                            key={d.label}
                            label={rename(d.label, DISP_LABEL)}
                            value={d.count}
                            total={upp.conUpp}
                            color="#6366f1"
                          />
                        ))}
                    </div>
                  )}

                  {upp.nutricion.some((n) => n.count > 0) && (
                    <div className="space-y-2">
                      <p className="text-xs font-extrabold text-slate-800">Cómo se alimenta</p>
                      {upp.nutricion
                        .filter((n) => n.count > 0)
                        .map((n) => (
                          <HBar
                            key={n.label}
                            label={rename(n.label, NUT_LABEL)}
                            value={n.count}
                            total={upp.conUpp}
                            color="#10b981"
                          />
                        ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {showSondas && sondas && (
            <section className="bg-white p-4 rounded-[var(--radius-md)] border border-slate-200/80 shadow-[var(--shadow-rest)] space-y-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <Droplets className="w-4 h-4 text-teal-700" />
                  Cómo están las sondas
                </h3>
                <SectionHelp>
                  Una cama, un dato: si se cargó más de una vez, cuenta la última. Sin alerta por mail en esta ronda.
                </SectionHelp>
              </div>
              {sondas.evaluadas === 0 ? (
                <p className="text-xs text-slate-600">No hay camas de sondas en este recorte del archivo.</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <CountTile label="Con sonda" value={sondas.conSonda} tone="sky" />
                    <CountTile label="Sin sonda" value={sondas.sinSonda} tone="slate" />
                    <CountTile label="2 lúmenes" value={sondas.lumenes2} tone="emerald" />
                    <CountTile label="3 lúmenes" value={sondas.lumenes3} tone="amber" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <CountTile label="Con fijación" value={sondas.fijacionSi} hint="Sobre las que tienen sonda" tone="emerald" />
                    <CountTile
                      label="Ubicación no correcta"
                      value={sondas.ubicacionNo}
                      hint="Nefrectomía, Bricker o nada"
                      tone={sondas.ubicacionNo ? 'amber' : 'slate'}
                    />
                  </div>
                </div>
              )}
            </section>
          )}

          <section className="bg-white p-4 rounded-[var(--radius-md)] border border-slate-200/80 shadow-[var(--shadow-rest)] space-y-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Comparar sectores</h3>
              <SectionHelp>La barra llena = todas las camas recorridas de ese sector en este recorte.</SectionHelp>
            </div>
            <div className="space-y-3">
              {cobertura.porSector.every(
                (row) =>
                  row.viasUnicas === 0 &&
                  row.uppUnicas === 0 &&
                  (row.sondasUnicas ?? 0) === 0 &&
                  row.enfermeras === 0 &&
                  row.auxiliares === 0
              ) && (
                <p className="text-xs text-slate-600">Nadie cargó camas en este recorte.</p>
              )}
              {cobertura.porSector.map((row) => {
                const perifDen = sectorPerifDen(row);
                const empty =
                  row.viasUnicas === 0 &&
                  row.uppUnicas === 0 &&
                  (row.sondasUnicas ?? 0) === 0 &&
                  row.enfermeras === 0 &&
                  row.auxiliares === 0;
                if (empty) return null;
                return (
                  <div
                    key={row.sector}
                    className="rounded-[var(--radius-sm)] border border-slate-200 bg-slate-50/70 p-3 space-y-2"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-extrabold text-slate-900 text-sm">{row.sector}</p>
                      <p className="text-[11px] font-semibold text-slate-600">
                        {`${row.enfermeras} ${row.enfermeras === 1 ? 'enfermera' : 'enfermeras'} · ${row.auxiliares} ${row.auxiliares === 1 ? 'auxiliar' : 'auxiliares'}`}
                      </p>
                    </div>
                    {showVias && (
                      <HBar
                        label={`Catéter periférico (${row.conPeriferico} de ${perifDen || row.viasUnicas} evaluadas)`}
                        value={row.conPeriferico}
                        total={perifDen || row.viasUnicas}
                        color="#0284c7"
                      />
                    )}
                    {showVias && row.alertasVia > 0 && (
                      <HBar
                        label="Avisos de vía"
                        value={row.alertasVia}
                        total={Math.max(row.alertasVia, row.viasUnicas)}
                        color="#d97706"
                      />
                    )}
                    {showUpp && (
                      <HBar
                        label={`Con úlcera (${row.conUpp} de ${row.uppUnicas} camas)`}
                        value={row.conUpp}
                        total={row.uppUnicas}
                        color="#e11d48"
                      />
                    )}
                    {showUpp && row.bradenAlto > 0 && (
                      <HBar
                        label="Riesgo alto de úlcera"
                        value={row.bradenAlto}
                        total={row.uppUnicas || row.bradenAlto}
                        color="#be123c"
                      />
                    )}
                    {showSondas && (
                      <HBar
                        label={`Con sonda (${row.conSonda ?? 0} de ${row.sondasUnicas ?? 0} camas)`}
                        value={row.conSonda ?? 0}
                        total={row.sondasUnicas ?? 0}
                        color="#0f766e"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {alertasShown > 0 && (
            <section className="bg-white p-4 rounded-[var(--radius-md)] border border-slate-200/80 shadow-[var(--shadow-rest)] space-y-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  {`Qué hay que revisar (${alertasShown}${alertasTotal > alertasShown ? ` de ${alertasTotal}` : ''})`}
                </h3>
                <SectionHelp>Agrupado por tipo. La cama se muestra como sector · habitación · cama.</SectionHelp>
              </div>
              {alertasTotal > alertasShown && (
                <p className="text-[11px] text-slate-600">
                  Hay más en el archivo; se listan las primeras {alertasShown}.
                </p>
              )}
              {alertasAgrupadas.length > 0 && (
                <div className="space-y-2">
                  <StackedBar
                    total={alertasShown}
                    segments={alertasAgrupadas.map((g, i) => ({
                      label: g.tipo,
                      value: g.count,
                      color: ['#e11d48', '#d97706', '#ea580c', '#be123c', '#64748b'][i % 5],
                    }))}
                  />
                </div>
              )}
              <div className="space-y-3">
                {alertasAgrupadas.map((g) => (
                  <div key={g.tipo} className="space-y-1.5">
                    <div>
                      <p className="text-xs font-extrabold text-amber-950">
                        {g.tipo}{' '}
                        <span className="tabular-nums text-amber-800">
                          · {g.count}
                        </span>
                      </p>
                      {g.hint && <p className="text-[11px] font-medium text-slate-600">{g.hint}</p>}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(alertasVisibles)
                        .filter((a) => displayAlertTipo(a.tipo) === g.tipo)
                        .map((a, idx) => (
                          <span
                            key={`${a.tipo}-${a.sector}-${a.habitacion}-${a.cama}-${idx}`}
                            className="text-[11px] font-bold text-slate-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1"
                          >
                            {a.sector} · Hab {a.habitacion} · Cama {a.cama}
                          </span>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};
