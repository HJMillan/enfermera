import React from 'react';
import { AlertCircle, Bandage, CheckCircle2, ChevronDown, ChevronUp, Droplets, Syringe, Trash2, Users } from 'lucide-react';
import type { AccesoPerifericoForm, SondaVesicalForm, StoredRecord, UppForm } from '../../types/form';
import { formatIsoDateDisplay } from '../../utils/dateUtils';
import { formatPlace } from '../../config/sectorConfig';
import { recordSummary, SYNC_BADGE } from './historyUtils';
import { AccesoDetail, SondaDetail, UppDetail } from './HistoryDetails';

const FORM_META = {
  ACCESO_PERIFERICO: { title: 'Acceso Periférico', icon: Syringe, tone: 'bg-sky-100 text-sky-700' },
  UPP: { title: 'Lesión por presión (LPP)', icon: Bandage, tone: 'bg-rose-100 text-rose-700' },
  SONDA_VESICAL: { title: 'Sonda vesical', icon: Droplets, tone: 'bg-teal-100 text-teal-700' },
};

interface HistoryItemProps {
  item: StoredRecord;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

export const HistoryItem: React.FC<HistoryItemProps> = ({ item, expanded, onToggle, onDelete }) => {
  const meta = FORM_META[item.formType];
  const Icon = meta.icon;
  const summary = recordSummary(item);
  const sync = SYNC_BADGE[item.syncStatus] || SYNC_BADGE.PENDING;
  const place = formatPlace(item.data.sector, item.data.habitacion, item.data.cama);
  const sexoLabel = item.data.sexo === 'M' ? 'Masculino' : item.data.sexo === 'F' ? 'Femenino' : '';
  const detailId = `history-detail-${item.id}`;

  const extra = (() => {
    if (item.formType === 'ACCESO_PERIFERICO') {
      const d = item.data as AccesoPerifericoForm;
      const ubic = [d.ubicacionMSD && 'MSD', d.ubicacionMSI && 'MSI', d.ubicacionMID && 'MID', d.ubicacionMII && 'MII']
        .filter(Boolean)
        .join(', ');
      return d.tieneAcceso && ubic ? `Ubic: ${ubic}` : '';
    }
    if (item.formType === 'UPP') {
      const d = item.data as UppForm;
      return d.tieneUpp ? `Braden: ${d.escalaBraden} pts` : '';
    }
    const d = item.data as SondaVesicalForm;
    return d.tieneSonda === 'SI' && d.lumenes ? `${d.lumenes} lúmenes` : '';
  })();

  return (
    <div className="bg-white rounded-[var(--radius-md)] border border-slate-200/80 shadow-[var(--shadow-rest)] overflow-hidden transition-[box-shadow] duration-[var(--duration-base)] ease-[var(--ease-standard)] hover:shadow-[var(--shadow-hover)]">
      <div className="flex items-center hover:bg-slate-50/80 transition-colors duration-[var(--duration-fast)]">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={detailId}
          className="flex-1 min-w-0 p-3.5 flex items-center gap-3 text-left cursor-pointer"
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.tone}`}>
            <Icon className="w-5 h-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-slate-900 text-sm">
                Sec {item.data.sector} · {place}
              </span>
              {item.data.historiaClinica && (
                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                  HC: {item.data.historiaClinica}
                </span>
              )}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${summary.tone}`}>{summary.label}</span>
            </div>
            <div className="text-[11px] text-slate-600 flex items-center gap-2 mt-0.5 flex-wrap">
              <span>{item.data.fechaHora}</span>
              {sexoLabel && <span>· {sexoLabel}</span>}
              {item.data.fechaIngreso && <span>· Ingreso {formatIsoDateDisplay(item.data.fechaIngreso)}</span>}
              {extra && <span>· {extra}</span>}
            </div>
          </div>

          <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md shrink-0 ${sync.tone}`} title={sync.label}>
            {sync.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{sync.label}</span>
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-600 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-600 shrink-0" />
          )}
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 mr-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors touch-active cursor-pointer"
          aria-label={`Eliminar registro de Sec ${item.data.sector} · ${place}`}
          title="Eliminar este registro"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {expanded && (
        <div id={detailId} className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/70 text-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-800 text-xs">{meta.title}</span>
                <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">ID: {item.id}</span>
              </div>
              <div className="text-[11px] text-slate-600">
                {place} {item.data.historiaClinica && `· HC: ${item.data.historiaClinica}`}
              </div>
            </div>

            {(item.data.cantidadEnfermeras !== undefined || item.data.cantidadAuxiliares !== undefined) && (
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-700 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-xs">
                <Users className="w-3.5 h-3.5 text-sky-700" />
                <span>
                  Dotación: {item.data.cantidadEnfermeras ?? 0} Enf. · {item.data.cantidadAuxiliares ?? 0} Aux.
                </span>
              </div>
            )}
          </div>

          {item.formType === 'ACCESO_PERIFERICO' && <AccesoDetail data={item.data as AccesoPerifericoForm} />}
          {item.formType === 'UPP' && <UppDetail data={item.data as UppForm} />}
          {item.formType === 'SONDA_VESICAL' && <SondaDetail data={item.data as SondaVesicalForm} />}

          {item.errorMessage && item.syncStatus !== 'SYNCED' && (
            <div className="text-[11px] text-rose-600 bg-rose-50 p-2 rounded-lg">
              <b>Sincronización:</b> {item.errorMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
