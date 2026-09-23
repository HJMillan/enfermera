import type { FormType, AccesoPerifericoForm, SondaVesicalForm, UppForm, StoredRecord } from '../types/form';
import type { StatsFilters, StatsPayload } from '../types/stats';
import { mapAccesoPerifericoToRow, mapSondaToRow, mapUppToRow } from './sheetMapper';
import {
  getStoredWebhookUrl,
  saveRecordLocally,
  updateRecordStatus,
  getNotificationEmails,
  getStoredRecords,
} from './storageService';

export interface SubmitResult {
  success: boolean;
  message: string;
  savedLocally: boolean;
  syncedToCloud: boolean;
  recordId?: string;
}

export async function submitPatientRecord(
  formType: FormType,
  data: AccesoPerifericoForm | UppForm | SondaVesicalForm
): Promise<SubmitResult> {
  const rowValues =
    formType === 'ACCESO_PERIFERICO'
      ? mapAccesoPerifericoToRow(data as AccesoPerifericoForm)
      : formType === 'SONDA_VESICAL'
      ? mapSondaToRow(data as SondaVesicalForm)
      : mapUppToRow(data as UppForm);

  const recordId = 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const timestamp = new Date().toISOString();

  const record: StoredRecord = {
    id: recordId,
    formType,
    timestamp,
    data,
    rowValues,
    syncStatus: 'PENDING',
  };

  // 1. Guardar siempre primero localmente por seguridad
  saveRecordLocally(record);

  const webhookUrl = getStoredWebhookUrl();

  // Si no hay Webhook configurado, queda almacenado en local exitosamente
  if (!webhookUrl) {
    updateRecordStatus(recordId, 'SYNCED');
    return {
      success: true,
      message: 'Registro guardado localmente en el dispositivo (sin webhook configurado).',
      savedLocally: true,
      syncedToCloud: false,
      recordId,
    };
  }

  // 2. Despachar sincronización con la nube en segundo plano (Offline-first no bloqueante)
  void (async () => {
    try {
      const payload = {
        formType,
        timestamp,
        data,
        rowValues,
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      if (response.type === 'opaque' || response.ok) {
        updateRecordStatus(recordId, 'SYNCED');
      } else {
        updateRecordStatus(recordId, 'FAILED', `HTTP ${response.status}`);
      }
    } catch (error) {
      console.warn('Fallo al conectar con webhook en segundo plano, conservado en cola local:', error);
      updateRecordStatus(
        recordId,
        'FAILED',
        error instanceof Error ? error.message : 'Error desconocido al sincronizar'
      );
    }
  })();

  return {
    success: true,
    message: 'Registro guardado localmente con éxito.',
    savedLocally: true,
    syncedToCloud: false,
    recordId,
  };
}

export async function retryRecordSync(record: StoredRecord): Promise<boolean> {
  const webhookUrl = getStoredWebhookUrl();
  if (!webhookUrl) return false;

  try {
    const payload = {
      formType: record.formType,
      timestamp: record.timestamp,
      data: record.data,
      rowValues: record.rowValues,
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });

    if (response.type === 'opaque' || response.ok) {
      updateRecordStatus(record.id, 'SYNCED');
      return true;
    }
    return false;
  } catch (err) {
    updateRecordStatus(record.id, 'FAILED', err instanceof Error ? err.message : 'Error de red');
    return false;
  }
}

export interface ShiftSummaryEmailResult {
  success: boolean;
  message: string;
}

export async function requestShiftSummaryEmail(customRecipients?: string[]): Promise<ShiftSummaryEmailResult> {
  const webhookUrl = getStoredWebhookUrl();
  if (!webhookUrl) {
    return {
      success: false,
      message: 'No hay URL de Google Sheets configurada. Por favor configúrala en Ajustes (⚙️).',
    };
  }

  // 1. Sincronizar primero cualquier registro local que haya quedado pendiente
  const localRecords = getStoredRecords();
  const pendingRecords = localRecords.filter((r) => r.syncStatus !== 'SYNCED');
  if (pendingRecords.length > 0) {
    for (const rec of pendingRecords) {
      await retryRecordSync(rec);
    }
  }

  const recipients =
    customRecipients && customRecipients.length > 0 ? customRecipients : getNotificationEmails();

  try {
    const payload = {
      action: 'SEND_SHIFT_SUMMARY',
      recipients,
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });

    if (response.type === 'opaque' || response.ok) {
      return {
        success: true,
        message: `Reporte de turno despachado por correo a: ${recipients.join(', ')}`,
      };
    } else {
      throw new Error(`Error en servidor: ${response.status}`);
    }
  } catch (err) {
    console.error('Error al despachar correo de cierre de turno:', err);
    return {
      success: false,
      message: 'Fallo al solicitar el envío del correo: ' + (err instanceof Error ? err.message : 'Error de red'),
    };
  }
}

export class StatsFetchError extends Error {
  code: 'NO_WEBHOOK' | 'TIMEOUT' | 'NETWORK' | 'SCRIPT';

  constructor(code: StatsFetchError['code'], message: string) {
    super(message);
    this.name = 'StatsFetchError';
    this.code = code;
  }
}

export async function fetchSheetStatistics(filters: StatsFilters): Promise<StatsPayload> {
  const webhookUrl = getStoredWebhookUrl().trim();
  if (!webhookUrl) {
    throw new StatsFetchError('NO_WEBHOOK', 'No hay URL de Google Sheets configurada.');
  }

  let parsed: URL;
  try {
    parsed = new URL(webhookUrl);
  } catch {
    throw new StatsFetchError('NETWORK', 'La URL del webhook no es válida.');
  }

  const cbName = `peStats_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  parsed.searchParams.set('action', 'GET_STATS');
  parsed.searchParams.set('callback', cbName);
  parsed.searchParams.set('ronda', filters.ronda);

  if (filters.from) parsed.searchParams.set('from', filters.from);
  else parsed.searchParams.delete('from');
  if (filters.to) parsed.searchParams.set('to', filters.to);
  else parsed.searchParams.delete('to');
  if (filters.sector) parsed.searchParams.set('sector', filters.sector);
  else parsed.searchParams.delete('sector');

  if (filters.evaluables) parsed.searchParams.set('evaluables', '1');
  else parsed.searchParams.delete('evaluables');
  if (filters.alertas) parsed.searchParams.set('alertas', '1');
  else parsed.searchParams.delete('alertas');
  if (filters.conVia) parsed.searchParams.set('conVia', '1');
  else parsed.searchParams.delete('conVia');
  if (filters.rotuloIncompleto) parsed.searchParams.set('rotulo', 'incompleto');
  else parsed.searchParams.delete('rotulo');
  if (filters.conUpp) parsed.searchParams.set('conUpp', '1');
  else parsed.searchParams.delete('conUpp');
  if (filters.bradenAlto) parsed.searchParams.set('braden', 'alto');
  else parsed.searchParams.delete('braden');

  const url = parsed.toString();

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    let settled = false;

    const cleanup = () => {
      window.clearTimeout(timer);
      script.remove();
      delete (window as unknown as Record<string, unknown>)[cbName];
    };

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new StatsFetchError('TIMEOUT', 'El Sheet tardó demasiado en responder.'));
    }, 25000);

    (window as unknown as Record<string, unknown>)[cbName] = (data: StatsPayload) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (!data || typeof data !== 'object') {
        reject(new StatsFetchError('SCRIPT', 'El script devolvió una respuesta vacía.'));
        return;
      }
      if (data.status === 'error') {
        reject(new StatsFetchError('SCRIPT', data.message || 'El script devolvió un error.'));
        return;
      }
      if (data.status === 'online') {
        reject(
          new StatsFetchError(
            'SCRIPT',
            'El script aún no tiene Estadísticas. Copiá el Code.gs actualizado e implementá una nueva versión en Apps Script.'
          )
        );
        return;
      }
      if (data.status !== 'success' || !data.cobertura) {
        reject(new StatsFetchError('SCRIPT', 'La respuesta de estadísticas está incompleta.'));
        return;
      }
      resolve(data);
    };

    script.onerror = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(
        new StatsFetchError(
          'NETWORK',
          'No se pudo leer el Sheet. Verificá la URL y que el script esté redesplegado.'
        )
      );
    };

    script.async = true;
    script.src = url;
    document.body.appendChild(script);
  });
}
