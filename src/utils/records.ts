import type { FormType, StoredRecord } from '../types/form';
import { localDateISO } from './dateUtils';

export function bedKey(record: StoredRecord): string {
  return `${record.data.sector}|${record.data.habitacion}|${record.data.cama}`;
}

/** Fecha local (yyyy-mm-dd) en que se guardó el registro. */
export function recordDay(record: StoredRecord): string {
  return localDateISO(record.timestamp);
}

/**
 * Último registro de cada cama para una ronda. El historial se guarda del más nuevo
 * al más viejo, así que el primero que aparece por cama es el vigente.
 */
export function latestPerBed(records: StoredRecord[], formType: FormType, day?: string): StoredRecord[] {
  const seen = new Set<string>();
  const out: StoredRecord[] = [];
  for (const r of records) {
    if (r.formType !== formType) continue;
    if (day && recordDay(r) !== day) continue;
    const key = bedKey(r);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}
