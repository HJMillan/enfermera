import React, { useMemo, useState } from 'react';
import { Clock, Download, RefreshCw, Trash2 } from 'lucide-react';
import type { FormType, StoredRecord } from '../../types/form';
import { formatPlace } from '../../config/sectorConfig';
import { describeSync, syncPendingRecords, undoRecord } from '../../services/webhookService';
import { clearStoredRecords, exportRecordsToCSV, isRecordSynced } from '../../services/storageService';
import { HistoryItem } from './HistoryItem';

type Filter = 'ALL' | FormType;

interface HistoryViewProps {
  records: StoredRecord[];
  onRefresh: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ records, onRefresh }) => {
  const [filter, setFilter] = useState<Filter>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const counts = useMemo(() => {
    const c = { ALL: records.length, ACCESO_PERIFERICO: 0, UPP: 0, SONDA_VESICAL: 0, pending: 0 };
    for (const r of records) {
      c[r.formType] += 1;
      if (!isRecordSynced(r)) c.pending += 1;
    }
    return c;
  }, [records]);

  const filtered = useMemo(
    () => (filter === 'ALL' ? records : records.filter((r) => r.formType === filter)),
    [records, filter]
  );

  const handleSyncAll = async () => {
    setIsSyncing(true);
    setSyncMessage('');
    try {
      setSyncMessage(describeSync(await syncPendingRecords()));
      onRefresh();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async (item: StoredRecord) => {
    const place = `Sec ${item.data.sector} · ${formatPlace(item.data.sector, item.data.habitacion, item.data.cama)}`;
    if (!window.confirm(`¿Eliminar el registro de ${place}? Si ya llegó al Sheet, también se borra la fila.`)) return;
    setSyncMessage(await undoRecord(item));
    onRefresh();
  };

  const handleClearAll = () => {
    const aviso = counts.pending > 0
      ? `\n\nATENCIÓN: ${counts.pending} registros todavía no están confirmados en el Sheet y se perderán. Exportá el CSV antes.`
      : '';
    if (window.confirm(`¿Eliminar TODOS los registros guardados en este dispositivo? No se borra nada del Sheet.${aviso}`)) {
      clearStoredRecords();
      onRefresh();
    }
  };

  const tabs: { id: Filter; label: string }[] = [
    { id: 'ALL', label: `Todos (${counts.ALL})` },
    { id: 'ACCESO_PERIFERICO', label: `Vías (${counts.ACCESO_PERIFERICO})` },
    { id: 'UPP', label: `LPP (${counts.UPP})` },
    { id: 'SONDA_VESICAL', label: `Sondas (${counts.SONDA_VESICAL})` },
  ];

  return (
    <div className="px-3 pb-24 md:px-4 space-y-3.5 max-w-2xl lg:max-w-none mx-auto">
      <div className="bg-white p-4 rounded-[var(--radius-md)] border border-slate-200/80 shadow-[var(--shadow-rest)] space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h2 className="font-extrabold text-slate-800 text-base">Historial del Turno</h2>
            <p className="text-xs text-slate-600">
              {records.length} {records.length === 1 ? 'registro guardado' : 'registros guardados'}
              {counts.pending > 0 && ` · ${counts.pending} sin confirmar en el Sheet`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {counts.pending > 0 && (
              <button
                type="button"
                onClick={handleSyncAll}
                disabled={isSyncing}
                className="px-3 py-2 rounded-[var(--radius-sm)] bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-[var(--shadow-rest)] hover:shadow-[var(--shadow-hover)] transition-[transform,box-shadow,background-color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Enviando...' : `Sincronizar (${counts.pending})`}</span>
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
                onClick={handleClearAll}
                className="px-2.5 py-2 rounded-[var(--radius-sm)] bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1 shadow-[var(--shadow-rest)] hover:shadow-[var(--shadow-hover)] transition-[transform,box-shadow,background-color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] cursor-pointer"
                aria-label="Limpiar todos los registros del dispositivo"
                title="Limpiar todos los registros del dispositivo"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Limpiar turno</span>
              </button>
            )}
          </div>
        </div>

        {syncMessage && (
          <p role="status" className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] px-3 py-2">
            {syncMessage}
          </p>
        )}

        <div className="flex gap-1.5 pt-1 flex-wrap" role="group" aria-label="Filtrar por ronda">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              aria-pressed={filter === item.id}
              className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold transition-[transform,box-shadow,background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] cursor-pointer ${
                filter === item.id ? 'bg-sky-700 text-white shadow-[var(--shadow-rest)]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white p-8 rounded-[var(--radius-md)] border border-slate-200/80 shadow-[var(--shadow-rest)] text-center space-y-2">
          <Clock className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="font-bold text-slate-700 text-sm">No hay registros cargados aún</p>
          <p className="text-xs text-slate-600">Comienza cargando pacientes en Vías, LPP o Sondas.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((item) => (
            <HistoryItem
              key={item.id}
              item={item}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
              onDelete={() => void handleDelete(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
