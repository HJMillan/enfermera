import { beforeEach, describe, expect, it } from 'vitest';
import { clearSyncedRecords, getStoredRecords, saveRecordLocally } from '../services/storageService';
import type { StoredRecord, SyncStatus } from '../types/form';

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}

const record = (id: number, syncStatus: SyncStatus): StoredRecord => ({
  id: `rec_${id}`,
  formType: 'UPP',
  timestamp: new Date(2026, 2, 5, 10, id % 60).toISOString(),
  data: { fechaHora: '', fechaIngreso: '', sexo: '', sector: 'B', habitacion: '201', cama: '1', historiaClinica: '', tieneUpp: false },
  rowValues: [],
  syncStatus,
});

describe('historial local', () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
  });

  it('nunca descarta registros sin confirmar', () => {
    for (let i = 0; i < 50; i++) saveRecordLocally(record(i, 'PENDING'));
    for (let i = 50; i < 300; i++) saveRecordLocally(record(i, 'SYNCED'));
    const stored = getStoredRecords();
    expect(stored.filter((r) => r.syncStatus === 'PENDING')).toHaveLength(50);
    expect(stored.filter((r) => r.syncStatus === 'SYNCED')).toHaveLength(200);
  });

  it('"nuevo día" solo borra lo confirmado', () => {
    saveRecordLocally(record(1, 'SYNCED'));
    saveRecordLocally(record(2, 'FAILED'));
    saveRecordLocally(record(3, 'LOCAL'));
    expect(clearSyncedRecords()).toBe(2);
    expect(getStoredRecords().map((r) => r.id).sort()).toEqual(['rec_2', 'rec_3']);
  });
});
