import type { StoredRecord, SectorType, SexoPaciente } from '../types/form';
import { HEADERS_BY_FORM } from './sheetMapper';
import { localDateISO } from '../utils/dateUtils';

const STORAGE_KEYS = {
  WEBHOOK_URL: 'pe_webhook_url',
  WEBHOOK_TOKEN: 'pe_webhook_token',
  LAST_SECTOR: 'pe_last_sector',
  LAST_ROOM: 'pe_last_room',
  LAST_BED: 'pe_last_bed',
  RECORDS_HISTORY: 'pe_records_history_v1',
  LAST_HC: 'pe_last_hc',
  LAST_SEXO: 'pe_last_sexo',
  LAST_FECHA_INGRESO: 'pe_last_fecha_ingreso',
  STAFF_BY_SECTOR: 'pe_staff_by_sector_v1',
};

/** Claves de versiones anteriores que ya no se usan. */
const LEGACY_KEYS = ['pe_notification_emails'];

/** Registros enviados que se conservan en el dispositivo. Los no enviados no se descartan nunca. */
const MAX_SYNCED_RECORDS = 200;

// Acceso seguro a localStorage: en modo privado o con la cuota llena puede lanzar.
function readKey(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeKey(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.error(`No se pudo guardar ${key} en el dispositivo:`, err);
    return false;
  }
}

function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // sin almacenamiento disponible
  }
}

export function cleanupLegacyStorage(): void {
  LEGACY_KEYS.forEach(removeKey);
}

export interface SectorStaff {
  enfermeras: number;
  auxiliares: number;
}

export function getStaffBySector(sector: SectorType): SectorStaff {
  try {
    const raw = readKey(STORAGE_KEYS.STAFF_BY_SECTOR);
    if (!raw) return { enfermeras: 0, auxiliares: 0 };
    const parsed = JSON.parse(raw);
    return parsed[sector] || { enfermeras: 0, auxiliares: 0 };
  } catch {
    return { enfermeras: 0, auxiliares: 0 };
  }
}

export function saveStaffBySector(sector: SectorType, staff: SectorStaff): void {
  try {
    const raw = readKey(STORAGE_KEYS.STAFF_BY_SECTOR);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[sector] = staff;
    writeKey(STORAGE_KEYS.STAFF_BY_SECTOR, JSON.stringify(parsed));
  } catch (err) {
    console.error('Error al guardar staff por sector:', err);
  }
}

// Webhook: si el usuario lo configuró (aunque lo haya dejado vacío) manda lo guardado;
// si nunca lo tocó, se usa VITE_WEBHOOK_URL (útil en desarrollo).
export function getStoredWebhookUrl(): string {
  const stored = readKey(STORAGE_KEYS.WEBHOOK_URL);
  if (stored !== null) return stored.trim();
  return (import.meta.env.VITE_WEBHOOK_URL || '').trim();
}

export function setStoredWebhookUrl(url: string): void {
  writeKey(STORAGE_KEYS.WEBHOOK_URL, url.trim());
}

export function getStoredWebhookToken(): string {
  return (readKey(STORAGE_KEYS.WEBHOOK_TOKEN) || '').trim();
}

export function setStoredWebhookToken(token: string): void {
  writeKey(STORAGE_KEYS.WEBHOOK_TOKEN, token.trim());
}

// Patient Context defaults
export interface PatientContextMemory {
  sector: SectorType;
  habitacion: string;
  cama: string;
  historiaClinica: string;
  sexo: SexoPaciente;
  fechaIngreso: string;
}

export function getPatientContextMemory(): PatientContextMemory {
  const sexoRaw = readKey(STORAGE_KEYS.LAST_SEXO);
  return {
    sector: (readKey(STORAGE_KEYS.LAST_SECTOR) as SectorType) || 'PB',
    habitacion: readKey(STORAGE_KEYS.LAST_ROOM) || '1',
    cama: readKey(STORAGE_KEYS.LAST_BED) || '1',
    historiaClinica: readKey(STORAGE_KEYS.LAST_HC) || '',
    sexo: sexoRaw === 'M' || sexoRaw === 'F' ? sexoRaw : '',
    fechaIngreso: readKey(STORAGE_KEYS.LAST_FECHA_INGRESO) || '',
  };
}

export function savePatientContextMemory(data: PatientContextMemory): void {
  writeKey(STORAGE_KEYS.LAST_SECTOR, data.sector);
  writeKey(STORAGE_KEYS.LAST_ROOM, data.habitacion);
  writeKey(STORAGE_KEYS.LAST_BED, data.cama);
  writeKey(STORAGE_KEYS.LAST_HC, data.historiaClinica || '');
  writeKey(STORAGE_KEYS.LAST_SEXO, data.sexo || '');
  writeKey(STORAGE_KEYS.LAST_FECHA_INGRESO, data.fechaIngreso || '');
}

// Records History & Queue
export function getStoredRecords(): StoredRecord[] {
  try {
    const raw = readKey(STORAGE_KEYS.RECORDS_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error al leer historial local:', err);
    return [];
  }
}

export function isRecordSynced(record: StoredRecord): boolean {
  return record.syncStatus === 'SYNCED';
}

/** Recorta solo registros ya confirmados en el Sheet; los pendientes se conservan siempre. */
function trimRecords(records: StoredRecord[]): StoredRecord[] {
  let synced = 0;
  return records.filter((r) => {
    if (!isRecordSynced(r)) return true;
    synced += 1;
    return synced <= MAX_SYNCED_RECORDS;
  });
}

function writeRecords(records: StoredRecord[]): boolean {
  return writeKey(STORAGE_KEYS.RECORDS_HISTORY, JSON.stringify(records));
}

/** Devuelve false si el dispositivo no pudo guardar (almacenamiento lleno o bloqueado). */
export function saveRecordLocally(record: StoredRecord): boolean {
  const current = getStoredRecords();
  const updated = [record, ...current.filter((r) => r.id !== record.id)];
  return writeRecords(trimRecords(updated));
}

export function deleteRecordLocally(id: string): void {
  writeRecords(getStoredRecords().filter((r) => r.id !== id));
}

export function updateRecordStatus(id: string, status: StoredRecord['syncStatus'], errorMsg?: string): void {
  const updated = getStoredRecords().map((item) =>
    item.id === id ? { ...item, syncStatus: status, errorMessage: errorMsg } : item
  );
  writeRecords(updated);
}

export function clearStoredRecords(): void {
  removeKey(STORAGE_KEYS.RECORDS_HISTORY);
}

/** Borra solo los registros confirmados en el Sheet. Devuelve cuántos quedaron sin enviar. */
export function clearSyncedRecords(): number {
  const remaining = getStoredRecords().filter((r) => !isRecordSynced(r));
  writeRecords(remaining);
  return remaining.length;
}

function csvCell(val: unknown): string {
  let str = String(val ?? '');
  // Evita que Excel interprete el texto como fórmula
  if (/^[=+@]/.test(str) || /^-[^\d]/.test(str)) str = `'${str}`;
  return `"${str.replace(/"/g, '""')}"`;
}

const CSV_SECTIONS = [
  { formType: 'ACCESO_PERIFERICO' as const, title: '--- ACCESO PERIFÉRICO ---' },
  { formType: 'UPP' as const, title: '--- LESIONES POR PRESIÓN (LPP) ---' },
  { formType: 'SONDA_VESICAL' as const, title: '--- SONDAS VESICALES ---' },
];

// Exportar historial a CSV
export function exportRecordsToCSV(): void {
  const records = getStoredRecords();
  if (records.length === 0) {
    alert('No hay registros en el historial para exportar.');
    return;
  }

  const lines: string[] = [];
  for (const section of CSV_SECTIONS) {
    const rows = records.filter((r) => r.formType === section.formType);
    if (rows.length === 0) continue;
    lines.push(section.title);
    lines.push(HEADERS_BY_FORM[section.formType].map(csvCell).join(','));
    rows.forEach((r) => lines.push(r.rowValues.map(csvCell).join(',')));
    lines.push('');
  }

  // BOM para que Excel lea bien los acentos; Blob en vez de data URI para no cortar en '#'.
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `planilla_enfermera_${localDateISO()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
