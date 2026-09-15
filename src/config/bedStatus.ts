export interface BedStatusOption {
  id: string;
  label: string;
  icon: string;
}

export const BED_STATUS_OPTIONS: BedStatusOption[] = [
  { id: '', label: '👤 Paciente en Cama (Normal)', icon: '👤' },
  { id: 'Libre', label: '🛏️ Libre', icon: '🛏️' },
  { id: 'Quimio', label: '🧪 Quimio', icon: '🧪' },
  { id: 'Quirófano', label: '🏥 Quirófano', icon: '🏥' },
  { id: 'Diálisis', label: '💉 Diálisis', icon: '💉' },
  { id: 'Estudio / Rayos', label: '📋 Estudio / Rayos', icon: '📋' },
  { id: 'Traslado', label: '🔄 Traslado', icon: '🔄' },
];
