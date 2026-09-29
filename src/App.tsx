import { useState, useEffect, useCallback } from 'react';
import { Settings, Wifi, ShieldCheck, HeartPulse, Award, Syringe, Bandage, Keyboard, ClipboardList, BarChart3, Droplets } from 'lucide-react';
import type { BasePatientData, FormType, StoredRecord } from './types/form';
import type { AccesoPerifericoForm as AccesoFormType, UppForm as UppFormType, SondaVesicalForm as SondaFormType } from './types/form';
import { formatCurrentDateTime, localDateISO } from './utils/dateUtils';
import { recordDay } from './utils/records';
import { haptics } from './utils/haptics';
import { isModalOpen, shouldIgnoreShortcut } from './utils/keyboard';
import {
  getPatientContextMemory,
  savePatientContextMemory,
  getStoredRecords,
  getStoredWebhookUrl,
  getStaffBySector,
  cleanupLegacyStorage,
  isRecordSynced,
} from './services/storageService';
import { advancePlace, stepBed, formatPlace } from './config/sectorConfig';
import { APP_VERSION } from './config/version';
import { SHIFT_LABEL } from './config/shift';

import { RECORDS_CHANGED_EVENT, submitPatientRecord, syncPendingRecords, undoRecord } from './services/webhookService';
import { PatientHeader } from './components/common/PatientHeader';
import { ModuleTabs, type ActiveTab } from './components/navigation/ModuleTabs';
import { AccesoPerifericoForm } from './components/forms/AccesoPerifericoForm';
import { UppForm } from './components/forms/UppForm';
import { SondaVesicalForm } from './components/forms/SondaVesicalForm';
import { HistoryView } from './components/history/HistoryView';
import { StatsView } from './components/stats/StatsView';
import { SettingsModal } from './components/common/SettingsModal';
import { ShiftSummaryModal } from './components/common/ShiftSummaryModal';
import { ToastNotification, type ToastData } from './components/common/ToastNotification';
import { UpdateBanner } from './components/common/UpdateBanner';

/** id del <form> de cada ronda, para el atajo Enter. */
const FORM_IDS: Partial<Record<ActiveTab, string>> = {
  ACCESO_PERIFERICO: 'acceso-periferico-form',
  UPP: 'upp-form',
  SONDA_VESICAL: 'sonda-vesical-form',
};

const TOAST_PREFIX: Record<FormType, string> = {
  ACCESO_PERIFERICO: 'Vía',
  UPP: 'LPP',
  SONDA_VESICAL: 'Sonda',
};

function situacionTexto(formType: FormType, data: AccesoFormType | UppFormType | SondaFormType): string {
  if (formType === 'ACCESO_PERIFERICO') {
    const d = data as AccesoFormType;
    if (d.tieneAcceso) return 'Con vía';
    if (d.tipoAccesoAlternativo === 'acceso_central') return 'Acceso Central';
    if (d.tipoAccesoAlternativo === 'percutaneo') return 'Percutáneo';
    return d.motivoAusente || 'Sin vía';
  }
  if (formType === 'UPP') {
    const d = data as UppFormType;
    return d.tieneUpp ? 'Con LPP' : d.motivoAusente || 'Piel Íntegra';
  }
  const d = data as SondaFormType;
  if (d.motivoAusente) return d.motivoAusente;
  return d.tieneSonda === 'SI' ? `Con sonda Fr ${d.numeroSonda || '?'}` : 'Sin sonda';
}

const SIDEBAR_ITEMS: {
  tab: ActiveTab;
  title: string;
  subtitle: string;
  icon: typeof Syringe;
  active: string;
  iconBg: string;
  countColor: string;
}[] = [
  { tab: 'ACCESO_PERIFERICO', title: 'Ronda 1: Vías Periféricas', subtitle: 'Inspección de catéteres y rótulos', icon: Syringe, active: 'bg-sky-50/90 border-sky-400 text-sky-950 ring-2 ring-sky-200', iconBg: 'bg-sky-600', countColor: 'text-sky-800' },
  { tab: 'UPP', title: 'Ronda 2: LPP', subtitle: 'Piel, Braden y colchones', icon: Bandage, active: 'bg-rose-50/90 border-rose-400 text-rose-950 ring-2 ring-rose-200', iconBg: 'bg-rose-600', countColor: 'text-rose-800' },
  { tab: 'SONDA_VESICAL', title: 'Ronda 3: Sondas vesicales', subtitle: 'Graduación, lúmenes y fijación', icon: Droplets, active: 'bg-teal-50/90 border-teal-400 text-teal-950 ring-2 ring-teal-200', iconBg: 'bg-teal-600', countColor: 'text-teal-800' },
  { tab: 'STATS', title: 'Estadísticas', subtitle: 'Resumen de la ronda', icon: BarChart3, active: 'bg-indigo-50/90 border-indigo-400 text-indigo-950 ring-2 ring-indigo-200', iconBg: 'bg-indigo-600', countColor: 'text-indigo-800' },
  { tab: 'HISTORY', title: 'Historial', subtitle: 'Registros del turno', icon: ClipboardList, active: 'bg-slate-100 border-slate-400 text-slate-950 ring-2 ring-slate-300', iconBg: 'bg-slate-600', countColor: 'text-slate-700' },
];

const KBD = 'bg-white px-1.5 py-0.5 rounded border border-slate-300 font-bold font-mono';

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
      fechaIngreso: memory.fechaIngreso || '',
      sexo: memory.sexo || '',
      sector: memory.sector,
      habitacion: memory.habitacion,
      cama: memory.cama,
      historiaClinica: memory.historiaClinica || '',
      cantidadEnfermeras: staff.enfermeras,
      cantidadAuxiliares: staff.auxiliares,
    };
  });
  const [fechaHoraTouched, setFechaHoraTouched] = useState(false);

  const closeToast = useCallback(() => setToast(null), []);

  const reloadData = useCallback(() => {
    setRecords(getStoredRecords());
    setHasWebhook(Boolean(getStoredWebhookUrl()));
  }, []);

  // Al abrir: limpiar claves viejas y enviar lo pendiente. Reintenta al volver la conexión.
  useEffect(() => {
    cleanupLegacyStorage();
    void syncPendingRecords();
    const onOnline = () => void syncPendingRecords();
    window.addEventListener('online', onOnline);
    window.addEventListener(RECORDS_CHANGED_EVENT, reloadData);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener(RECORDS_CHANGED_EVENT, reloadData);
    };
  }, [reloadData]);

  // Actualizar reloj solo si la enfermera no editó la fecha
  useEffect(() => {
    if (fechaHoraTouched) return;
    const timer = setInterval(() => {
      setPatient((prev) => ({ ...prev, fechaHora: formatCurrentDateTime() }));
    }, 30000);
    return () => clearInterval(timer);
  }, [fechaHoraTouched]);

  const persistPatientMemory = (next: BasePatientData) => {
    savePatientContextMemory({
      sector: next.sector,
      habitacion: next.habitacion,
      cama: next.cama,
      historiaClinica: next.historiaClinica || '',
      sexo: next.sexo || '',
      fechaIngreso: next.fechaIngreso || '',
    });
  };

  const handlePatientChange = useCallback((updated: Partial<BasePatientData>) => {
    if (updated.fechaHora !== undefined) {
      setFechaHoraTouched(true);
    }
    setPatient((prev) => {
      const next = { ...prev, ...updated };
      persistPatientMemory(next);
      return next;
    });
  }, []);

  const afterSuccessfulSave = (saved: BasePatientData) => {
    const next = advancePlace(saved.sector, saved.habitacion, saved.cama);
    setFechaHoraTouched(false);
    setPatient((prev) => {
      const updated = {
        ...prev,
        fechaHora: formatCurrentDateTime(),
        habitacion: next.habitacion,
        cama: next.cama,
        sexo: '' as const,
        fechaIngreso: '',
        historiaClinica: '',
      };
      persistPatientMemory(updated);
      return updated;
    });
    return next;
  };

  // Botón rápido: siguiente cama (pasa de habitación después de la última cama)
  const handleNextBed = useCallback(() => {
    const next = advancePlace(patient.sector, patient.habitacion, patient.cama);
    if (next.sectorEnd) {
      setToast({ type: 'warning', message: `Es el último lugar del sector ${patient.sector}.` });
      haptics.warning();
      return;
    }
    handlePatientChange({ habitacion: next.habitacion, cama: next.cama });
    setToast({
      type: 'success',
      message: `Avanzado a ${formatPlace(patient.sector, next.habitacion, next.cama)} (Sector ${patient.sector})`,
    });
    haptics.light();
  }, [patient.cama, patient.sector, patient.habitacion, handlePatientChange]);

  // Atajos globales (no en Stats/Historial): + / - cambian de cama, Enter guarda.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const formId = FORM_IDS[activeTab];
      if (!formId || isModalOpen()) return;

      if (e.key === 'Enter') {
        // Enter en un campo de la cabecera (fuera del formulario) también guarda.
        const el = document.activeElement as HTMLInputElement | null;
        const inHeaderInput = el?.tagName === 'INPUT' && !el.form;
        if (!inHeaderInput && (shouldIgnoreShortcut(e) || el?.tagName === 'BUTTON')) return;
        const form = document.getElementById(formId) as HTMLFormElement | null;
        if (form) {
          e.preventDefault();
          form.requestSubmit();
        }
        return;
      }

      if (shouldIgnoreShortcut(e)) return;
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleNextBed();
      } else if (e.key === '-') {
        e.preventDefault();
        const prev = stepBed(patient.sector, patient.habitacion, patient.cama, -1);
        if (prev.habitacion !== patient.habitacion || prev.cama !== patient.cama) {
          handlePatientChange(prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, handleNextBed, handlePatientChange, patient.cama, patient.habitacion, patient.sector]);

  const handleUndo = useCallback(
    async (recordId: string, prevPatient: BasePatientData) => {
      const record = getStoredRecords().find((r) => r.id === recordId);
      setPatient(prevPatient);
      persistPatientMemory(prevPatient);
      setFechaHoraTouched(true);
      const message = record ? await undoRecord(record) : 'Registro deshecho.';
      reloadData();
      setToast({
        type: 'warning',
        message: `↩️ ${message} Vuelto a Sec ${prevPatient.sector} · ${formatPlace(prevPatient.sector, prevPatient.habitacion, prevPatient.cama)}`,
      });
      haptics.warning();
    },
    [reloadData]
  );

  const handleSubmit = async (formType: FormType, formData: AccesoFormType | UppFormType | SondaFormType) => {
    const prevPatient = { ...patient };
    const res = await submitPatientRecord(formType, formData);
    reloadData();

    if (!res.success) {
      setToast({ type: 'error', message: res.message, durationMs: 8000 });
      haptics.warning();
      return;
    }

    const next = afterSuccessfulSave(formData);
    const recordId = res.recordId;
    const fin = next.sectorEnd ? ' · Último lugar del sector' : '';
    setToast({
      type: 'success',
      message: `✅ ${TOAST_PREFIX[formType]}: Sec ${formData.sector} · ${formatPlace(formData.sector, formData.habitacion, formData.cama)} (${situacionTexto(formType, formData)})${fin}`,
      action: recordId ? { label: 'Deshacer', onClick: () => void handleUndo(recordId, prevPatient) } : undefined,
      durationMs: 5000,
    });
    haptics.success();
  };

  const counts: Partial<Record<ActiveTab, number>> = {
    ACCESO_PERIFERICO: records.filter((r) => r.formType === 'ACCESO_PERIFERICO').length,
    UPP: records.filter((r) => r.formType === 'UPP').length,
    SONDA_VESICAL: records.filter((r) => r.formType === 'SONDA_VESICAL').length,
    HISTORY: records.length,
  };
  const pendingCount = records.filter((r) => !isRecordSynced(r)).length;
  const formKey = `${patient.sector}-${patient.habitacion}-${patient.cama}`;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col antialiased selection:bg-sky-200">
      <UpdateBanner />

      {/* Barra de Navegación Principal Superior */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200/80 px-3 py-2.5 md:px-6 flex items-center justify-between shadow-[var(--shadow-rest)] sticky top-0 z-30 transition-[box-shadow,border-color] duration-[var(--duration-base)] ease-[var(--ease-standard)]" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 0.625rem)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-linear-to-tr from-sky-600 to-cyan-500 text-white flex items-center justify-center shadow-[var(--shadow-rest)]">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-slate-900 text-base leading-tight">Planilla Enfermera</h1>
              <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-md leading-none">
                v{APP_VERSION}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <span className="font-medium text-slate-700">Turno {SHIFT_LABEL}</span>
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
          <button
            type="button"
            onClick={() => setIsShiftModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-linear-to-r from-amber-500 to-orange-500 text-white font-bold text-xs shadow-[var(--shadow-rest)] hover:shadow-[var(--shadow-hover)] hover:scale-[1.015] active:scale-[0.98] transition-[transform,box-shadow,background-color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] cursor-pointer"
            title={`Ver resumen y cerrar turno (${SHIFT_LABEL})`}
            aria-label="Cierre de turno"
          >
            <Award className="w-4 h-4" />
            <span className="hidden sm:inline">Cierre de Turno</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-[var(--radius-sm)] text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-slate-200/90 shadow-[var(--shadow-rest)] hover:shadow-[var(--shadow-hover)] active:scale-[0.98] transition-[transform,box-shadow,background-color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] cursor-pointer"
            title="Configurar Webhook y Planilla"
            aria-label="Configuración"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Contenedor Principal: Layout Responsivo de 2 Columnas para Chromebook/PC */}
      <div className="flex-1 w-full max-w-6xl mx-auto p-2 sm:p-4 lg:grid lg:grid-cols-12 lg:gap-5">
        {/* PANEL IZQUIERDO: Panel de Control de Ronda */}
        <aside aria-label="Panel de control del turno" className="hidden lg:block lg:col-span-4 space-y-4">
          <div className="bg-white p-4 rounded-[var(--radius-lg)] border border-slate-200/80 shadow-[var(--shadow-rest)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Relevamiento del Día</span>
              <span className="text-xs font-extrabold bg-sky-100 text-sky-800 px-2.5 py-0.5 rounded-full">{SHIFT_LABEL}</span>
            </div>

            <nav className="space-y-2" aria-label="Rondas">
              {SIDEBAR_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.tab;
                const count = counts[item.tab];
                return (
                  <button
                    key={item.tab}
                    type="button"
                    onClick={() => setActiveTab(item.tab)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full p-3 rounded-[var(--radius-md)] border text-left flex items-center justify-between transition-[transform,box-shadow,background-color,border-color,color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] hover:scale-[1.015] hover:-translate-y-0.5 cursor-pointer ${
                      isActive
                        ? `${item.active} shadow-[var(--shadow-rest)]`
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-[var(--radius-sm)] ${item.iconBg} text-white flex items-center justify-center shadow-xs`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-extrabold text-sm block leading-tight">{item.title}</span>
                        <span className="text-[11px] text-slate-600">{item.subtitle}</span>
                      </div>
                    </div>
                    {count !== undefined && <span className={`font-black text-base ${item.countColor}`}>{count}</span>}
                  </button>
                );
              })}
            </nav>

            <div className="p-3 bg-slate-50 rounded-[var(--radius-md)] border border-slate-200/80 text-xs space-y-1.5">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Keyboard className="w-3.5 h-3.5 text-sky-700" />
                Atajos de Teclado (Chromebook)
              </span>
              <ul className="text-[11px] text-slate-600 space-y-1">
                <li><kbd className={KBD}>N</kbd> Selecciona NO</li>
                <li><kbd className={KBD}>S</kbd> Selecciona SÍ</li>
                <li><kbd className={KBD}>Enter</kbd> Guardar y avanzar cama</li>
                <li><kbd className={KBD}>+</kbd> / <kbd className={KBD}>-</kbd> Cambiar cama</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => setIsShiftModalOpen(true)}
              className="w-full py-3 rounded-[var(--radius-md)] bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-[var(--shadow-rest)] hover:shadow-[var(--shadow-hover)] active:scale-[0.98] hover:scale-[1.015] transition-[transform,box-shadow,background-color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>Resumen y Cierre de Turno ({SHIFT_LABEL})</span>
            </button>
          </div>
        </aside>

        {/* PANEL DERECHO: Formulario Activo y Cabecera */}
        <main className="lg:col-span-8 flex flex-col space-y-2">
          <div className="w-full lg:hidden">
            <ModuleTabs
              activeTab={activeTab}
              onSelectTab={setActiveTab}
              viasCount={counts.ACCESO_PERIFERICO ?? 0}
              uppCount={counts.UPP ?? 0}
              sondaCount={counts.SONDA_VESICAL ?? 0}
              historyCount={records.length}
              pendingCount={pendingCount}
            />
          </div>

          {activeTab !== 'HISTORY' && activeTab !== 'STATS' && (
            <div className="w-full">
              <PatientHeader
                patient={patient}
                onChange={handlePatientChange}
                onNextBed={handleNextBed}
                activeRound={activeTab}
                totalCensadasHoy={records.filter((r) => recordDay(r) === localDateISO()).length}
                records={records}
              />
            </div>
          )}

          <div className="w-full pt-1">
            {activeTab === 'ACCESO_PERIFERICO' && (
              <AccesoPerifericoForm
                key={formKey}
                patient={patient}
                onSubmit={(data) => handleSubmit('ACCESO_PERIFERICO', data)}
                onSwitchToUpp={() => setActiveTab('UPP')}
              />
            )}

            {activeTab === 'UPP' && (
              <UppForm
                key={formKey}
                patient={patient}
                onSubmit={(data) => handleSubmit('UPP', data)}
                onOpenShiftClose={() => setIsShiftModalOpen(true)}
              />
            )}

            {activeTab === 'SONDA_VESICAL' && (
              <SondaVesicalForm key={formKey} patient={patient} onSubmit={(data) => handleSubmit('SONDA_VESICAL', data)} />
            )}

            {activeTab === 'HISTORY' && <HistoryView records={records} onRefresh={reloadData} />}

            {activeTab === 'STATS' && <StatsView hasWebhook={hasWebhook} />}
          </div>
        </main>
      </div>

      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => {
            setIsSettingsOpen(false);
            reloadData();
            void syncPendingRecords();
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

      <ToastNotification toast={toast} onClose={closeToast} />
    </div>
  );
}
