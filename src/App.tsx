import { useState, useEffect, useCallback } from 'react';
import { Settings, Wifi, ShieldCheck, HeartPulse, Award, Syringe, Bandage, Keyboard, ClipboardList, BarChart3 } from 'lucide-react';
import type { BasePatientData, AccesoPerifericoForm as AccesoFormType, UppForm as UppFormType, StoredRecord } from './types/form';
import { formatCurrentDateTime } from './utils/dateUtils';
import { haptics } from './utils/haptics';
import {
  getPatientContextMemory,
  savePatientContextMemory,
  getStoredRecords,
  getStoredWebhookUrl,
  getStaffBySector,
  deleteRecordLocally,
} from './services/storageService';
import { MAX_BEDS } from './config/sectorConfig';

import { submitPatientRecord } from './services/webhookService';
import { PatientHeader } from './components/common/PatientHeader';
import { ModuleTabs, type ActiveTab } from './components/navigation/ModuleTabs';
import { AccesoPerifericoForm } from './components/forms/AccesoPerifericoForm';
import { UppForm } from './components/forms/UppForm';
import { HistoryView } from './components/forms/HistoryView';
import { StatsView } from './components/forms/StatsView';
import { SettingsModal } from './components/common/SettingsModal';
import { ShiftSummaryModal } from './components/common/ShiftSummaryModal';
import { ToastNotification, type ToastData } from './components/common/ToastNotification';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('ACCESO_PERIFERICO');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [records, setRecords] = useState<StoredRecord[]>(() => getStoredRecords());
  const [hasWebhook, setHasWebhook] = useState<boolean>(() => Boolean(getStoredWebhookUrl()));

  // Contexto de paciente persistente
  const [patient, setPatient] = useState<BasePatientData>(() => {
    const memory = getPatientContextMemory();
    const staff = getStaffBySector(memory.sector);
    return {
      fechaHora: formatCurrentDateTime(),
      sector: memory.sector,
      habitacion: memory.habitacion,
      cama: memory.cama,
      historiaClinica: memory.historiaClinica || '',
      cantidadEnfermeras: staff.enfermeras,
      cantidadAuxiliares: staff.auxiliares,
    };
  });

  // Cargar registros e información de webhook
  const reloadData = useCallback(() => {
    setRecords(getStoredRecords());
    setHasWebhook(Boolean(getStoredWebhookUrl()));
  }, []);

  // Actualizar reloj
  useEffect(() => {
    const timer = setInterval(() => {
      setPatient((prev) => ({ ...prev, fechaHora: formatCurrentDateTime() }));
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Manejo de cambios en el paciente
  const handlePatientChange = useCallback((updated: Partial<BasePatientData>) => {
    setPatient((prev) => {
      const next = { ...prev, ...updated };
      savePatientContextMemory({
        sector: next.sector,
        habitacion: next.habitacion,
        cama: next.cama,
        historiaClinica: next.historiaClinica || '',
      });
      return next;
    });
  }, []);

  // Botón rápido: Siguiente Cama (+1)
  const handleNextBed = useCallback(() => {
    const currentBed = parseInt(patient.cama, 10);
    const nextBed = isNaN(currentBed) ? 1 : Math.min(MAX_BEDS, currentBed + 1);
    handlePatientChange({ cama: String(nextBed) });
    setToast({
      type: 'success',
      message: `Avanzado a Cama ${nextBed} (Sector ${patient.sector} Hab ${patient.habitacion})`,
    });
    haptics.light();
  }, [patient.cama, patient.sector, patient.habitacion, handlePatientChange]);

  // Atajos de teclado globales en Chromebook (no en Stats/Historial)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab === 'STATS' || activeTab === 'HISTORY') return;

      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleNextBed();
      } else if (e.key === '-') {
        e.preventDefault();
        const current = parseInt(patient.cama, 10);
        if (!isNaN(current) && current > 1) {
          handlePatientChange({ cama: String(current - 1) });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, handleNextBed, handlePatientChange, patient.cama]);

  // Función para deshacer el último registro guardado
  const handleUndo = useCallback(
    (recordId: string, prevPatient: BasePatientData) => {
      deleteRecordLocally(recordId);
      reloadData();
      setPatient(prevPatient);
      savePatientContextMemory({
        sector: prevPatient.sector,
        habitacion: prevPatient.habitacion,
        cama: prevPatient.cama,
        historiaClinica: prevPatient.historiaClinica || '',
      });
      setToast({
        type: 'warning',
        message: `↩️ Registro deshecho. Vuelto a Sec ${prevPatient.sector} Hab ${prevPatient.habitacion} Cama ${prevPatient.cama}`,
      });
      haptics.warning();
    },
    [reloadData]
  );

  // Guardar Acceso Periférico
  const handleAccesoSubmit = async (formData: AccesoFormType) => {
    const prevPatient = { ...patient };
    const res = await submitPatientRecord('ACCESO_PERIFERICO', formData);
    reloadData();

    // Auto-avanzar cama
    const currentBed = parseInt(patient.cama, 10);
    if (!isNaN(currentBed)) {
      handlePatientChange({ cama: String(Math.min(MAX_BEDS, currentBed + 1)) });
    }

    const situacionTexto = formData.tieneAcceso
      ? 'Con vía'
      : formData.tipoAccesoAlternativo === 'acceso_central'
      ? 'Acceso Central'
      : formData.tipoAccesoAlternativo === 'percutaneo'
      ? 'Percutáneo'
      : formData.motivoAusente || (formData.tipoAccesoAlternativo === 'ausente' ? 'Ausente' : 'Sin vía');

    setToast({
      type: 'success',
      message: `✅ Vía: Sec ${formData.sector} Hab ${formData.habitacion} Cama ${formData.cama} (${situacionTexto})`,
      action: res.recordId
        ? {
            label: 'Deshacer',
            onClick: () => handleUndo(res.recordId!, prevPatient),
          }
        : undefined,
      durationMs: 5000,
    });

    haptics.success();
  };

  // Guardar UPP
  const handleUppSubmit = async (formData: UppFormType) => {
    const prevPatient = { ...patient };
    const res = await submitPatientRecord('UPP', formData);
    reloadData();

    // Auto-avanzar cama
    const currentBed = parseInt(patient.cama, 10);
    if (!isNaN(currentBed)) {
      handlePatientChange({ cama: String(Math.min(MAX_BEDS, currentBed + 1)) });
    }

    const situacionUppTexto = formData.tieneUpp
      ? 'Con UPP'
      : formData.motivoAusente
      ? formData.motivoAusente
      : 'Piel Íntegra';

    setToast({
      type: 'success',
      message: `✅ UPP: Sec ${formData.sector} Hab ${formData.habitacion} Cama ${formData.cama} (${situacionUppTexto})`,
      action: res.recordId
        ? {
            label: 'Deshacer',
            onClick: () => handleUndo(res.recordId!, prevPatient),
          }
        : undefined,
      durationMs: 5000,
    });

    haptics.success();
  };

  const viasRecords = records.filter((r) => r.formType === 'ACCESO_PERIFERICO');
  const uppRecords = records.filter((r) => r.formType === 'UPP');
  const pendingCount = records.filter((r) => r.syncStatus !== 'SYNCED').length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col antialiased selection:bg-sky-200">
      {/* Barra de Navegación Principal Superior */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200/80 px-3 py-2.5 md:px-6 flex items-center justify-between shadow-[var(--shadow-rest)] sticky top-0 z-30 transition-[box-shadow,border-color] duration-[var(--duration-base)] ease-[var(--ease-standard)]" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 0.625rem)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-linear-to-tr from-sky-600 to-cyan-500 text-white flex items-center justify-center shadow-[var(--shadow-rest)]">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-slate-900 text-base leading-tight">Planilla Enfermera</h1>
              <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-md leading-none">v1.0.0</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <span className="font-medium text-slate-700">Turno 8:00 a 16:00 hs</span>
              <span>·</span>
              {hasWebhook ? (
                <span className="text-sky-700 font-semibold flex items-center gap-0.5">
                  <ShieldCheck className="w-3 h-3" /> Nube Activa
                </span>
              ) : (
                <span className="text-amber-700 font-semibold flex items-center gap-0.5">
                  <Wifi className="w-3 h-3" /> Modo Local
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón Cierre de Turno en Header */}
          <button
            type="button"
            onClick={() => setIsShiftModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-linear-to-r from-amber-500 to-orange-500 text-white font-bold text-xs shadow-[var(--shadow-rest)] hover:shadow-[var(--shadow-hover)] hover:scale-[1.015] active:scale-[0.98] transition-[transform,box-shadow,background-color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] cursor-pointer"
            title="Ver resumen y cerrar turno a las 16:00 hs"
          >
            <Award className="w-4 h-4" />
            <span className="hidden sm:inline">Cierre de Turno</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-[var(--radius-sm)] text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-slate-200/90 shadow-[var(--shadow-rest)] hover:shadow-[var(--shadow-hover)] active:scale-[0.98] transition-[transform,box-shadow,background-color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] cursor-pointer"
            title="Configurar Webhook y Planilla"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Contenedor Principal: Layout Responsivo de 2 Columnas para Chromebook/PC */}
      <div className="flex-1 w-full max-w-6xl mx-auto p-2 sm:p-4 lg:grid lg:grid-cols-12 lg:gap-5">
        {/* PANEL IZQUIERDO: Panel de Control de Ronda */}
        <aside aria-label="Panel de control del turno" className="hidden lg:block lg:col-span-4 space-y-4">
          {/* Tarjeta de Ronda y Estado del Turno */}
          <div className="bg-white p-4 rounded-[var(--radius-lg)] border border-slate-200/80 shadow-[var(--shadow-rest)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Relevamiento del Día</span>
              <span className="text-xs font-extrabold bg-sky-100 text-sky-800 px-2.5 py-0.5 rounded-full">
                8:00 - 16:00 hs
              </span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setActiveTab('ACCESO_PERIFERICO')}
                className={`w-full p-3 rounded-[var(--radius-md)] border text-left flex items-center justify-between transition-[transform,box-shadow,background-color,border-color,color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] hover:scale-[1.015] hover:-translate-y-0.5 cursor-pointer ${
                  activeTab === 'ACCESO_PERIFERICO'
                    ? 'bg-sky-50/90 border-sky-400 text-sky-950 ring-2 ring-sky-200 shadow-[var(--shadow-rest)]'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-sky-600 text-white flex items-center justify-center shadow-xs">
                    <Syringe className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-extrabold text-sm block leading-tight">Ronda 1: Vías Periféricas</span>
                    <span className="text-[11px] text-slate-600">Inspección de catéteres y rótulos</span>
                  </div>
                </div>
                <span className="font-black text-base text-sky-800">{viasRecords.length}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('UPP')}
                className={`w-full p-3 rounded-[var(--radius-md)] border text-left flex items-center justify-between transition-[transform,box-shadow,background-color,border-color,color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] hover:scale-[1.015] hover:-translate-y-0.5 cursor-pointer ${
                  activeTab === 'UPP'
                    ? 'bg-rose-50/90 border-rose-400 text-rose-950 ring-2 ring-rose-200 shadow-[var(--shadow-rest)]'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-rose-600 text-white flex items-center justify-center shadow-xs">
                    <Bandage className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-extrabold text-sm block leading-tight">Ronda 2: UPP</span>
                    <span className="text-[11px] text-slate-600">Piel, Braden y colchones</span>
                  </div>
                </div>
                <span className="font-black text-base text-rose-800">{uppRecords.length}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('STATS')}
                className={`w-full p-3 rounded-[var(--radius-md)] border text-left flex items-center justify-between transition-[transform,box-shadow,background-color,border-color,color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] hover:scale-[1.015] hover:-translate-y-0.5 cursor-pointer ${
                  activeTab === 'STATS'
                    ? 'bg-indigo-50/90 border-indigo-400 text-indigo-950 ring-2 ring-indigo-200 shadow-[var(--shadow-rest)]'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-extrabold text-sm block leading-tight">Números</span>
                    <span className="text-[11px] text-slate-600">Cómo está la ronda, en criollo</span>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('HISTORY')}
                className={`w-full p-3 rounded-[var(--radius-md)] border text-left flex items-center justify-between transition-[transform,box-shadow,background-color,border-color,color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] hover:scale-[1.015] hover:-translate-y-0.5 cursor-pointer ${
                  activeTab === 'HISTORY'
                    ? 'bg-slate-100 border-slate-400 text-slate-950 ring-2 ring-slate-300 shadow-[var(--shadow-rest)]'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-slate-600 text-white flex items-center justify-center shadow-xs">
                    <ClipboardList className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-extrabold text-sm block leading-tight">Historial</span>
                    <span className="text-[11px] text-slate-600">Registros del turno</span>
                  </div>
                </div>
                <span className="font-black text-base text-slate-700">{records.length}</span>
              </button>
            </div>

            {/* Atajos de Chromebook */}
            <div className="p-3 bg-slate-50 rounded-[var(--radius-md)] border border-slate-200/80 text-xs space-y-1.5">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Keyboard className="w-3.5 h-3.5 text-sky-700" />
                Atajos de Teclado (Chromebook)
              </span>
              <ul className="text-[11px] text-slate-600 space-y-1">
                <li><kbd className="bg-white px-1.5 py-0.5 rounded border border-slate-300 font-bold font-mono">N</kbd> Selecciona NO</li>
                <li><kbd className="bg-white px-1.5 py-0.5 rounded border border-slate-300 font-bold font-mono">S</kbd> Selecciona SÍ</li>
                <li><kbd className="bg-white px-1.5 py-0.5 rounded border border-slate-300 font-bold font-mono">Enter</kbd> Guardar y avanzar cama</li>
                <li><kbd className="bg-white px-1.5 py-0.5 rounded border border-slate-300 font-bold font-mono">+</kbd> / <kbd className="bg-white px-1.5 py-0.5 rounded border border-slate-300 font-bold font-mono">-</kbd> Cambiar cama</li>
              </ul>
            </div>

            {/* Botón Cierre de Turno */}
            <button
              type="button"
              onClick={() => setIsShiftModalOpen(true)}
              className="w-full py-3 rounded-[var(--radius-md)] bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-[var(--shadow-rest)] hover:shadow-[var(--shadow-hover)] active:scale-[0.98] hover:scale-[1.015] transition-[transform,box-shadow,background-color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>Resumen y Cierre de Turno (16:00 hs)</span>
            </button>
          </div>
        </aside>

        {/* PANEL DERECHO: Formulario Activo y Cabecera */}
        <main className="lg:col-span-8 flex flex-col space-y-2">
          {/* Selector de Módulo (Visible en móvil / tablet) */}
          <div className="w-full lg:hidden">
            <ModuleTabs
              activeTab={activeTab}
              onSelectTab={setActiveTab}
              viasCount={viasRecords.length}
              uppCount={uppRecords.length}
              historyCount={records.length}
              pendingCount={pendingCount}
            />
          </div>

          {/* Cabecera Persistente de Paciente */}
          {activeTab !== 'HISTORY' && activeTab !== 'STATS' && (
            <div className="w-full">
              <PatientHeader
                patient={patient}
                onChange={handlePatientChange}
                onNextBed={handleNextBed}
                activeRound={activeTab}
                totalCensadasHoy={records.length}
                records={records}
              />
            </div>
          )}

          {/* Formularios */}
          <div className="w-full pt-1">
            {activeTab === 'ACCESO_PERIFERICO' && (
              <AccesoPerifericoForm
                key={`${patient.sector}-${patient.habitacion}-${patient.cama}`}
                patient={patient}
                onSubmit={handleAccesoSubmit}
                onSwitchToUpp={() => setActiveTab('UPP')}
              />
            )}

            {activeTab === 'UPP' && (
              <UppForm
                key={`${patient.sector}-${patient.habitacion}-${patient.cama}`}
                patient={patient}
                onSubmit={handleUppSubmit}
                onOpenShiftClose={() => setIsShiftModalOpen(true)}
              />
            )}

            {activeTab === 'HISTORY' && (
              <HistoryView records={records} onRefresh={reloadData} />
            )}

            {activeTab === 'STATS' && (
              <StatsView hasWebhook={hasWebhook} />
            )}
          </div>
        </main>
      </div>

      {/* Modales y Notificaciones */}
      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => {
            setIsSettingsOpen(false);
            reloadData();
          }}
          onHistoryCleared={reloadData}
        />
      )}

      {isShiftModalOpen && (
        <ShiftSummaryModal
          isOpen={isShiftModalOpen}
          onClose={() => setIsShiftModalOpen(false)}
          records={records}
          onShiftReset={reloadData}
        />
      )}

      <ToastNotification toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
