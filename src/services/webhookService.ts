import type { FormType, AccesoPerifericoForm, SondaVesicalForm, UppForm, StoredRecord } from '../types/form';
import type { StatsFilters, StatsPayload } from '../types/stats';
import { HEADERS_BY_FORM, mapRecordToRow } from './sheetMapper';
import {
  getStoredWebhookUrl,
  getStoredWebhookToken,
  saveRecordLocally,
  updateRecordStatus,
  getStoredRecords,
  deleteRecordLocally,
} from './storageService';

/** Se emite cuando cambia el estado de sincronización de algún registro guardado. */
export const RECORDS_CHANGED_EVENT = 'pe-records-changed';

function notifyRecordsChanged(): void {
  window.dispatchEvent(new Event(RECORDS_CHANGED_EVENT));
}

export class WebhookError extends Error {
  code: 'NO_WEBHOOK' | 'TIMEOUT' | 'NETWORK' | 'SCRIPT' | 'UNAUTHORIZED' | 'OLD_SCRIPT';

  constructor(code: WebhookError['code'], message: string) {
    super(message);
    this.name = 'WebhookError';
    this.code = code;
  }
}

interface ScriptResponse {
  status?: string;
  message?: string;
  code?: string;
  [key: string]: unknown;
}

interface JsonpOptions {
  url?: string;
  token?: string;
  timeoutMs?: number;
}

/**
 * GET por JSONP al Apps Script. Es la única forma de LEER la respuesta del script
 * desde el navegador (el POST va en modo no-cors y su respuesta es opaca).
 */
function jsonp<T extends ScriptResponse>(
  params: Record<string, string | undefined>,
  options: JsonpOptions = {}
): Promise<T> {
  const webhookUrl = (options.url ?? getStoredWebhookUrl()).trim();
  if (!webhookUrl) {
    return Promise.reject(new WebhookError('NO_WEBHOOK', 'No hay URL de Google Sheets configurada.'));
  }

  let parsed: URL;
  try {
    parsed = new URL(webhookUrl);
  } catch {
    return Promise.reject(new WebhookError('NETWORK', 'La URL del webhook no es válida.'));
  }

  const cbName = `pe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const token = options.token ?? getStoredWebhookToken();
  const all = { ...params, token: token || undefined, callback: cbName };
  for (const [key, value] of Object.entries(all)) {
    if (value) parsed.searchParams.set(key, value);
    else parsed.searchParams.delete(key);
  }

  const globalScope = window as unknown as Record<string, unknown>;

  return new Promise<T>((resolve, reject) => {
    const script = document.createElement('script');
    let settled = false;

    const finish = () => {
      settled = true;
      window.clearTimeout(timer);
      script.remove();
      delete globalScope[cbName];
    };

    const timer = window.setTimeout(() => {
      if (settled) return;
      finish();
      reject(new WebhookError('TIMEOUT', 'El Sheet tardó demasiado en responder.'));
    }, options.timeoutMs ?? 25000);

    globalScope[cbName] = (data: T) => {
      if (settled) return;
      finish();
      if (!data || typeof data !== 'object') {
        reject(new WebhookError('SCRIPT', 'El script devolvió una respuesta vacía.'));
        return;
      }
      if (data.code === 'UNAUTHORIZED') {
        reject(new WebhookError('UNAUTHORIZED', data.message || 'Clave incorrecta. Revisala en Ajustes.'));
        return;
      }
      if (data.status === 'error') {
        reject(new WebhookError('SCRIPT', data.message || 'El script devolvió un error.'));
        return;
      }
      resolve(data);
    };

    script.onerror = () => {
      if (settled) return;
      finish();
      reject(new WebhookError('NETWORK', 'No se pudo conectar con el Sheet. Verificá la URL y la conexión.'));
    };

    script.async = true;
    script.src = parsed.toString();
    document.body.appendChild(script);
  });
}

/** Un script viejo no conoce la acción y responde con el health check ("online"). */
function assertKnownAction(data: ScriptResponse): void {
  if (data.status === 'online') {
    throw new WebhookError(
      'OLD_SCRIPT',
      'El script del Sheet está desactualizado. Pegá el Code.gs nuevo e implementá una nueva versión.'
    );
  }
}

// ---------------------------------------------------------------------------
// Envío de registros
// ---------------------------------------------------------------------------

const inFlight = new Map<string, Promise<void>>();

async function postRecord(record: StoredRecord): Promise<void> {
  const webhookUrl = getStoredWebhookUrl();
  if (!webhookUrl) {
    updateRecordStatus(record.id, 'LOCAL');
    return;
  }
  const payload = {
    token: getStoredWebhookToken() || undefined,
    formType: record.formType,
    recordId: record.id,
    timestamp: record.timestamp,
    headers: HEADERS_BY_FORM[record.formType],
    rowValues: record.rowValues,
  };
  try {
    // no-cors: la respuesta es opaca. Solo sabemos que salió; la llegada se confirma con ACK.
    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    updateRecordStatus(record.id, 'SENT');
  } catch (error) {
    updateRecordStatus(
      record.id,
      'FAILED',
      error instanceof Error ? error.message : 'Error de red al enviar'
    );
  }
}

function sendRecord(record: StoredRecord): Promise<void> {
  const existing = inFlight.get(record.id);
  if (existing) return existing;
  const promise = postRecord(record).finally(() => inFlight.delete(record.id));
  inFlight.set(record.id, promise);
  return promise;
}

const ACK_CHUNK = 40;

/**
 * Pregunta al Sheet qué registros SENT ya tienen su fila. Los encontrados pasan a SYNCED;
 * los que no, a FAILED (se reenvían en la próxima sincronización, sin duplicar).
 */
async function verifySentRecords(ids: string[]): Promise<{ confirmed: number; missing: number }> {
  let confirmed = 0;
  let missing = 0;
  for (let i = 0; i < ids.length; i += ACK_CHUNK) {
    const chunk = ids.slice(i, i + ACK_CHUNK);
    const data = await jsonp<ScriptResponse & { found?: string[] }>({ action: 'ACK', ids: chunk.join(',') });
    assertKnownAction(data);
    const found = new Set(data.found || []);
    chunk.forEach((id) => {
      if (found.has(id)) {
        updateRecordStatus(id, 'SYNCED');
        confirmed += 1;
      } else {
        updateRecordStatus(id, 'FAILED', 'No se confirmó en el Sheet; se reintentará.');
        missing += 1;
      }
    });
  }
  return { confirmed, missing };
}

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

/** Tiempo que se espera entre el POST y la verificación (Apps Script tarda en escribir). */
const ACK_DELAY_MS = 3000;

export interface SubmitResult {
  success: boolean;
  message: string;
  recordId?: string;
}

export async function submitPatientRecord(
  formType: FormType,
  data: AccesoPerifericoForm | UppForm | SondaVesicalForm
): Promise<SubmitResult> {
  const recordId = 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const record: StoredRecord = {
    id: recordId,
    formType,
    timestamp: new Date().toISOString(),
    data,
    rowValues: mapRecordToRow(formType, data),
    syncStatus: getStoredWebhookUrl() ? 'PENDING' : 'LOCAL',
  };

  // 1. Siempre primero en el dispositivo
  if (!saveRecordLocally(record)) {
    return {
      success: false,
      message: 'No se pudo guardar en el dispositivo (almacenamiento lleno o bloqueado). Exportá el CSV y liberá espacio.',
    };
  }

  // 2. Envío y confirmación en segundo plano
  if (record.syncStatus === 'PENDING') {
    void (async () => {
      await sendRecord(record);
      notifyRecordsChanged();
      await wait(ACK_DELAY_MS);
      const current = getStoredRecords().find((r) => r.id === recordId);
      if (current?.syncStatus !== 'SENT') return;
      try {
        await verifySentRecords([recordId]);
      } catch {
        // Sin confirmación por ahora: queda SENT y se verifica en la próxima sincronización.
      }
      notifyRecordsChanged();
    })();
  }

  return { success: true, message: 'Registro guardado.', recordId };
}

export interface SyncSummary {
  noWebhook: boolean;
  sent: number;
  confirmed: number;
  failed: number;
  error?: string;
}

let syncInProgress: Promise<SyncSummary> | null = null;

/**
 * Envía todo lo que no está confirmado (LOCAL, PENDING, FAILED) y verifica lo enviado.
 * Es seguro llamarlo varias veces: el script ignora ids repetidos.
 */
export function syncPendingRecords(): Promise<SyncSummary> {
  if (syncInProgress) return syncInProgress;
  syncInProgress = (async (): Promise<SyncSummary> => {
    if (!getStoredWebhookUrl()) {
      return { noWebhook: true, sent: 0, confirmed: 0, failed: 0 };
    }
    const summary: SyncSummary = { noWebhook: false, sent: 0, confirmed: 0, failed: 0 };
    // Dos vueltas: lo que la verificación marca como no llegado (por ejemplo, enviado
    // con una clave vieja) se reenvía en la misma sincronización.
    for (let round = 0; round < 2; round++) {
      const toSend = getStoredRecords().filter(
        (r) => r.syncStatus === 'LOCAL' || r.syncStatus === 'PENDING' || r.syncStatus === 'FAILED'
      );
      for (const record of toSend) {
        // Pudo borrarse (Deshacer / Historial) mientras se enviaban los anteriores.
        const current = getStoredRecords().find((r) => r.id === record.id);
        if (!current || current.syncStatus === 'SENT' || current.syncStatus === 'SYNCED') continue;
        await sendRecord(current);
        summary.sent += 1;
      }
      notifyRecordsChanged();

      const sentIds = getStoredRecords().filter((r) => r.syncStatus === 'SENT').map((r) => r.id);
      if (sentIds.length === 0) break;
      if (toSend.length > 0) await wait(ACK_DELAY_MS);
      try {
        const res = await verifySentRecords(sentIds);
        summary.confirmed += res.confirmed;
        if (res.missing === 0) break;
      } catch (err) {
        summary.error = err instanceof Error ? err.message : 'No se pudo verificar con el Sheet.';
        break;
      }
    }
    summary.failed = getStoredRecords().filter((r) => r.syncStatus === 'FAILED').length;
    notifyRecordsChanged();
    return summary;
  })().finally(() => {
    syncInProgress = null;
  });
  return syncInProgress;
}

export function describeSync(summary: SyncSummary): string {
  if (summary.noWebhook) return 'No hay URL de Google Sheets configurada (Ajustes ⚙️).';
  if (summary.error) return `Enviados ${summary.sent}, sin confirmar: ${summary.error}`;
  if (summary.sent === 0 && summary.confirmed === 0 && summary.failed === 0) {
    return 'No había registros pendientes.';
  }
  const parts = [`${summary.confirmed} confirmados en el Sheet`];
  if (summary.failed > 0) parts.push(`${summary.failed} sin confirmar (se reintentarán)`);
  return parts.join(' · ');
}

/**
 * Deshace un registro: lo borra del dispositivo y, si ya había salido hacia el Sheet,
 * también la fila (salvo que ya se haya enviado por mail).
 */
export async function undoRecord(record: StoredRecord): Promise<string> {
  const pending = inFlight.get(record.id);
  if (pending) await pending;
  const current = getStoredRecords().find((r) => r.id === record.id) || record;
  deleteRecordLocally(record.id);
  notifyRecordsChanged();

  const reachedSheet = current.syncStatus === 'SENT' || current.syncStatus === 'SYNCED' || current.syncStatus === 'FAILED';
  if (!reachedSheet || !getStoredWebhookUrl()) return 'Registro deshecho.';
  try {
    const res = await jsonp<ScriptResponse & { deleted?: boolean }>({ action: 'DELETE_RECORD', id: record.id });
    assertKnownAction(res);
    return res.deleted ? 'Registro deshecho y borrado del Sheet.' : 'Registro deshecho.';
  } catch (err) {
    return `Registro deshecho en el dispositivo. ${err instanceof Error ? err.message : ''} Borralo a mano del Sheet si llegó.`;
  }
}

// ---------------------------------------------------------------------------
// Cierre de turno, conexión y estadísticas
// ---------------------------------------------------------------------------

export interface ShiftSummaryEmailResult {
  success: boolean;
  message: string;
}

/** Sincroniza lo pendiente y pide al script el reporte. Los destinatarios los define Code.gs. */
export async function requestShiftSummaryEmail(): Promise<ShiftSummaryEmailResult> {
  if (!getStoredWebhookUrl()) {
    return {
      success: false,
      message: 'No hay URL de Google Sheets configurada. Configurala en Ajustes (⚙️).',
    };
  }

  const sync = await syncPendingRecords();
  const pendingLeft = getStoredRecords().filter((r) => r.syncStatus !== 'SYNCED').length;

  try {
    const res = await jsonp<ScriptResponse>({ action: 'SEND_SHIFT_SUMMARY' }, { timeoutMs: 60000 });
    assertKnownAction(res);
    const aviso = pendingLeft > 0
      ? ` Atención: ${pendingLeft} registros del dispositivo todavía no están confirmados en el Sheet y no entraron en el reporte (${describeSync(sync)}).`
      : '';
    return { success: true, message: (res.message || 'Reporte enviado por mail.') + aviso };
  } catch (err) {
    return {
      success: false,
      message: 'No se pudo enviar el reporte: ' + (err instanceof Error ? err.message : 'error de red'),
    };
  }
}

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
}

/** Prueba real de conexión: lee el health check por JSONP con la URL y clave indicadas. */
export async function testWebhookConnection(url: string, token: string): Promise<ConnectionTestResult> {
  try {
    const res = await jsonp<ScriptResponse & { authorized?: boolean; version?: string }>(
      {},
      { url, token, timeoutMs: 15000 }
    );
    if (res.authorized === false) {
      return { ok: false, message: 'El script responde, pero la clave no coincide.' };
    }
    if (res.authorized === undefined) {
      return { ok: true, message: `Conectado (script v${res.version || '?'} desactualizado: pegá el Code.gs nuevo).` };
    }
    return { ok: true, message: `Conectado · script v${res.version || '?'}` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'No responde.' };
  }
}

export async function fetchSheetStatistics(filters: StatsFilters): Promise<StatsPayload> {
  const data = await jsonp<StatsPayload & ScriptResponse>({
    action: 'GET_STATS',
    ronda: filters.ronda,
    from: filters.from || undefined,
    to: filters.to || undefined,
    sector: filters.sector || undefined,
    evaluables: filters.evaluables ? '1' : undefined,
    alertas: filters.alertas ? '1' : undefined,
    conVia: filters.conVia ? '1' : undefined,
    rotulo: filters.rotuloIncompleto ? 'incompleto' : undefined,
    conUpp: filters.conUpp ? '1' : undefined,
    braden: filters.bradenAlto ? 'alto' : undefined,
  });
  if (data.status === 'online') {
    throw new WebhookError(
      'OLD_SCRIPT',
      'El script aún no tiene Estadísticas. Copiá el Code.gs actualizado e implementá una nueva versión en Apps Script.'
    );
  }
  if (data.status !== 'success' || !data.cobertura) {
    throw new WebhookError('SCRIPT', 'La respuesta de estadísticas está incompleta.');
  }
  return data;
}
