import type { AccesoPerifericoForm, SondaVesicalForm, StoredRecord, SyncStatus, UppForm } from '../../types/form';
import { ROTULO_ITEMS } from '../../config/clinical';

export type YnState = 'si' | 'no' | 'vacio';

export function ynState(val: boolean | undefined): YnState {
  if (val === true) return 'si';
  if (val === false) return 'no';
  return 'vacio';
}

export function ynBadgeClass(val: boolean | undefined): string {
  if (val === true) return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
  if (val === false) return 'bg-rose-100 text-rose-800 border border-rose-200';
  return 'bg-slate-100 text-slate-700 border border-slate-200';
}

export function ynBadgeText(val: boolean | undefined, yes: string, no: string): string {
  if (val === true) return yes;
  if (val === false) return no;
  return 'Vacío';
}

export function rotuloAudit(data: AccesoPerifericoForm): { label: string; state: YnState }[] {
  if (data.tieneRotulo !== true) return [];
  return ROTULO_ITEMS.map((item) => ({ label: item.label, state: ynState(data[item.key]) }));
}

export const AMBER_TONE = 'bg-amber-100 text-amber-800 border border-amber-200';
const NEUTRAL_TONE = 'bg-slate-100 text-slate-600';

/** Texto y color del resumen que se ve en la fila cerrada. */
export function recordSummary(item: StoredRecord): { label: string; tone: string } {
  if (item.formType === 'ACCESO_PERIFERICO') {
    const d = item.data as AccesoPerifericoForm;
    if (d.tieneAcceso) return { label: 'Con Vía', tone: 'bg-sky-100 text-sky-800' };
    if (d.motivoAusente) return { label: d.motivoAusente, tone: AMBER_TONE };
    if (d.tipoAccesoAlternativo === 'ausente') return { label: 'Ausente', tone: AMBER_TONE };
    if (d.tipoAccesoAlternativo === 'acceso_central') return { label: 'Acceso Central', tone: 'bg-indigo-100 text-indigo-800' };
    if (d.tipoAccesoAlternativo === 'percutaneo') return { label: 'Percutáneo', tone: 'bg-purple-100 text-purple-800' };
    return { label: 'Sin Vía', tone: NEUTRAL_TONE };
  }
  if (item.formType === 'SONDA_VESICAL') {
    const d = item.data as SondaVesicalForm;
    if (d.motivoAusente) return { label: d.motivoAusente, tone: AMBER_TONE };
    if (d.tieneSonda === 'SI') return { label: `Sonda Fr ${d.numeroSonda || '?'}`, tone: 'bg-teal-100 text-teal-800' };
    return { label: 'Sin sonda', tone: NEUTRAL_TONE };
  }
  const d = item.data as UppForm;
  if (d.tieneUpp) return { label: 'Con LPP', tone: 'bg-rose-100 text-rose-800' };
  if (d.motivoAusente) return { label: d.motivoAusente, tone: AMBER_TONE };
  return { label: 'Piel Íntegra', tone: NEUTRAL_TONE };
}

export const SYNC_BADGE: Record<SyncStatus, { label: string; tone: string; ok: boolean }> = {
  SYNCED: { label: 'En el Sheet', tone: 'text-emerald-700 bg-emerald-50', ok: true },
  SENT: { label: 'Enviado, sin confirmar', tone: 'text-sky-800 bg-sky-50', ok: false },
  PENDING: { label: 'Enviando', tone: 'text-amber-800 bg-amber-50', ok: false },
  LOCAL: { label: 'Solo en el dispositivo', tone: 'text-amber-800 bg-amber-50', ok: false },
  FAILED: { label: 'Falló, se reintentará', tone: 'text-rose-700 bg-rose-50', ok: false },
};

export function listFrom(items: (string | false | undefined | null)[]): string[] {
  return items.filter(Boolean) as string[];
}
