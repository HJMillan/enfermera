import type { StoredRecord, SectorType, SexoPaciente } from '../types/form';
import { ACCESO_PERIFERICO_HEADERS, UPP_HEADERS, SONDA_HEADERS } from './sheetMapper';

const STORAGE_KEYS = {
  WEBHOOK_URL: 'pe_webhook_url',
  LAST_SECTOR: 'pe_last_sector',
  LAST_ROOM: 'pe_last_room',
  LAST_BED: 'pe_last_bed',
  RECORDS_HISTORY: 'pe_records_history_v1',
  NOTIFICATION_EMAILS: 'pe_notification_emails',
  LAST_HC: 'pe_last_hc',
  LAST_SEXO: 'pe_last_sexo',
  LAST_FECHA_INGRESO: 'pe_last_fecha_ingreso',
  STAFF_BY_SECTOR: 'pe_staff_by_sector_v1',
};

export const DEFAULT_NOTIFICATION_EMAILS = ['jesusmillan86@gmail.com', 'pamelaestua91@gmail.com'];

export interface SectorStaff {
  enfermeras: number;
  auxiliares: number;
}

export function getStaffBySector(sector: SectorType): SectorStaff {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STAFF_BY_SECTOR);
    if (!raw) return { enfermeras: 0, auxiliares: 0 };
    const parsed = JSON.parse(raw);
    return parsed[sector] || { enfermeras: 0, auxiliares: 0 };
  } catch {
    return { enfermeras: 0, auxiliares: 0 };
  }
}

export function saveStaffBySector(sector: SectorType, staff: SectorStaff): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STAFF_BY_SECTOR);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[sector] = staff;
    localStorage.setItem(STORAGE_KEYS.STAFF_BY_SECTOR, JSON.stringify(parsed));
  } catch (err) {
    console.error('Error al guardar staff por sector:', err);
  }
}

export function getNotificationEmails(): string[] {
  const stored = localStorage.getItem(STORAGE_KEYS.NOTIFICATION_EMAILS);
  if (!stored) return DEFAULT_NOTIFICATION_EMAILS;
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_NOTIFICATION_EMAILS;
  } catch {
    return DEFAULT_NOTIFICATION_EMAILS;
  }
}

export function setNotificationEmails(emails: string[]): void {
  localStorage.setItem(STORAGE_KEYS.NOTIFICATION_EMAILS, JSON.stringify(emails));
}

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
  historiaClinica: string;
  sexo: SexoPaciente;
  fechaIngreso: string;
}

export function getPatientContextMemory(): PatientContextMemory {
  const sexoRaw = localStorage.getItem(STORAGE_KEYS.LAST_SEXO);
  return {
    sector: (localStorage.getItem(STORAGE_KEYS.LAST_SECTOR) as SectorType) || 'PB',
    habitacion: localStorage.getItem(STORAGE_KEYS.LAST_ROOM) || '1',
    cama: localStorage.getItem(STORAGE_KEYS.LAST_BED) || '1',
    historiaClinica: localStorage.getItem(STORAGE_KEYS.LAST_HC) || '',
    sexo: sexoRaw === 'M' || sexoRaw === 'F' ? sexoRaw : '',
    fechaIngreso: localStorage.getItem(STORAGE_KEYS.LAST_FECHA_INGRESO) || '',
  };
}

export function savePatientContextMemory(data: PatientContextMemory): void {
  localStorage.setItem(STORAGE_KEYS.LAST_SECTOR, data.sector);
  localStorage.setItem(STORAGE_KEYS.LAST_ROOM, data.habitacion);
  localStorage.setItem(STORAGE_KEYS.LAST_BED, data.cama);
  localStorage.setItem(STORAGE_KEYS.LAST_HC, data.historiaClinica || '');
  localStorage.setItem(STORAGE_KEYS.LAST_SEXO, data.sexo || '');
  localStorage.setItem(STORAGE_KEYS.LAST_FECHA_INGRESO, data.fechaIngreso || '');
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

export function deleteRecordLocally(id: string): void {
  const current = getStoredRecords();
  const updated = current.filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEYS.RECORDS_HISTORY, JSON.stringify(updated));
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
  const sondaRecords = records.filter((r) => r.formType === 'SONDA_VESICAL');

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
    csvContent += '--- LESIONES POR PRESIÓN (LPP) ---\r\n';
    csvContent += UPP_HEADERS.join(',') + '\r\n';
    uppRecords.forEach((r) => {
      csvContent += r.rowValues.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',') + '\r\n';
    });
    csvContent += '\r\n';
  }

  if (sondaRecords.length > 0) {
    csvContent += '--- SONDAS VESICALES ---\r\n';
    csvContent += SONDA_HEADERS.join(',') + '\r\n';
    sondaRecords.forEach((r) => {
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
