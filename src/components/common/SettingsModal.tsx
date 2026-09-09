import React, { useState } from 'react';
import { X, Settings, Link2, Check, RefreshCw, HelpCircle, FileSpreadsheet, Trash2, Mail } from 'lucide-react';
import {
  getStoredWebhookUrl,
  setStoredWebhookUrl,
  clearStoredRecords,
  getNotificationEmails,
  setNotificationEmails,
} from '../../services/storageService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHistoryCleared?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onHistoryCleared }) => {
  const [url, setUrl] = useState(() => getStoredWebhookUrl());
  const [emailsText, setEmailsText] = useState(() => getNotificationEmails().join(', '));
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [showInstructions, setShowInstructions] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setStoredWebhookUrl(url);
    const parsedEmails = emailsText
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0 && e.includes('@'));
    if (parsedEmails.length > 0) {
      setNotificationEmails(parsedEmails);
    }
    onClose();
  };

  const handleTestConnection = async () => {
    if (!url.trim()) {
      alert('Por favor, ingresa una URL primero.');
      return;
    }
    setTestStatus('testing');
    try {
      const res = await fetch(url.trim(), { method: 'GET', mode: 'no-cors' });
      if (res.type === 'opaque' || res.ok) {
        setTestStatus('success');
      } else {
        setTestStatus('error');
      }
    } catch (err) {
      console.error(err);
      setTestStatus('error');
    }
  };

  const handleClearHistory = () => {
    if (confirm('¿Deseas vaciar el historial local de este turno?')) {
      clearStoredRecords();
      if (onHistoryCleared) onHistoryCleared();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Cabecera */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-sky-700" />
            <h2 className="font-bold text-slate-900 text-lg">Configuración de Planilla</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 touch-active cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-4 overflow-y-auto space-y-4 text-sm">
          {/* Input Webhook */}
          <div>
            <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <Link2 className="w-4 h-4 text-sky-700" />
              URL de Webhook (Google Sheets / Excel)
            </label>
            <p className="text-xs text-slate-600 mb-2">
              Endpoint para sincronizar las filas con tu hoja de cálculo en la nube.
            </p>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs md:text-sm font-mono focus:border-sky-600 focus:ring-2 focus:ring-sky-100 outline-none"
            />
          </div>

          {/* Estado de prueba de conexión */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testStatus === 'testing'}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 touch-active cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testStatus === 'testing' ? 'animate-spin text-sky-700' : ''}`} />
              <span>{testStatus === 'testing' ? 'Probando...' : 'Probar Conexión'}</span>
            </button>

            {testStatus === 'success' && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <Check className="w-4 h-4 stroke-[3]" /> Conexión exitosa
              </span>
            )}
            {testStatus === 'error' && (
              <span className="text-xs font-bold text-rose-600">
                No responde. Verifica permisos públicos del script.
              </span>
            )}
          </div>

          {/* Destinatarios de Correo */}
          <div>
            <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-sky-700" />
              Destinatarios de Correo (Cierre de Turno)
            </label>
            <p className="text-xs text-slate-600 mb-2">
              Direcciones que recibirán el reporte diario consolidado (separadas por coma).
            </p>
            <input
              type="text"
              value={emailsText}
              onChange={(e) => setEmailsText(e.target.value)}
              placeholder="jesusmillan86@gmail.com, pamelaestua91@gmail.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs md:text-sm font-mono focus:border-sky-600 focus:ring-2 focus:ring-sky-100 outline-none"
            />
          </div>

          {/* Guía rápida de Google Sheets */}
          <div className="border border-sky-100 bg-sky-50/60 rounded-2xl p-3.5">
            <button
              type="button"
              onClick={() => setShowInstructions(!showInstructions)}
              className="w-full flex items-center justify-between font-bold text-sky-900 text-xs touch-active cursor-pointer"
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
                <li>Copia el código que está en el archivo <code className="bg-sky-100 px-1 rounded">google-apps-script/Code.gs</code> de este proyecto.</li>
                <li>Pega el código y haz clic en <b>Implementar &gt; Nueva implementación</b>.</li>
                <li>Selecciona tipo <b>Aplicación web</b> con acceso <b>Cualquier usuario</b>.</li>
                <li>Copia la URL de la aplicación web y pégala aquí arriba.</li>
              </ol>
            )}
          </div>

          {/* Limpieza de turno */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-800 text-xs">Historial del dispositivo</span>
              <p className="text-[11px] text-slate-600">Vaciar registros locales guardados en este navegador.</p>
            </div>
            <button
              type="button"
              onClick={handleClearHistory}
              className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-1 touch-active cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Vaciar</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-100 touch-active cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-sky-700 text-white font-bold text-sm shadow-md shadow-sky-200 hover:bg-sky-800 touch-active cursor-pointer"
          >
            Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  );
};
