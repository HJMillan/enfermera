import React, { useState } from 'react';
import {
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Syringe,
  Bandage,
  Droplets,
  ChevronDown,
  ChevronUp,
  Trash2,
  Tag,
  ShieldAlert,
  Activity,
  Eye,
  Layers,
  HeartPulse,
  LifeBuoy,
  Calendar,
  Check,
  X,
  Users,
} from 'lucide-react';
import type { StoredRecord, AccesoPerifericoForm, SondaVesicalForm, UppForm } from '../../types/form';
import { formatIsoDateDisplay } from '../../utils/dateUtils';
import { retryRecordSync } from '../../services/webhookService';
import { exportRecordsToCSV, deleteRecordLocally, clearStoredRecords } from '../../services/storageService';

const getBradenRiskBadge = (score: number) => {
  if (score <= 12) {
    return { label: 'Riesgo Alto', color: 'bg-rose-100 text-rose-800 border-rose-200' };
  }
  if (score <= 14) {
    return { label: 'Riesgo Moderado', color: 'bg-amber-100 text-amber-800 border-amber-200' };
  }
  return { label: 'Riesgo Bajo', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
};

interface HistoryViewProps {
  records: StoredRecord[];
  onRefresh: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ records, onRefresh }) => {
  const [filter, setFilter] = useState<'ALL' | 'ACCESO_PERIFERICO' | 'UPP' | 'SONDA_VESICAL'>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const filtered = records.filter((r) => {
    if (filter === 'ALL') return true;
    return r.formType === filter;
  });

  const pendingCount = records.filter((r) => r.syncStatus !== 'SYNCED').length;

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      const pendings = records.filter((r) => r.syncStatus !== 'SYNCED');
      for (const rec of pendings) {
        await retryRecordSync(rec);
      }
      onRefresh();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="px-3 pb-24 md:px-4 space-y-3.5 max-w-2xl lg:max-w-none mx-auto">
      {/* Barra de Acciones y Resumen */}
      <div className="bg-white p-4 rounded-[var(--radius-md)] border border-slate-200/80 shadow-[var(--shadow-rest)] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-extrabold text-slate-800 text-base">Historial del Turno</h2>
            <p className="text-xs text-slate-600">
              {records.length} {records.length === 1 ? 'paciente registrado' : 'pacientes registrados'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={handleSyncAll}
                disabled={isSyncing}
                className="px-3 py-2 rounded-[var(--radius-sm)] bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-[var(--shadow-rest)] hover:shadow-[var(--shadow-hover)] transition-[transform,box-shadow,background-color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Enviando...' : `Sincronizar (${pendingCount})`}</span>
              </button>
            )}

            <button
              type="button"
              onClick={exportRecordsToCSV}
              className="px-3 py-2 rounded-[var(--radius-sm)] bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-[var(--shadow-rest)] hover:shadow-[var(--shadow-hover)] transition-[transform,box-shadow,background-color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>

            {records.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('¿Deseas eliminar TODOS los registros guardados del turno actual? Esta acción no se puede deshacer.')) {
                    clearStoredRecords();
                    onRefresh();
                  }
                }}
                className="px-2.5 py-2 rounded-[var(--radius-sm)] bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1 shadow-[var(--shadow-rest)] hover:shadow-[var(--shadow-hover)] transition-[transform,box-shadow,background-color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] cursor-pointer"
                title="Limpiar todos los registros guardados"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Limpiar turno</span>
              </button>
            )}
          </div>
        </div>

        {/* Filtros de Pestaña */}
        <div className="flex gap-1.5 pt-1">
          {(
            [
              { id: 'ALL' as const, label: `Todos (${records.length})` },
              {
                id: 'ACCESO_PERIFERICO' as const,
                label: `Vías (${records.filter((r) => r.formType === 'ACCESO_PERIFERICO').length})`,
              },
              {
                id: 'UPP' as const,
                label: `LPP (${records.filter((r) => r.formType === 'UPP').length})`,
              },
              {
                id: 'SONDA_VESICAL' as const,
                label: `Sondas (${records.filter((r) => r.formType === 'SONDA_VESICAL').length})`,
              },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold transition-[transform,box-shadow,background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] cursor-pointer ${
                filter === item.id
                  ? 'bg-sky-700 text-white shadow-[var(--shadow-rest)]'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Registros */}
      {filtered.length === 0 ? (
        <div className="bg-white p-8 rounded-[var(--radius-md)] border border-slate-200/80 shadow-[var(--shadow-rest)] text-center space-y-2">
          <Clock className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="font-bold text-slate-700 text-sm">No hay registros cargados aún</p>
          <p className="text-xs text-slate-600">
            Comienza cargando pacientes en Vías, LPP o Sondas.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((item) => {
            const isAcceso = item.formType === 'ACCESO_PERIFERICO';
            const isUpp = item.formType === 'UPP';
            const isSonda = item.formType === 'SONDA_VESICAL';
            const isExpanded = expandedId === item.id;
            const dataAcceso = isAcceso ? (item.data as AccesoPerifericoForm) : null;
            const dataUpp = isUpp ? (item.data as UppForm) : null;
            const dataSonda = isSonda ? (item.data as SondaVesicalForm) : null;
            const sexoLabel = item.data.sexo === 'M' ? 'Masculino' : item.data.sexo === 'F' ? 'Femenino' : '';
            const motivoSondaLabel =
              dataSonda?.ubicacionMotivo === 'nefrectomia_derecha'
                ? 'Nefrectomía derecha'
                : dataSonda?.ubicacionMotivo === 'nefrectomia_izquierda'
                ? 'Nefrectomía izquierda'
                : dataSonda?.ubicacionMotivo === 'bricker'
                ? 'Bricker'
                : dataSonda?.ubicacionMotivo === 'nada'
                ? 'Nada'
                : '';

            const ubicacionesAccesoList = dataAcceso
              ? [
                  dataAcceso.ubicacionMSD && 'MSD (Brazo Der)',
                  dataAcceso.ubicacionMSI && 'MSI (Brazo Izq)',
                  dataAcceso.ubicacionMID && 'MID (Pierna Der)',
                  dataAcceso.ubicacionMII && 'MII (Pierna Izq)',
                ].filter(Boolean) as string[]
              : [];

            const ubicacionesAcceso = dataAcceso
              ? [
                  dataAcceso.ubicacionMSD && 'MSD',
                  dataAcceso.ubicacionMSI && 'MSI',
                  dataAcceso.ubicacionMID && 'MID',
                  dataAcceso.ubicacionMII && 'MII',
                ]
                  .filter(Boolean)
                  .join(', ')
              : '';

            const ubicacionesUppList = dataUpp
              ? [
                  dataUpp.ubicacionSacra && 'Sacra',
                  dataUpp.ubicacionTalon && 'Talón',
                  dataUpp.ubicacionGluteo && 'Glúteo',
                  dataUpp.ubicacionPosterior && 'Posterior',
                  dataUpp.ubicacionOtro && dataUpp.ubicacionOtro.trim(),
                ].filter(Boolean) as string[]
              : [];

            const materialesFijacionList = dataAcceso
              ? [
                  dataAcceso.fijacionTegaderm && 'Tegaderm',
                  dataAcceso.fijacionCinta &&
                    (dataAcceso.fijacionCintaTipo === 'transparente'
                      ? 'Cinta transparente'
                      : dataAcceso.fijacionCintaTipo
                      ? `Cinta (${dataAcceso.fijacionCintaTipo})`
                      : 'Cinta'),
                  dataAcceso.fijacionHipafix && 'Hipafix',
                  dataAcceso.fijacionVenda && 'Venda',
                  dataAcceso.fijacionContencionMecanica && 'Contención Mecánica',
                ].filter(Boolean) as string[]
              : [];

            const rotuloAuditoria = dataAcceso?.tieneRotulo
              ? [
                  { label: 'Fecha', ok: Boolean(dataAcceso.rotuloTieneFecha) },
                  {
                    label: 'Enfermero',
                    ok: Boolean(dataAcceso.rotuloTieneEnfermero ?? dataAcceso.rotuloTieneNombre),
                  },
                  { label: 'Legajo', ok: Boolean(dataAcceso.rotuloTieneLegajo) },
                  { label: 'Turno', ok: Boolean(dataAcceso.rotuloTieneTurno) },
                  { label: 'ABB', ok: Boolean(dataAcceso.rotuloTieneABB) },
                ]
              : [];

            const percutaneoRotuloAuditoria =
              !dataAcceso?.tieneAcceso &&
              dataAcceso?.tipoAccesoAlternativo === 'percutaneo' &&
              dataAcceso?.tieneRotulo
                ? [
                    { label: 'Fecha', ok: Boolean(dataAcceso.rotuloTieneFecha) },
                    {
                      label: 'Enfermero',
                      ok: Boolean(dataAcceso.rotuloTieneEnfermero ?? dataAcceso.rotuloTieneNombre),
                    },
                    { label: 'Legajo', ok: Boolean(dataAcceso.rotuloTieneLegajo) },
                    { label: 'Turno', ok: Boolean(dataAcceso.rotuloTieneTurno) },
                    { label: 'ABB', ok: Boolean(dataAcceso.rotuloTieneABB) },
                  ]
                : [];

            const bradenInfo =
              dataUpp?.escalaBraden !== undefined ? getBradenRiskBadge(dataUpp.escalaBraden) : null;

            const gradosUpp = dataUpp
              ? [
                  dataUpp.gradoI && 'I',
                  dataUpp.gradoII && 'II',
                  dataUpp.gradoIII && 'III',
                  dataUpp.gradoIV && 'IV',
                ]
                  .filter(Boolean)
                  .join(', ')
              : '';

            return (
              <div
                key={item.id}
                className="bg-white rounded-[var(--radius-md)] border border-slate-200/80 shadow-[var(--shadow-rest)] overflow-hidden transition-[transform,box-shadow,border-color] duration-[var(--duration-base)] ease-[var(--ease-standard)] hover:shadow-[var(--shadow-hover)] hover:-translate-y-0.5"
              >
                {/* Cabecera del ítem */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth)]"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isAcceso
                          ? 'bg-sky-100 text-sky-700'
                          : isSonda
                          ? 'bg-teal-100 text-teal-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {isAcceso ? (
                        <Syringe className="w-5 h-5" />
                      ) : isSonda ? (
                        <Droplets className="w-5 h-5" />
                      ) : (
                        <Bandage className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-slate-900 text-sm">
                          Sec {item.data.sector} · Hab {item.data.habitacion} · Cama {item.data.cama}
                        </span>
                        {item.data.historiaClinica && (
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            HC: {item.data.historiaClinica}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                            isAcceso
                              ? dataAcceso?.tieneAcceso
                                ? 'bg-sky-100 text-sky-800'
                                : dataAcceso?.tipoAccesoAlternativo === 'ausente' || dataAcceso?.motivoAusente
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : dataAcceso?.tipoAccesoAlternativo === 'acceso_central'
                                ? 'bg-indigo-100 text-indigo-800'
                                : dataAcceso?.tipoAccesoAlternativo === 'percutaneo'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-slate-100 text-slate-600'
                              : isSonda
                              ? dataSonda?.tieneSonda === 'SI'
                                ? 'bg-teal-100 text-teal-800'
                                : dataSonda?.motivoAusente
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-600'
                              : dataUpp?.tieneUpp
                              ? 'bg-rose-100 text-rose-800'
                              : dataUpp?.motivoAusente
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isAcceso
                            ? dataAcceso?.tieneAcceso
                              ? 'Con Vía'
                              : dataAcceso?.motivoAusente
                              ? dataAcceso.motivoAusente
                              : dataAcceso?.tipoAccesoAlternativo === 'ausente'
                              ? 'Ausente'
                              : dataAcceso?.tipoAccesoAlternativo === 'acceso_central'
                              ? 'Acceso Central'
                              : dataAcceso?.tipoAccesoAlternativo === 'percutaneo'
                              ? 'Percutáneo'
                              : 'Sin Vía'
                            : isSonda
                            ? dataSonda?.tieneSonda === 'SI'
                              ? `Sonda Fr ${dataSonda.numeroSonda || '?'}`
                              : dataSonda?.motivoAusente || 'Sin sonda'
                            : dataUpp?.tieneUpp
                            ? 'Con LPP'
                            : dataUpp?.motivoAusente
                            ? dataUpp.motivoAusente
                            : 'Piel Íntegra'}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-600 flex items-center gap-2 mt-0.5">
                        <span>{item.data.fechaHora}</span>
                        {sexoLabel && <span>· {sexoLabel}</span>}
                        {item.data.fechaIngreso && (
                          <span>· Ingreso {formatIsoDateDisplay(item.data.fechaIngreso)}</span>
                        )}
                        {isAcceso && dataAcceso?.tieneAcceso && ubicacionesAcceso && (
                          <span>· Ubic: {ubicacionesAcceso}</span>
                        )}
                        {isUpp && dataUpp?.tieneUpp && (
                          <span>· Braden: {dataUpp.escalaBraden} pts</span>
                        )}
                        {isSonda && dataSonda?.tieneSonda === 'SI' && dataSonda.lumenes && (
                          <span>· {dataSonda.lumenes} lúmenes</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.syncStatus === 'SYNCED' ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Sincronizado</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                        <span className="hidden sm:inline">En celular</span>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`¿Eliminar registro de Sec ${item.data.sector} Hab ${item.data.habitacion} Cama ${item.data.cama}?`)) {
                          deleteRecordLocally(item.id);
                          onRefresh();
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all touch-active cursor-pointer"
                      title="Eliminar este registro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-600" />
                    )}
                  </div>
                </div>

                {/* Detalle desplegable */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/70 text-xs space-y-3">
                    {/* Encabezado del Detalle */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-800 text-xs">
                            {isAcceso
                              ? 'Acceso Periférico'
                              : isSonda
                              ? 'Sonda vesical'
                              : 'Lesión por presión (LPP)'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            ID: {item.id}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600">
                          Hab. {item.data.habitacion} · Cama {item.data.cama}{' '}
                          {item.data.historiaClinica && `· HC: ${item.data.historiaClinica}`}
                        </div>
                      </div>

                      {(item.data.cantidadEnfermeras !== undefined ||
                        item.data.cantidadAuxiliares !== undefined) && (
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-700 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-xs">
                          <Users className="w-3.5 h-3.5 text-sky-700" />
                          <span>
                            Dotación: {item.data.cantidadEnfermeras ?? 0} Enf. ·{' '}
                            {item.data.cantidadAuxiliares ?? 0} Aux.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* CASO 1: Acceso Periférico Activo */}
                    {isAcceso && dataAcceso && dataAcceso.tieneAcceso && (
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {/* A. Vía & Rótulo */}
                          <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs space-y-2">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                <Tag className="w-3.5 h-3.5 text-sky-700" />
                                Vía y Rótulo de Identificación
                              </span>
                              <span className="text-[10px] font-extrabold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                                {dataAcceso.cuantas || 1} {dataAcceso.cuantas === 1 ? 'vía' : 'vías'}
                              </span>
                            </div>

                            <div>
                              <span className="text-[11px] font-bold text-slate-600 block mb-1">
                                Ubicación anatómica:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {ubicacionesAccesoList.length > 0 ? (
                                  ubicacionesAccesoList.map((ubic) => (
                                    <span
                                      key={ubic}
                                      className="text-[11px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200"
                                    >
                                      {ubic}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-slate-600 italic text-[11px]">-</span>
                                )}
                              </div>
                            </div>

                            <div className="pt-1.5 border-t border-slate-100">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[11px] font-bold text-slate-600">Rótulo:</span>
                                <span
                                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                                    dataAcceso.tieneRotulo
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                                  }`}
                                >
                                  {dataAcceso.tieneRotulo ? 'SÍ (Colocado)' : 'NO (Sin rótulo)'}
                                </span>
                              </div>

                              {dataAcceso.tieneRotulo && (
                                <div className="grid grid-cols-3 gap-1 pt-1">
                                  {rotuloAuditoria.map((it) => (
                                    <span
                                      key={it.label}
                                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center justify-between border ${
                                        it.ok
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                          : 'bg-slate-100 text-slate-600 border-slate-200'
                                      }`}
                                    >
                                      <span>{it.label}</span>
                                      {it.ok ? (
                                        <Check className="w-3 h-3 text-emerald-600" />
                                      ) : (
                                        <X className="w-3 h-3 text-slate-600" />
                                      )}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* B. Inspección y Fijación */}
                          <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs space-y-2">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5 text-sky-700" />
                                Inspección y Fijación
                              </span>
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded flex items-center gap-1 border ${
                                  dataAcceso.visibilidad
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                {dataAcceso.visibilidad ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span>Punto visible</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="w-3 h-3 text-amber-600" />
                                    <span>No visible</span>
                                  </>
                                )}
                              </span>
                            </div>

                            <div>
                              <span className="text-[11px] font-bold text-slate-600 block mb-1">
                                Materiales de fijación:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {materialesFijacionList.length > 0 ? (
                                  materialesFijacionList.map((mat) => (
                                    <span
                                      key={mat}
                                      className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200"
                                    >
                                      {mat}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-slate-600 italic text-[11px]">
                                    Sin fijación declarada
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                              <span className="text-[11px] font-bold text-slate-600">Adherencia:</span>
                              <span
                                className={`text-[11px] font-extrabold px-2 py-0.5 rounded uppercase border ${
                                  dataAcceso.fijacionAdherencia === 'total'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : dataAcceso.fijacionAdherencia === 'parcial'
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-rose-50 text-rose-800 border-rose-200'
                                }`}
                              >
                                {dataAcceso.fijacionAdherencia || '-'}
                              </span>
                            </div>
                          </div>

                          {/* C. Conectores */}
                          <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs space-y-2">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-sky-700" />
                                Conectores
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div
                                className={`p-2 rounded-md border flex items-center justify-between ${
                                  dataAcceso.lumenesLlave3Vias
                                    ? 'bg-sky-50/80 border-sky-200 text-sky-900'
                                    : 'bg-slate-50 border-slate-200 text-slate-600'
                                }`}
                              >
                                <span className="text-xs font-bold">Llave 3 vías</span>
                                <span className="text-[11px] font-extrabold">
                                  {dataAcceso.lumenesLlave3Vias ? 'SÍ' : 'NO'}
                                </span>
                              </div>

                              <div
                                className={`p-2 rounded-md border flex items-center justify-between ${
                                  dataAcceso.lumenesTaponMultifuncion
                                    ? 'bg-sky-50/80 border-sky-200 text-sky-900'
                                    : 'bg-slate-50 border-slate-200 text-slate-600'
                                }`}
                              >
                                <span className="text-xs font-bold">Tapón multif.</span>
                                <span className="text-[11px] font-extrabold">
                                  {dataAcceso.lumenesTaponMultifuncion ? 'SÍ' : 'NO'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* D. Signos Clínicos e Infusión */}
                          <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs space-y-2">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                                Evaluación Clínica e Infusión
                              </span>
                              <span className="text-[11px] font-extrabold text-sky-900 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 capitalize flex items-center gap-1">
                                <Activity className="w-3 h-3 text-sky-700" />
                                {dataAcceso.infusionType || 'Sin infusión'}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-1.5">
                              <span
                                className={`text-[10px] font-bold p-1.5 rounded text-center border ${
                                  dataAcceso.caracteristicasInfiltracion
                                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                                    : 'bg-slate-50 text-slate-700 border-slate-200'
                                }`}
                              >
                                {dataAcceso.caracteristicasInfiltracion
                                  ? '⚠️ Infiltración'
                                  : 'Sin infiltración'}
                              </span>

                              <span
                                className={`text-[10px] font-bold p-1.5 rounded text-center border ${
                                  dataAcceso.caracteristicasEritematoso
                                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                                    : 'bg-slate-50 text-slate-700 border-slate-200'
                                }`}
                              >
                                {dataAcceso.caracteristicasEritematoso
                                  ? '⚠️ Eritematoso'
                                  : 'Sin eritema'}
                              </span>

                              <span
                                className={`text-[10px] font-bold p-1.5 rounded text-center border ${
                                  dataAcceso.caracteristicasRetorno
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                {dataAcceso.caracteristicasRetorno
                                  ? '✓ Retorno venoso'
                                  : 'Sin retorno'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {dataAcceso.observaciones && (
                          <div className="p-2.5 rounded-lg bg-sky-50/60 border border-sky-100 text-slate-800 space-y-0.5">
                            <span className="font-bold text-[11px] text-sky-900 block">
                              Observaciones adicionales:
                            </span>
                            <p className="italic text-xs text-slate-700">{dataAcceso.observaciones}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* CASO 2: Sin Acceso Periférico o Alternativo */}
                    {isAcceso && dataAcceso && !dataAcceso.tieneAcceso && (
                      <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs space-y-2.5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                          <span className="font-bold text-slate-800 text-xs">
                            Situación / Acceso Alternativo
                          </span>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            Sin Acceso Periférico
                          </span>
                        </div>

                        {dataAcceso.motivoAusente ||
                        dataAcceso.tipoAccesoAlternativo === 'ausente' ? (
                          <div className="p-2 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>
                              Paciente Ausente / Cama: {dataAcceso.motivoAusente || 'Libre'}
                            </span>
                          </div>
                        ) : dataAcceso.tipoAccesoAlternativo === 'acceso_central' ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-700">Tipo: Acceso Central</span>
                              <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                Ubicación: {dataAcceso.accesoCentralUbicacion || 'S/D'}
                              </span>
                            </div>
                          </div>
                        ) : dataAcceso.tipoAccesoAlternativo === 'percutaneo' ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-700">
                                Tipo: Catéter Percutáneo
                              </span>
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                                  dataAcceso.tieneRotulo
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}
                              >
                                Rótulo: {dataAcceso.tieneRotulo ? 'SÍ (Colocado)' : 'NO'}
                              </span>
                            </div>

                            {dataAcceso.tieneRotulo && (
                              <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-100">
                                {percutaneoRotuloAuditoria.map((it) => (
                                  <span
                                    key={it.label}
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center justify-between border ${
                                      it.ok
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                    }`}
                                  >
                                    <span>{it.label}</span>
                                    {it.ok ? (
                                      <Check className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <X className="w-3 h-3 text-slate-600" />
                                    )}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-600 font-semibold">
                            Sin vía periférica ni accesos activos registrados.
                          </div>
                        )}

                        {dataAcceso.observaciones && (
                          <div className="p-2 rounded-md bg-slate-50 border border-slate-200 text-slate-800 text-xs">
                            <span className="font-bold block text-[11px] text-slate-700">
                              Observaciones:
                            </span>
                            <span className="italic">{dataAcceso.observaciones}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {isSonda && dataSonda && (
                      <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                            <Droplets className="w-3.5 h-3.5 text-teal-700" />
                            Sonda vesical
                          </span>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                            {dataSonda.tieneSonda === 'SI' ? 'Con sonda' : dataSonda.motivoAusente || 'Sin sonda'}
                          </span>
                        </div>
                        {dataSonda.tieneSonda === 'SI' && (
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-[11px] font-bold text-slate-600 block">Fr:</span>
                              <span className="font-semibold text-slate-800">{dataSonda.numeroSonda || '-'}</span>
                            </div>
                            <div>
                              <span className="text-[11px] font-bold text-slate-600 block">Lúmenes:</span>
                              <span className="font-semibold text-slate-800">{dataSonda.lumenes || '-'}</span>
                            </div>
                            <div>
                              <span className="text-[11px] font-bold text-slate-600 block">Fijación:</span>
                              <span className="font-semibold text-slate-800">{dataSonda.fijacion || '-'}</span>
                            </div>
                            <div>
                              <span className="text-[11px] font-bold text-slate-600 block">Ubicación:</span>
                              <span className="font-semibold text-slate-800">
                                {dataSonda.ubicacionCorrecta === 'NO'
                                  ? `NO${motivoSondaLabel ? ` (${motivoSondaLabel})` : ''}`
                                  : dataSonda.ubicacionCorrecta || '-'}
                              </span>
                            </div>
                          </div>
                        )}
                        {dataSonda.observaciones && (
                          <div className="text-xs text-slate-700 italic bg-slate-50 p-2 rounded border border-slate-200">
                            Observaciones: {dataSonda.observaciones}
                          </div>
                        )}
                      </div>
                    )}

                    {/* CASO 3: Úlcera por Presión (UPP) Activa */}
                    {isUpp && dataUpp && dataUpp.tieneUpp && (
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {/* A. Ingreso y Procedencia */}
                          <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs space-y-2">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-rose-700" />
                                Ingreso y Procedencia
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-[11px] font-bold text-slate-600 block">
                                  Fecha Ingreso:
                                </span>
                                <span className="font-semibold text-slate-800">
                                  {dataUpp.fechaIngreso ? formatIsoDateDisplay(dataUpp.fechaIngreso) : '-'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[11px] font-bold text-slate-600 block">
                                  Área Cerrada:
                                </span>
                                <span className="font-semibold text-slate-800">
                                  {dataUpp.pasoAreaCerrada
                                    ? `SÍ ${
                                        dataUpp.areaCerradaCual
                                          ? `(${dataUpp.areaCerradaCual})`
                                          : ''
                                      }`
                                    : 'NO'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* B. Lesión, Ubicación y Grados */}
                          <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs space-y-2">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                <Bandage className="w-3.5 h-3.5 text-rose-700" />
                                Lesiones y Ubicación
                              </span>
                              <span className="text-[10px] font-extrabold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                {dataUpp.cuantas || 1}{' '}
                                {dataUpp.cuantas === 1 ? 'lesión' : 'lesiones'}
                              </span>
                            </div>

                            <div>
                              <span className="text-[11px] font-bold text-slate-600 block mb-1">
                                Ubicación anatómica:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {ubicacionesUppList.length > 0 ? (
                                  ubicacionesUppList.map((ub) => (
                                    <span
                                      key={ub}
                                      className="text-[11px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200"
                                    >
                                      {ub}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-slate-600 italic text-[11px]">
                                    No especificada
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-600">Grados:</span>
                              <span className="text-[11px] font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                {gradosUpp ? `Grado ${gradosUpp}` : 'Sin grado'}
                              </span>
                            </div>
                          </div>

                          {/* C. Tratamiento y Dispositivos de Apoyo */}
                          <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs space-y-2">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                <LifeBuoy className="w-3.5 h-3.5 text-sky-700" />
                                Tratamiento y Apoyo
                              </span>
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                                  dataUpp.tieneTratamiento
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}
                              >
                                {dataUpp.tieneTratamiento ? 'Tratamiento Activo' : 'Sin Tratamiento'}
                              </span>
                            </div>

                            <div>
                              <span className="text-[11px] font-bold text-slate-600 block mb-0.5">
                                Curación / Insumos:
                              </span>
                              <span className="text-xs text-slate-800 font-semibold block">
                                {Array.isArray(dataUpp.tratamientos) &&
                                dataUpp.tratamientos.length > 0
                                  ? dataUpp.tratamientos.join(', ')
                                  : dataUpp.tipoTratamiento || '-'}
                              </span>
                            </div>

                            <div className="pt-1.5 border-t border-slate-100">
                              <span className="text-[11px] font-bold text-slate-600 block mb-0.5">
                                Dispositivo de apoyo:
                              </span>
                              <span className="text-xs text-slate-800 font-semibold block">
                                {dataUpp.tieneDispositivoApoyo
                                  ? [
                                      dataUpp.dispositivoAro && 'Aro',
                                      dataUpp.dispositivoGuantesAgua && 'Guantes con agua',
                                      dataUpp.dispositivoOtro,
                                    ]
                                      .filter(Boolean)
                                      .join(', ') || 'SÍ'
                                  : 'NO'}
                              </span>
                            </div>
                          </div>

                          {/* D. Braden, Nutrición y Colchón */}
                          <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs space-y-2">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                <HeartPulse className="w-3.5 h-3.5 text-rose-700" />
                                Braden, Nutrición y Cuidados
                              </span>
                              {bradenInfo && (
                                <span
                                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${bradenInfo.color}`}
                                >
                                  Braden: {dataUpp.escalaBraden} pts · {bradenInfo.label}
                                </span>
                              )}
                            </div>

                            <div>
                              <span className="text-[11px] font-bold text-slate-600 block mb-0.5">
                                Nutrición:
                              </span>
                              <span className="text-xs text-slate-800 font-semibold block">
                                {[
                                  (dataUpp.nutricionOral || dataUpp.nutricion === 'oral') && 'Oral',
                                  (dataUpp.nutricionNpt || dataUpp.nutricion === 'NPT') && 'NPT',
                                  (dataUpp.nutricionEnteralSn ||
                                    dataUpp.nutricion === 'enteral SN') &&
                                    'Enteral SN',
                                  (dataUpp.nutricionEnteralBg ||
                                    dataUpp.nutricion === 'enteral BG') &&
                                    'Enteral BG',
                                ]
                                  .filter(Boolean)
                                  .join(', ') ||
                                  dataUpp.nutricion ||
                                  '-'}
                              </span>
                            </div>

                            <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-600">
                                Colchón anti-escaras:
                              </span>
                              <span
                                className={`text-[11px] font-extrabold px-2 py-0.5 rounded ${
                                  dataUpp.colchonAntiEscaras
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}
                              >
                                {dataUpp.colchonAntiEscaras ? 'SÍ' : 'NO'}
                              </span>
                            </div>

                            {dataUpp.observacionesColchon && (
                              <div className="text-[11px] text-slate-600 italic bg-slate-50 p-1.5 rounded border border-slate-200">
                                Obs. colchón: {dataUpp.observacionesColchon}
                              </div>
                            )}
                          </div>
                        </div>

                        {dataUpp.observaciones && (
                          <div className="p-2.5 rounded-lg bg-rose-50/60 border border-rose-100 text-slate-800 space-y-0.5">
                            <span className="font-bold text-[11px] text-rose-900 block">
                              Observaciones adicionales:
                            </span>
                            <p className="italic text-xs text-slate-700">{dataUpp.observaciones}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* CASO 4: Sin UPP / Piel Íntegra */}
                    {isUpp && dataUpp && !dataUpp.tieneUpp && (
                      <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 text-xs">
                            Evaluación de Piel
                          </span>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {dataUpp.motivoAusente
                              ? `Cama / Paciente: ${dataUpp.motivoAusente}`
                              : 'Piel Íntegra / Sin LPP'}
                          </span>
                        </div>
                        {dataUpp.observaciones && (
                          <div className="text-xs text-slate-700 italic bg-slate-50 p-2 rounded border border-slate-200">
                            Observaciones: {dataUpp.observaciones}
                          </div>
                        )}
                      </div>
                    )}

                    {item.errorMessage && (
                      <div className="text-[11px] text-rose-600 bg-rose-50 p-2 rounded-lg">
                        <b>Error de sincronización:</b> {item.errorMessage}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
