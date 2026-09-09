import type { FormType, AccesoPerifericoForm, UppForm, StoredRecord } from '../types/form';
import { mapAccesoPerifericoToRow, mapUppToRow } from './sheetMapper';
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
}

export async function submitPatientRecord(
  formType: FormType,
  data: AccesoPerifericoForm | UppForm
): Promise<SubmitResult> {
  const rowValues =
    formType === 'ACCESO_PERIFERICO'
      ? mapAccesoPerifericoToRow(data as AccesoPerifericoForm)
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
    };
  }

  // 2. Intentar enviar al Webhook
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

    // En modo no-cors la respuesta es 'opaque' (código 0), lo que indica envío exitoso sin bloqueo de CORS
    if (response.type === 'opaque' || response.ok) {
      updateRecordStatus(recordId, 'SYNCED');
      return {
        success: true,
        message: 'Registro sincronizado con éxito con la planilla.',
        savedLocally: true,
        syncedToCloud: true,
      };
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.warn('Fallo al conectar con webhook, conservado en cola local:', error);
    updateRecordStatus(
      recordId,
      'FAILED',
      error instanceof Error ? error.message : 'Error desconocido al sincronizar'
    );
    return {
      success: true,
      message: 'Guardado en el dispositivo. Se reintentará cuando haya conexión con el webhook.',
      savedLocally: true,
      syncedToCloud: false,
    };
  }
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
