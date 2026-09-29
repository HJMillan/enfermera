import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, BarChart3, RefreshCw, Settings } from 'lucide-react';
import { getStoredWebhookUrl } from '../../services/storageService';
import { fetchSheetStatistics } from '../../services/webhookService';
import { APP_VERSION, SCRIPT_VERSION } from '../../config/version';
import { BRADEN } from '../../config/clinical';
import { localDateISO } from '../../utils/dateUtils';
import type { StatsFilters, StatsPayload } from '../../types/stats';
import { CountTile } from './StatsCharts';
import { StatsFiltersPanel } from './StatsFiltersPanel';
import { AlertsSection, SectorsSection, SondasSection, UppSection, ViasSection } from './StatsSections';
import {
  RELATIVE_PRESETS,
  applyPreset,
  formatRange,
  loadSavedFilters,
  normalizeFilters,
  pct,
  readPayloadCache,
  saveFilters,
  writePayloadCache,
} from './statsUtils';

interface StatsViewProps {
  hasWebhook?: boolean;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const StatsView: React.FC<StatsViewProps> = ({ hasWebhook }) => {
  const [filters, setFilters] = useState<StatsFilters>(loadSavedFilters);
  const [data, setData] = useState<StatsPayload | null>(null);
  const [stale, setStale] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqIdRef = useRef(0);
  const dayRef = useRef(localDateISO());
  const webhookReady = hasWebhook ?? Boolean(getStoredWebhookUrl());

  const extraCount = [filters.evaluables, filters.alertas, filters.conVia, filters.rotuloIncompleto, filters.conUpp, filters.bradenAlto].filter(
    Boolean
  ).length;

  useEffect(() => {
    saveFilters(filters);
  }, [filters]);

  const updateFilters = useCallback((patch: Partial<StatsFilters> | ((prev: StatsFilters) => StatsFilters)) => {
    setFilters((prev) => normalizeFilters(typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }));
  }, []);

  // "Hoy", "Ayer", "7 días" y "Este mes" se recalculan si la app queda abierta al cambiar el día.
  useEffect(() => {
    const check = () => {
      const today = localDateISO();
      if (today === dayRef.current) return;
      dayRef.current = today;
      setFilters((prev) => (RELATIVE_PRESETS.includes(prev.preset) ? applyPreset(prev.preset, prev) : prev));
    };
    const timer = window.setInterval(check, 60000);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);

  const load = useCallback(async (nextFilters: StatsFilters) => {
    if (!getStoredWebhookUrl()) {
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
      setStale(false);
      writePayloadCache(nextFilters, payload);
    } catch (err) {
      if (reqId !== reqIdRef.current) return;
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las estadísticas.');
      // Solo se muestra una lectura anterior si es exactamente de estos filtros.
      const cached = readPayloadCache(nextFilters);
      setData(cached);
      setStale(Boolean(cached));
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(filters), 280);
    return () => window.clearTimeout(timer);
  }, [filters, load, webhookReady]);

  useEffect(() => {
    return () => {
      reqIdRef.current += 1;
    };
  }, []);

  const summary = useMemo(() => {
    const bits = [formatRange(filters), filters.sector ? `Sector ${filters.sector}` : 'Todos los sectores'];
    if (filters.ronda === 'vias') bits.push('Solo vías');
    if (filters.ronda === 'upp') bits.push('Solo piel');
    if (filters.ronda === 'sondas') bits.push('Solo sondas');
    if (extraCount) bits.push(`${extraCount} filtro${extraCount > 1 ? 's' : ''} extra`);
    return bits.join(' · ');
  }, [filters, extraCount]);

  // Qué secciones se ven depende de la ronda con que se leyó el dato, no del filtro que se está cambiando.
  const ronda = (data?.ronda as StatsFilters['ronda']) || filters.ronda;
  const showVias = ronda === 'ambas' || ronda === 'vias';
  const showUpp = ronda === 'ambas' || ronda === 'upp';
  const showSondas = ronda === 'ambas' || ronda === 'sondas';
  const { vias, upp, sondas, cobertura } = data || {};
  const alertas = data?.alertas || [];
  const alertasTotal = data?.alertasTotal ?? alertas.length;

  const lectura = useMemo(() => {
    const parts: string[] = [];
    if (showVias && vias && cobertura) {
      parts.push(`Se recorrieron ${plural(cobertura.viasUnicas, 'cama', 'camas')} de vías.`);
      const evaluables = vias.evaluadas - (vias.noEvaluables || 0);
      if (vias.conPeriferico) {
        parts.push(`${vias.conPeriferico} tienen catéter en el brazo o la pierna (${pct(vias.conPeriferico, evaluables)}% de las camas con paciente).`);
      }
      if (vias.rotuloIncompleto) parts.push(`${vias.rotuloIncompleto} tienen el rótulo incompleto.`);
      const clin = vias.infiltracion + vias.eritema;
      if (clin) parts.push(`${clin} con infiltración o enrojecimiento.`);
    }
    if (showUpp && upp && cobertura) {
      parts.push(`En piel se recorrieron ${plural(cobertura.uppUnicas, 'cama', 'camas')}.`);
      parts.push(
        upp.conUpp
          ? `${upp.conUpp} ${upp.conUpp === 1 ? 'tiene' : 'tienen'} lesión por presión (LPP).`
          : 'Ninguna cama relevada tiene úlcera en este recorte.'
      );
      if (upp.bradenAlto) parts.push(`${upp.bradenAlto} con riesgo alto (Braden ${BRADEN.altoMax} o menos).`);
    }
    if (showSondas && sondas && cobertura) {
      parts.push(`En sondas se recorrieron ${plural(cobertura.sondasUnicas ?? sondas.evaluadas, 'cama', 'camas')}.`);
      parts.push(
        sondas.conSonda
          ? `${sondas.conSonda} ${sondas.conSonda === 1 ? 'tiene' : 'tienen'} sonda vesical.`
          : 'Ninguna cama relevada tiene sonda en este recorte.'
      );
    }
    if (alertasTotal) parts.push(`${plural(alertasTotal, 'aviso', 'avisos')} para revisar.`);
    return parts.join(' ');
  }, [showVias, showUpp, showSondas, vias, upp, sondas, cobertura, alertasTotal]);

  if (!webhookReady) {
    return (
      <div className="px-3 pb-12 md:px-4 max-w-4xl mx-auto">
        <div className="bg-white p-6 rounded-[var(--radius-md)] border border-slate-200/80 shadow-[var(--shadow-rest)] text-center space-y-3">
          <BarChart3 className="w-10 h-10 text-slate-300 mx-auto" />
          <h2 className="font-extrabold text-slate-900 text-base">Estadísticas del archivo</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Los números salen del Google Sheet compartido, no de este celular. Pedile a quien configura la app que cargue la dirección
            del archivo en Ajustes.
          </p>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-800 bg-sky-50 px-3 py-1.5 rounded-[var(--radius-sm)] border border-sky-200">
            <Settings className="w-3.5 h-3.5" />
            Abrí el engranaje arriba a la derecha
          </div>
        </div>
      </div>
    );
  }

  // Camas libres o ausentes, por cada ronda visible.
  const libres = cobertura
    ? [
        showVias && { label: 'Vías', value: cobertura.noEvaluablesVias },
        showUpp && { label: 'Piel', value: cobertura.noEvaluablesUpp },
        showSondas && { label: 'Sondas', value: cobertura.noEvaluablesSondas ?? 0 },
      ].filter(Boolean) as { label: string; value: number }[]
    : [];

  return (
    <div className="px-3 pb-12 md:px-4 space-y-3.5 max-w-4xl mx-auto">
      <StatsFiltersPanel
        filters={filters}
        summary={summary}
        extraCount={extraCount}
        loading={loading}
        onChange={updateFilters}
        onRefresh={() => void load(filters)}
      />

      {error && (
        <div role="alert" className="p-3.5 rounded-[var(--radius-md)] bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {error}
            {stale ? ' Se muestra la última lectura correcta de estos mismos filtros.' : ''}
          </span>
        </div>
      )}

      {loading && !data && (
        <div role="status" className="bg-white p-8 rounded-[var(--radius-md)] border border-slate-200 text-center text-xs font-bold text-slate-600">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-700" />
          Leyendo el Google Sheet...
        </div>
      )}

      {data && cobertura && (
        <>
          <p className="text-[11px] text-slate-500 font-medium px-1">
            {stale ? 'Última lectura correcta' : 'Archivo leído'}
            {data.generatedAt ? ` ${data.generatedAt}` : ''}
            {loading ? ' · actualizando…' : ''}
            {' · '}app v{APP_VERSION}
            {data.version ? ` · script v${data.version}` : ' · script sin versión'}
          </p>
          {data.version !== SCRIPT_VERSION && (
            <p className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-[var(--radius-sm)] px-3 py-2">
              {data.version ? `El script del Sheet es v${data.version} y esta app espera v${SCRIPT_VERSION}.` : 'El script no informa versión.'}{' '}
              Pegá el Code.gs actualizado e implementá una nueva versión.
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
                hint={`${plural(cobertura.registrosVias, 'carga', 'cargas')} en el recorte`}
                tone="sky"
              />
            )}
            {showUpp && (
              <CountTile
                label="Camas de piel"
                value={cobertura.uppUnicas}
                hint={`${plural(cobertura.registrosUpp, 'carga', 'cargas')} en el recorte`}
                tone="rose"
              />
            )}
            {showSondas && (
              <CountTile
                label="Camas de sondas"
                value={cobertura.sondasUnicas ?? 0}
                hint={`${plural(cobertura.registrosSondas ?? 0, 'carga', 'cargas')} en el recorte`}
                tone="teal"
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
              value={libres.map((l) => l.value).join(' · ')}
              hint={libres.length > 1 ? `${libres.map((l) => l.label).join(' · ')} (quirófano, diálisis, libre…)` : 'Quirófano, diálisis, libre…'}
              tone="slate"
            />
          </div>

          {showVias && vias && <ViasSection vias={vias} />}
          {showUpp && upp && <UppSection upp={upp} />}
          {showSondas && sondas && <SondasSection sondas={sondas} />}
          <SectorsSection cobertura={cobertura} showVias={showVias} showUpp={showUpp} showSondas={showSondas} />
          <AlertsSection alertas={alertas} total={alertasTotal} />
        </>
      )}
    </div>
  );
};
