import { useMemo } from 'react';
import type { FormType, SectorType, StoredRecord } from '../types/form';
import { localDateISO } from '../utils/dateUtils';
import { latestPerBed } from '../utils/records';

/** Lugares ya relevados HOY en el sector para la ronda activa (clave "habitación-cama"). */
export function useCensadasHoy(
  records: StoredRecord[],
  activeRound: FormType | 'HISTORY' | undefined,
  sector: SectorType
): Set<string> {
  return useMemo(() => {
    if (!activeRound || activeRound === 'HISTORY') return new Set<string>();
    const today = localDateISO();
    return new Set(
      latestPerBed(records, activeRound, today)
        .filter((r) => r.data.sector === sector)
        .map((r) => `${r.data.habitacion}-${r.data.cama}`)
    );
  }, [records, activeRound, sector]);
}
