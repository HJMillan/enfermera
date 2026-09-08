import type { FormType, AccesoPerifericoForm, UppForm, StoredRecord } from '../types/form';
import { mapAccesoPerifericoToRow, mapUppToRow } from './sheetMapper';
import { getStoredWebhookUrl, saveRecordLocally, updateRecordStatus } from './storageService';

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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      // Si Google Apps Script redirige, follow garantiza que se complete
      redirect: 'follow',
    });

    if (!response.ok && response.type !== 'opaque') {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    updateRecordStatus(recordId, 'SYNCED');
    return {
      success: true,
      message: 'Registro sincronizado con éxito con la planilla.',
      savedLocally: true,
      syncedToCloud: true,
    };
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    if (response.ok || response.type === 'opaque') {
      updateRecordStatus(record.id, 'SYNCED');
      return true;
    }
    return false;
  } catch (err) {
    updateRecordStatus(record.id, 'FAILED', err instanceof Error ? err.message : 'Error de red');
    return false;
  }
}
