import React, { useState, useSyncExternalStore } from 'react';
import { X, Settings, Link2, Check, RefreshCw, HelpCircle, FileSpreadsheet, Trash2, Smartphone, Download, KeyRound } from 'lucide-react';
import {
  getStoredWebhookUrl,
  setStoredWebhookUrl,
  getStoredWebhookToken,
  setStoredWebhookToken,
  clearStoredRecords,
  getStoredRecords,
  isRecordSynced,
} from '../../services/storageService';
import { testWebhookConnection } from '../../services/webhookService';
import { APP_VERSION, SCRIPT_VERSION } from '../../config/version';
import { getInstallPrompt, promptInstall, subscribeInstallPrompt } from '../../utils/installPrompt';
import { ModalShell } from './ModalShell';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHistoryCleared?: () => void;
}

const inputClass =
  'w-full px-3.5 py-2.5 rounded-[var(--radius-sm)] border border-slate-300 text-xs md:text-sm font-mono focus:border-sky-600 focus:ring-2 focus:ring-sky-100 outline-none transition-[background-color,border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-smooth)]';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onHistoryCleared }) => {
  const [url, setUrl] = useState(() => getStoredWebhookUrl());
  const [token, setToken] = useState(() => getStoredWebhookToken());
  const [testStatus, setTestStatus] = useState<{ state: 'idle' | 'testing' | 'success' | 'error'; message: string }>({
    state: 'idle',
    message: '',
  });
  const [showInstructions, setShowInstructions] = useState(false);
  const installPrompt = useSyncExternalStore(subscribeInstallPrompt, getInstallPrompt);
  const [isInstalled, setIsInstalled] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches
  );

  if (!isOpen) return null;

  const handleSave = () => {
    setStoredWebhookUrl(url);
    setStoredWebhookToken(token);
    onClose();
  };

  const handleTestConnection = async () => {
    if (!url.trim()) {
      setTestStatus({ state: 'error', message: 'Ingresá una URL primero.' });
      return;
    }
    setTestStatus({ state: 'testing', message: '' });
    const res = await testWebhookConnection(url, token);
    setTestStatus({ state: res.ok ? 'success' : 'error', message: res.message });
  };

  const handleClearHistory = () => {
    const pending = getStoredRecords().filter((r) => !isRecordSynced(r)).length;
    const warning = pending > 0
      ? `\n\nATENCIÓN: ${pending} registros todavía no están confirmados en el Sheet y se perderán. Exportá el CSV antes.`
      : '';
    if (confirm(`¿Vaciar el historial local de este dispositivo?${warning}`)) {
      clearStoredRecords();
      onHistoryCleared?.();
    }
  };

  const handleInstallPWA = async () => {
    if (installPrompt) {
      if (await promptInstall()) setIsInstalled(true);
    } else {
      alert(
        'Para instalar en iPhone/iPad: toca el botón Compartir y selecciona "Agregar a pantalla de inicio".\nEn Chrome de Android o PC: haz clic en el menú (⋮) y selecciona "Instalar aplicación".'
      );
    }
  };

  return (
    <ModalShell labelledBy="settings-title" onClose={onClose}>
      {/* Cabecera */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-sky-700" />
          <div>
            <h2 id="settings-title" className="font-bold text-slate-900 text-lg">Configuración de Planilla</h2>
            <p className="text-[11px] font-semibold text-slate-500">
              App v{APP_VERSION} · script esperado v{SCRIPT_VERSION}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar configuración"
          className="p-1.5 rounded-[var(--radius-sm)] text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-[transform,background-color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Contenido */}
      <div className="p-4 overflow-y-auto space-y-4 text-sm">
        <div>
          <label htmlFor="settings-url" className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
            <Link2 className="w-4 h-4 text-sky-700" />
            URL de Webhook (Google Sheets)
          </label>
          <p className="text-xs text-slate-600 mb-2">
            Endpoint para sincronizar las filas con tu hoja de cálculo. Dejalo vacío para trabajar solo en el dispositivo.
          </p>
          <input
            id="settings-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/.../exec"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="settings-token" className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
            <KeyRound className="w-4 h-4 text-sky-700" />
            Clave del script
          </label>
          <p className="text-xs text-slate-600 mb-2">
            La misma que <code className="bg-slate-100 px-1 rounded">API_TOKEN</code> en las propiedades del Apps Script.
          </p>
          <input
            id="settings-token"
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Clave"
            className={inputClass}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testStatus.state === 'testing'}
            className="px-3.5 py-2 rounded-[var(--radius-sm)] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-[var(--shadow-rest)] hover:shadow-[var(--shadow-hover)] transition-[transform,box-shadow,background-color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testStatus.state === 'testing' ? 'animate-spin text-sky-700' : ''}`} />
            <span>{testStatus.state === 'testing' ? 'Probando...' : 'Probar Conexión'}</span>
          </button>

          <span role="status" className="text-xs font-bold">
            {testStatus.state === 'success' && (
              <span className="text-emerald-600 flex items-center gap-1">
                <Check className="w-4 h-4 stroke-[3]" /> {testStatus.message}
              </span>
            )}
            {testStatus.state === 'error' && <span className="text-rose-600">{testStatus.message}</span>}
          </span>
        </div>

        {/* Guía rápida de Google Sheets */}
        <div className="border border-sky-100 bg-sky-50/70 rounded-[var(--radius-md)] p-3.5 shadow-[var(--shadow-rest)]">
          <button
            type="button"
            onClick={() => setShowInstructions(!showInstructions)}
            aria-expanded={showInstructions}
            className="w-full flex items-center justify-between font-bold text-sky-900 text-xs cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-sky-700" />
              ¿Cómo conectar con Google Sheets?
            </span>
            <HelpCircle className="w-4 h-4 text-sky-600" />
          </button>

          {showInstructions && (
            <ol className="mt-2.5 list-decimal list-inside space-y-1 text-xs text-slate-700 leading-relaxed pl-1">
              <li>Abre tu Google Sheet y ve a <b>Extensiones &gt; Apps Script</b>.</li>
              <li>Pega el código de <code className="bg-sky-100 px-1 rounded">google-apps-script/Code.gs</code> (v{SCRIPT_VERSION}).</li>
              <li>En <b>Configuración del proyecto › Propiedades del script</b> agrega <b>API_TOKEN</b> con una clave, y cárgala arriba.</li>
              <li>Haz clic en <b>Implementar &gt; Nueva implementación</b>, tipo <b>Aplicación web</b>, acceso <b>Cualquier usuario</b>.</li>
              <li>Copia la URL de la aplicación web y pégala arriba.</li>
              <li>Cada vez que cambie el Code.gs: <b>Implementar → Administrar implementaciones → Nueva versión</b>.</li>
            </ol>
          )}
        </div>

        {/* Instalación como App (PWA / Offline) */}
        <div className="border border-slate-200/80 bg-slate-50/90 rounded-[var(--radius-md)] p-3.5 flex items-center justify-between gap-2 shadow-[var(--shadow-rest)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-slate-800 text-xs block">
                {isInstalled ? 'App Instalada en este equipo' : 'Instalar en Pantalla de Inicio'}
              </span>
              <span className="text-[11px] text-slate-600 truncate block">
                {isInstalled
                  ? 'Funcionando en modo independiente a pantalla completa'
                  : 'Abre la planilla como app y úsala sin conexión'}
              </span>
            </div>
          </div>

          {!isInstalled && (
            <button
              type="button"
              onClick={handleInstallPWA}
              className="px-3 py-1.5 rounded-[var(--radius-sm)] bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs flex items-center gap-1 shadow-[var(--shadow-rest)] hover:shadow-[var(--shadow-hover)] transition-[transform,box-shadow,background-color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] hover:scale-[1.015] cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Instalar</span>
            </button>
          )}
        </div>

        {/* Limpieza del dispositivo */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="font-bold text-slate-800 text-xs">Historial del dispositivo</span>
            <p className="text-[11px] text-slate-600">Vaciar registros locales guardados en este navegador.</p>
          </div>
          <button
            type="button"
            onClick={handleClearHistory}
            className="px-3 py-1.5 rounded-[var(--radius-sm)] border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-1 shadow-[var(--shadow-rest)] hover:shadow-[var(--shadow-hover)] transition-[transform,box-shadow,background-color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Vaciar</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 bg-slate-50 border-t border-slate-100 space-y-2">
        <p className="text-[10px] font-semibold text-slate-500 text-center">Planilla Enfermera v{APP_VERSION}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-[var(--radius-sm)] border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-100 shadow-[var(--shadow-rest)] hover:shadow-[var(--shadow-hover)] transition-[transform,box-shadow,background-color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-[var(--radius-sm)] bg-sky-700 text-white font-bold text-sm shadow-[var(--shadow-hover)] hover:bg-sky-800 transition-[transform,box-shadow,background-color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] hover:scale-[1.015] cursor-pointer"
          >
            Guardar Configuración
          </button>
        </div>
      </div>
    </ModalShell>
  );
};
