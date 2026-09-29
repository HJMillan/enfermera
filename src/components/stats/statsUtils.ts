import type { StatsAlerta, StatsFilters, StatsPayload, StatsPreset, StatsRonda } from '../../types/stats';
import { localDateISO } from '../../utils/dateUtils';
import { BRADEN } from '../../config/clinical';

export function pct(n: number, d: number): number {
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

const FILTERS_KEY = 'pe_stats_filters_v1';
const PAYLOAD_CACHE_KEY = 'pe_stats_last_payload_v1';

function addDays(base: Date, delta: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + delta);
  return d;
}

export function normalizeFilters(next: StatsFilters): StatsFilters {
  if (next.from && next.to && next.from > next.to) {
    return { ...next, from: next.to, to: next.from };
  }
  return next;
}

export const EXTRA_FILTERS = {
  evaluables: false,
  alertas: false,
  conVia: false,
  rotuloIncompleto: false,
  conUpp: false,
  bradenAlto: false,
};

export function defaultFilters(): StatsFilters {
  const today = localDateISO();
  return { preset: 'hoy', from: today, to: today, sector: '', ronda: 'ambas', ...EXTRA_FILTERS };
}

/** Presets que dependen de la fecha de hoy y hay que recalcular si cambia el día. */
export const RELATIVE_PRESETS: StatsPreset[] = ['hoy', 'ayer', '7d', 'mes'];

export function applyPreset(preset: StatsPreset, current: StatsFilters): StatsFilters {
  const today = new Date();
  const todayIso = localDateISO(today);
  if (preset === 'hoy') return { ...current, preset, from: todayIso, to: todayIso };
  if (preset === 'ayer') {
    const y = localDateISO(addDays(today, -1));
    return { ...current, preset, from: y, to: y };
  }
  if (preset === '7d') return { ...current, preset, from: localDateISO(addDays(today, -6)), to: todayIso };
  if (preset === 'mes') {
    return { ...current, preset, from: localDateISO(new Date(today.getFullYear(), today.getMonth(), 1)), to: todayIso };
  }
  if (preset === 'todo') return { ...current, preset, from: '', to: '' };
  return { ...current, preset };
}

export function loadSavedFilters(): StatsFilters {
  try {
    const raw = localStorage.getItem(FILTERS_KEY);
    if (!raw) return defaultFilters();
    const saved = { ...defaultFilters(), ...JSON.parse(raw) } as StatsFilters;
    if (RELATIVE_PRESETS.includes(saved.preset)) return applyPreset(saved.preset, saved);
    return normalizeFilters(saved);
  } catch {
    return defaultFilters();
  }
}

export function saveFilters(filters: StatsFilters): void {
  try {
    localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
  } catch {
    // modo privado o sin espacio: los filtros no se recuerdan
  }
}

/** Identifica la consulta al Sheet (el preset no importa, sí las fechas resueltas). */
export function filtersKey(f: StatsFilters): string {
  return JSON.stringify([f.from, f.to, f.sector, f.ronda, f.evaluables, f.alertas, f.conVia, f.rotuloIncompleto, f.conUpp, f.bradenAlto]);
}

interface CachedStats {
  key: string;
  payload: StatsPayload;
}

/** Última lectura correcta, solo si corresponde exactamente a estos filtros. */
export function readPayloadCache(filters: StatsFilters): StatsPayload | null {
  try {
    const raw = localStorage.getItem(PAYLOAD_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedStats;
    if (parsed?.key === filtersKey(filters) && parsed.payload?.status === 'success' && parsed.payload.cobertura) {
      return parsed.payload;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function writePayloadCache(filters: StatsFilters, payload: StatsPayload): void {
  try {
    localStorage.setItem(PAYLOAD_CACHE_KEY, JSON.stringify({ key: filtersKey(filters), payload } satisfies CachedStats));
  } catch {
    /* quota / private mode */
  }
}

const fmtIso = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

export function formatRange(filters: StatsFilters): string {
  if (filters.preset === 'todo' || (!filters.from && !filters.to)) return 'Todo el archivo';
  if (filters.from && filters.to && filters.from === filters.to) return fmtIso(filters.from);
  if (filters.from && filters.to) return `${fmtIso(filters.from)} – ${fmtIso(filters.to)}`;
  if (filters.from) return `desde ${fmtIso(filters.from)}`;
  return `hasta ${fmtIso(filters.to)}`;
}

export const PRESETS: { id: StatsPreset; label: string }[] = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'ayer', label: 'Ayer' },
  { id: '7d', label: '7 días' },
  { id: 'mes', label: 'Este mes' },
  { id: 'rango', label: 'Elegir fechas' },
  { id: 'todo', label: 'Todo' },
];

export const RONDAS: { id: StatsRonda; label: string }[] = [
  { id: 'ambas', label: 'Todas' },
  { id: 'vias', label: 'Solo vías' },
  { id: 'upp', label: 'Solo piel' },
  { id: 'sondas', label: 'Solo sondas' },
];

export const EXTRA_FILTER_LABELS: [keyof typeof EXTRA_FILTERS, string][] = [
  ['evaluables', 'Ocultar camas libres / ausentes'],
  ['alertas', 'Solo las que hay que revisar'],
  ['conVia', 'Con catéter periférico'],
  ['rotuloIncompleto', 'Rótulo incompleto'],
  ['conUpp', 'Con úlcera'],
  ['bradenAlto', 'Riesgo alto de úlcera'],
];

export const VIA_UBIC: Record<string, string> = {
  MSD: 'Brazo derecho',
  MSI: 'Brazo izquierdo',
  MID: 'Pierna derecha',
  MII: 'Pierna izquierda',
};

export const UPP_UBIC: Record<string, string> = {
  Sacra: 'Sacro',
  'Talón': 'Talón',
  'Glúteo': 'Glúteo',
  Posterior: 'Espalda',
  Otra: 'Otra zona',
};

export const INFUSION_LABEL: Record<string, string> = {
  continua: 'Continua (todo el tiempo)',
  Continua: 'Continua (todo el tiempo)',
  intermitente: 'Intermitente (a ratos)',
  Intermitente: 'Intermitente (a ratos)',
};

export const NUT_LABEL: Record<string, string> = {
  Oral: 'Come por boca',
  NPT: 'Nutrición por vena (NPT)',
  'Enteral SN': 'Sonda nasogástrica',
  'Enteral BG': 'Botón gástrico',
};

export const DISP_LABEL: Record<string, string> = {
  Aro: 'Aro de alivio',
  'Guantes con agua': 'Guantes con agua',
  Otro: 'Otro apoyo',
};

export const GRADO_HINT: Record<string, string> = {
  I: 'Enrojecimiento que no palidece',
  II: 'Ampolla o peladura',
  III: 'Pérdida de piel más profunda',
  IV: 'Llega a músculo o hueso',
};

export const BRADEN_TEXT = {
  alto: `Alto (${BRADEN.altoMax} o menos)`,
  moderado: `Moderado (${BRADEN.altoMax + 1}-${BRADEN.moderadoMax})`,
  bajo: `Bajo (más de ${BRADEN.moderadoMax})`,
};

export function rename(label: string, dict: Record<string, string>): string {
  return dict[label] || label;
}

const ALERT_HINT: Record<string, string> = {
  Infiltración: 'La vía se salió hacia el tejido',
  Eritema: 'La piel alrededor está enrojecida',
  'Rótulo incompleto': 'Falta fecha, nombre, legajo, enfermero, turno o ABB',
  'LPP III-IV': 'Lesión profunda: hay que priorizarla',
  'Braden alto': 'Alto riesgo de que aparezca o empeore una úlcera',
};

/** Color fijo por tipo de alerta (no depende del orden). */
export const ALERT_COLOR: Record<string, string> = {
  Infiltración: '#e11d48',
  Eritema: '#f43f5e',
  'Rótulo incompleto': '#d97706',
  'LPP III-IV': '#be123c',
  'Braden alto': '#ea580c',
};

export function displayAlertTipo(tipo: string): string {
  return tipo === 'UPP III-IV' ? 'LPP III-IV' : tipo;
}

export function groupAlertas(items: StatsAlerta[]): { tipo: string; count: number; hint: string }[] {
  const map = new Map<string, number>();
  for (const a of items) {
    const tipo = displayAlertTipo(a.tipo);
    map.set(tipo, (map.get(tipo) || 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tipo, count]) => ({ tipo, count, hint: ALERT_HINT[tipo] || '' }));
}
