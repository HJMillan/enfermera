import React, { useState } from 'react';
import { X, CheckCircle2, Download, Award, AlertCircle, Mail, Send, RefreshCw } from 'lucide-react';
import type { StoredRecord, AccesoPerifericoForm, UppForm } from '../../types/form';
import { exportRecordsToCSV, getNotificationEmails } from '../../services/storageService';
import { requestShiftSummaryEmail } from '../../services/webhookService';
import { haptics } from '../../utils/haptics';

interface ShiftSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: StoredRecord[];
}

export const ShiftSummaryModal: React.FC<ShiftSummaryModalProps> = ({
  isOpen,
  onClose,
  records,
}) => {
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: '',
  });

  if (!isOpen) return null;

  const emails = getNotificationEmails();

  const viasRecords = records.filter((r) => r.formType === 'ACCESO_PERIFERICO');
  const uppRecords = records.filter((r) => r.formType === 'UPP');

  const viasConAcceso = viasRecords.filter(
    (r) => (r.data as AccesoPerifericoForm).tieneAcceso
  ).length;
  const viasSinAcceso = viasRecords.length - viasConAcceso;

  const uppConLesion = uppRecords.filter(
    (r) => (r.data as UppForm).tieneUpp
  ).length;
  const uppPielIntegra = uppRecords.length - uppConLesion;

  const pendientesSync = records.filter((r) => r.syncStatus !== 'SYNCED').length;

  const handleSendEmailReport = async () => {
    setIsSending(true);
    setSendStatus({ type: 'idle', message: '' });

    try {
      const result = await requestShiftSummaryEmail();
      if (result.success) {
        haptics.success();
        setSendStatus({
          type: 'success',
          message: result.message || 'Reporte despachado exitosamente por correo electrónico.',
        });
      } else {
        setSendStatus({
          type: 'error',
          message: result.message || 'No se pudo enviar el reporte por correo.',
        });
      }
    } catch (err) {
      setSendStatus({
        type: 'error',
        message: 'Error al enviar: ' + (err instanceof Error ? err.message : 'Error de conexión'),
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-gradient-to-r from-sky-700 to-cyan-700 text-white">
          <div className="flex items-center gap-2">
            <Award className="w-6 h-6 text-sky-200" />
            <div>
              <h2 className="font-extrabold text-base md:text-lg leading-tight">Cierre de Turno (8:00 a 16:00 hs)</h2>
              <p className="text-xs text-sky-100">Resumen consolidado y despacho de reporte</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 touch-active cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-4 overflow-y-auto space-y-4 text-sm">
          {/* Métricas Generales */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
              <span className="text-2xl font-black text-slate-900 block">{records.length}</span>
              <span className="text-[11px] font-bold text-slate-600 uppercase">Total Registros</span>
            </div>

            <div className="bg-sky-50 border border-sky-100 p-3 rounded-2xl">
              <span className="text-2xl font-black text-sky-800 block">{viasRecords.length}</span>
              <span className="text-[11px] font-bold text-sky-700 uppercase">Camas Vías</span>
            </div>

            <div className="bg-rose-50 border border-rose-100 p-3 rounded-2xl">
              <span className="text-2xl font-black text-rose-800 block">{uppRecords.length}</span>
              <span className="text-[11px] font-bold text-rose-700 uppercase">Camas UPP</span>
            </div>
          </div>

          {/* Desglose Ronda 1: Vías */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs uppercase flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-600"></span>
                Ronda 1: Vías Periféricas
              </span>
              <span className="text-xs font-extrabold text-slate-700">{viasRecords.length} evaluadas</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-50 p-2 rounded-xl flex justify-between items-center">
                <span className="text-slate-600">Pacientes con vía:</span>
                <span className="font-bold text-sky-800">{viasConAcceso}</span>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl flex justify-between items-center">
                <span className="text-slate-600">Sin acceso venoso:</span>
                <span className="font-bold text-slate-700">{viasSinAcceso}</span>
              </div>
            </div>
          </div>

          {/* Desglose Ronda 2: UPP */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs uppercase flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
                Ronda 2: Úlceras por Presión
              </span>
              <span className="text-xs font-extrabold text-slate-700">{uppRecords.length} evaluadas</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-50 p-2 rounded-xl flex justify-between items-center">
                <span className="text-slate-600">Pacientes con UPP:</span>
                <span className="font-bold text-rose-800">{uppConLesion}</span>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl flex justify-between items-center">
                <span className="text-slate-600">Piel íntegra:</span>
                <span className="font-bold text-emerald-800">{uppPielIntegra}</span>
              </div>
            </div>
          </div>

          {/* Sección de Envío por Correo Electrónico */}
          <div className="bg-gradient-to-br from-sky-50 to-blue-50/70 border border-sky-200 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sky-600 text-white">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 text-xs block">Despacho de Reporte por Correo</span>
                  <span className="text-[11px] text-slate-600">Solo enviará los registros pendientes no despachados previamente</span>
                </div>
              </div>
            </div>

            <div className="bg-white/80 border border-sky-100 rounded-xl p-2 text-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-600 block">Destinatarios:</span>
              <div className="flex flex-wrap gap-1">
                {emails.map((email) => (
                  <span key={email} className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 font-mono text-[11px] font-semibold">
                    {email}
                  </span>
                ))}
              </div>
            </div>

            {sendStatus.type === 'success' && (
              <div className="p-2.5 rounded-xl bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 stroke-[2.5]" />
                <span>{sendStatus.message}</span>
              </div>
            )}

            {sendStatus.type === 'error' && (
              <div className="p-2.5 rounded-xl bg-rose-100/80 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 stroke-[2.5]" />
                <span>{sendStatus.message}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleSendEmailReport}
              disabled={isSending}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white font-bold text-xs shadow-md shadow-sky-200 flex items-center justify-center gap-2 touch-active cursor-pointer disabled:opacity-60"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Despachando reporte a Google Sheets y Correos...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Cerrar Turno y Enviar Reporte por Correo</span>
                </>
              )}
            </button>
          </div>

          {/* Estado de Sincronización Local */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {pendientesSync === 0 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600" />
              )}
              <span className="font-semibold text-slate-800">
                {pendientesSync === 0
                  ? 'Todos los registros del dispositivo sincronizados con la planilla'
                  : `${pendientesSync} registros pendientes de sincronizar en este dispositivo`}
              </span>
            </div>
          </div>
        </div>

        {/* Acciones del pie */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
          <button
            type="button"
            onClick={exportRecordsToCSV}
            className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-100 touch-active cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Descargar CSV</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-6 rounded-xl bg-slate-200 text-slate-800 hover:bg-slate-300 font-bold text-xs touch-active cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
