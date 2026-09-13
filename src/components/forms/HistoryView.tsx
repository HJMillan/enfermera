import React, { useState } from 'react';
import {
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Syringe,
  Bandage,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { StoredRecord, AccesoPerifericoForm, UppForm } from '../../types/form';
import { retryRecordSync } from '../../services/webhookService';
import { exportRecordsToCSV } from '../../services/storageService';

interface HistoryViewProps {
  records: StoredRecord[];
  onRefresh: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ records, onRefresh }) => {
  const [filter, setFilter] = useState<'ALL' | 'ACCESO_PERIFERICO' | 'UPP'>('ALL');
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
    <div className="px-3 pb-24 md:px-4 space-y-3.5 max-w-2xl mx-auto">
      {/* Barra de Acciones y Resumen */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
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
                className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 touch-active shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Enviando...' : `Sincronizar (${pendingCount})`}</span>
              </button>
            )}

            <button
              type="button"
              onClick={exportRecordsToCSV}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 touch-active shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>
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
                label: `UPP (${records.filter((r) => r.formType === 'UPP').length})`,
              },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all touch-active ${
                filter === item.id
                  ? 'bg-sky-700 text-white'
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
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
          <Clock className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="font-bold text-slate-700 text-sm">No hay registros cargados aún</p>
          <p className="text-xs text-slate-600">
            Comienza cargando pacientes en la pestaña de Acceso Periférico o UPP.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((item) => {
            const isAcceso = item.formType === 'ACCESO_PERIFERICO';
            const isExpanded = expandedId === item.id;
            const dataAcceso = isAcceso ? (item.data as AccesoPerifericoForm) : null;
            const dataUpp = !isAcceso ? (item.data as UppForm) : null;

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
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all"
              >
                {/* Cabecera del ítem */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 touch-active"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isAcceso ? 'bg-sky-100 text-sky-700' : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {isAcceso ? <Syringe className="w-5 h-5" /> : <Bandage className="w-5 h-5" />}
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
                                : dataAcceso?.tipoAccesoAlternativo === 'acceso_central'
                                ? 'bg-indigo-100 text-indigo-800'
                                : dataAcceso?.tipoAccesoAlternativo === 'percutaneo'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-slate-100 text-slate-600'
                              : dataUpp?.tieneUpp
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isAcceso
                            ? dataAcceso?.tieneAcceso
                              ? 'Con Vía'
                              : dataAcceso?.tipoAccesoAlternativo === 'acceso_central'
                              ? 'Acceso Central'
                              : dataAcceso?.tipoAccesoAlternativo === 'percutaneo'
                              ? 'Percutáneo'
                              : 'Sin Vía'
                            : dataUpp?.tieneUpp
                            ? 'Con UPP'
                            : 'Piel Íntegra'}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-600 flex items-center gap-2 mt-0.5">
                        <span>{item.data.fechaHora}</span>
                        {isAcceso && dataAcceso?.tieneAcceso && ubicacionesAcceso && (
                          <span>· Ubic: {ubicacionesAcceso}</span>
                        )}
                        {!isAcceso && dataUpp?.tieneUpp && (
                          <span>· Braden: {dataUpp.escalaBraden} pts</span>
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

                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-600" />
                    )}
                  </div>
                </div>

                {/* Detalle desplegable */}
                {isExpanded && (
                  <div className="px-4 pb-3.5 pt-1 border-t border-slate-100 bg-slate-50/70 text-xs space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-slate-700">
                      <div>
                        <span className="font-bold text-slate-600 block">Tipo Formulario:</span>
                        <span>{isAcceso ? 'Acceso Periférico' : 'Úlcera por Presión (UPP)'}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-600 block">ID Registro:</span>
                        <span className="font-mono text-[10px]">{item.id}</span>
                      </div>
                    </div>

                    {isAcceso && dataAcceso && dataAcceso.tieneAcceso && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 text-slate-700">
                        <div>
                          <span className="font-bold text-slate-600 block">Cantidad:</span>
                          <span>{dataAcceso.cuantas || 1}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-600 block">Ubicación:</span>
                          <span>{ubicacionesAcceso || '-'}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-600 block">Rótulo:</span>
                          <span>{dataAcceso.tieneRotulo ? 'SÍ' : 'NO'}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-600 block">Fijación Cinta:</span>
                          <span>
                            {dataAcceso.fijacionCinta
                              ? `SÍ (${dataAcceso.fijacionCintaTipo || 'Estándar'})`
                              : 'NO'}
                          </span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-600 block">Adherencia:</span>
                          <span>{dataAcceso.fijacionAdherencia || '-'}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-600 block">Infusión:</span>
                          <span>{dataAcceso.infusionType || '-'}</span>
                        </div>
                      </div>
                    )}

                    {isAcceso && dataAcceso && !dataAcceso.tieneAcceso && (
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 text-slate-700">
                        <div>
                          <span className="font-bold text-slate-600 block">Acceso Alternativo:</span>
                          <span>
                            {dataAcceso.tipoAccesoAlternativo === 'acceso_central'
                              ? `Acceso Central (${dataAcceso.accesoCentralUbicacion || 'S/D'})`
                              : dataAcceso.tipoAccesoAlternativo === 'percutaneo'
                              ? `Percutáneo (Rótulo: ${dataAcceso.tieneRotulo ? 'SÍ' : 'NO'})`
                              : 'Ninguno / Nada'}
                          </span>
                        </div>
                      </div>
                    )}

                    {!isAcceso && dataUpp && dataUpp.tieneUpp && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 text-slate-700">
                        <div>
                          <span className="font-bold text-slate-600 block">Fecha Ingreso:</span>
                          <span>{dataUpp.fechaIngreso || '-'}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-600 block">Área Cerrada:</span>
                          <span>{dataUpp.pasoAreaCerrada ? 'SÍ' : 'NO'}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-600 block">Cantidad:</span>
                          <span>{dataUpp.cuantas || 1}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-600 block">Grados:</span>
                          <span>{gradosUpp ? `Grado ${gradosUpp}` : '-'}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-600 block">Braden:</span>
                          <span>{dataUpp.escalaBraden} puntos</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-600 block">Tratamiento:</span>
                          <span>{dataUpp.tipoTratamiento || '-'}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-600 block">Dispositivo Apoyo:</span>
                          <span>
                            {dataUpp.tieneDispositivoApoyo
                              ? [
                                  dataUpp.dispositivoAro && 'Aro',
                                  dataUpp.dispositivoGuantesAgua && 'Guantes agua',
                                  dataUpp.dispositivoOtro,
                                ]
                                  .filter(Boolean)
                                  .join(', ') || 'SÍ'
                              : 'NO'}
                          </span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-600 block">Nutrición:</span>
                          <span>{dataUpp.nutricion || '-'}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-600 block">Colchón Anti-escaras:</span>
                          <span>{dataUpp.colchonAntiEscaras ? 'SÍ' : 'NO'}</span>
                        </div>
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
