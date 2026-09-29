export type RotuloKey =
  | 'rotuloTieneFecha'
  | 'rotuloTieneNombre'
  | 'rotuloTieneLegajo'
  | 'rotuloTieneEnfermero'
  | 'rotuloTieneTurno'
  | 'rotuloTieneABB';

/** Ítems del rótulo, en el orden en que se muestran y se auditan. */
export const ROTULO_ITEMS: { key: RotuloKey; label: string }[] = [
  { key: 'rotuloTieneFecha', label: 'Fecha' },
  { key: 'rotuloTieneNombre', label: 'Nombre' },
  { key: 'rotuloTieneLegajo', label: 'Legajo' },
  { key: 'rotuloTieneEnfermero', label: 'Enfermero' },
  { key: 'rotuloTieneTurno', label: 'Turno' },
  { key: 'rotuloTieneABB', label: 'ABB' },
];

/** Braden: ≤12 riesgo alto, 13-14 moderado, >14 bajo. */
export const BRADEN = {
  // Límites que ya usaba el formulario (la escala clínica va de 6 a 23).
  min: 3,
  max: 23,
  altoMax: 12,
  moderadoMax: 14,
};

export type BradenBand = 'alto' | 'moderado' | 'bajo';

export function bradenBand(score: number): BradenBand {
  if (score <= BRADEN.altoMax) return 'alto';
  if (score <= BRADEN.moderadoMax) return 'moderado';
  return 'bajo';
}

export const BRADEN_LABEL: Record<BradenBand, string> = {
  alto: 'Riesgo Alto',
  moderado: 'Riesgo Moderado',
  bajo: 'Riesgo Bajo',
};
