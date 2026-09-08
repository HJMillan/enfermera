import type { StoredRecord, SectorType } from '../types/form';
import { ACCESO_PERIFERICO_HEADERS, UPP_HEADERS } from './sheetMapper';

const STORAGE_KEYS = {
  WEBHOOK_URL: 'pe_webhook_url',
  LAST_SECTOR: 'pe_last_sector',
  LAST_ROOM: 'pe_last_room',
  LAST_BED: 'pe_last_bed',
  RECORDS_HISTORY: 'pe_records_history_v1',
};

// Webhook URL
export function getStoredWebhookUrl(): string {
  return localStorage.getItem(STORAGE_KEYS.WEBHOOK_URL) || import.meta.env.VITE_WEBHOOK_URL || '';
}

export function setStoredWebhookUrl(url: string): void {
  localStorage.setItem(STORAGE_KEYS.WEBHOOK_URL, url.trim());
}

// Patient Context defaults
export interface PatientContextMemory {
  sector: SectorType;
  habitacion: string;
  cama: string;
}

export function getPatientContextMemory(): PatientContextMemory {
  return {
    sector: (localStorage.getItem(STORAGE_KEYS.LAST_SECTOR) as SectorType) || 'A',
    habitacion: localStorage.getItem(STORAGE_KEYS.LAST_ROOM) || '101',
    cama: localStorage.getItem(STORAGE_KEYS.LAST_BED) || '1',
  };
}

export function savePatientContextMemory(data: PatientContextMemory): void {
  localStorage.setItem(STORAGE_KEYS.LAST_SECTOR, data.sector);
  localStorage.setItem(STORAGE_KEYS.LAST_ROOM, data.habitacion);
  localStorage.setItem(STORAGE_KEYS.LAST_BED, data.cama);
}

// Records History & Queue
export function getStoredRecords(): StoredRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECORDS_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error al leer historial local:', err);
    return [];
  }
}

export function saveRecordLocally(record: StoredRecord): void {
  const current = getStoredRecords();
  const updated = [record, ...current.filter((r) => r.id !== record.id)];
  // Conservar hasta 200 registros en local
  localStorage.setItem(STORAGE_KEYS.RECORDS_HISTORY, JSON.stringify(updated.slice(0, 200)));
}

export function updateRecordStatus(id: string, status: StoredRecord['syncStatus'], errorMsg?: string): void {
  const current = getStoredRecords();
  const updated = current.map((item) => {
    if (item.id === id) {
      return { ...item, syncStatus: status, errorMessage: errorMsg };
    }
    return item;
  });
  localStorage.setItem(STORAGE_KEYS.RECORDS_HISTORY, JSON.stringify(updated));
}

export function clearStoredRecords(): void {
  localStorage.removeItem(STORAGE_KEYS.RECORDS_HISTORY);
}

// Exportar historial a CSV
export function exportRecordsToCSV(): void {
  const records = getStoredRecords();
  if (records.length === 0) {
    alert('No hay registros en el historial para exportar.');
    return;
  }

  const accesoRecords = records.filter((r) => r.formType === 'ACCESO_PERIFERICO');
  const uppRecords = records.filter((r) => r.formType === 'UPP');

  let csvContent = 'data:text/csv;charset=utf-8,';

  if (accesoRecords.length > 0) {
    csvContent += '--- ACCESO PERIFÉRICO ---\r\n';
    csvContent += ACCESO_PERIFERICO_HEADERS.join(',') + '\r\n';
    accesoRecords.forEach((r) => {
      csvContent += r.rowValues.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',') + '\r\n';
    });
    csvContent += '\r\n';
  }

  if (uppRecords.length > 0) {
    csvContent += '--- ÚLCERAS POR PRESIÓN (UPP) ---\r\n';
    csvContent += UPP_HEADERS.join(',') + '\r\n';
    uppRecords.forEach((r) => {
      csvContent += r.rowValues.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',') + '\r\n';
    });
  }

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `planilla_enfermera_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
