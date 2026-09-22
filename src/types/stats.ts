export type StatsRonda = 'ambas' | 'vias' | 'upp';
export type StatsPreset = 'hoy' | 'ayer' | '7d' | 'mes' | 'rango' | 'todo';

export interface StatsFilters {
  preset: StatsPreset;
  from: string;
  to: string;
  sector: string;
  ronda: StatsRonda;
  evaluables: boolean;
  alertas: boolean;
  conVia: boolean;
  rotuloIncompleto: boolean;
  conUpp: boolean;
  bradenAlto: boolean;
}

export interface StatsCountItem {
  label: string;
  count: number;
}

export interface StatsSectorRow {
  sector: string;
  viasUnicas: number;
  viasEvaluables?: number;
  noEvaluablesVias?: number;
  uppUnicas: number;
  capacidad: number;
  conPeriferico: number;
  alertasVia: number;
  conUpp: number;
  bradenAlto: number;
  rotuloIncompleto: number;
  enfermeras: number;
  auxiliares: number;
}

export interface StatsAlerta {
  tipo: string;
  sector: string;
  habitacion: string;
  cama: string;
  hc?: string;
}

export interface StatsViasBlock {
  evaluadas: number;
  conPeriferico: number;
  central: number;
  percutaneo: number;
  nada: number;
  noEvaluables?: number;
  rotuloSi: number;
  rotuloCompleto: number;
  rotuloIncompleto: number;
  infiltracion: number;
  eritema: number;
  sinRetorno: number;
  puncionNoVisible: number;
  adherenciaParcial: number;
  adherenciaNula: number;
  infusiones: StatsCountItem[];
  ubicaciones: StatsCountItem[];
}

export interface StatsUppBlock {
  evaluadas: number;
  conUpp: number;
  noEvaluables?: number;
  grados: { I: number; II: number; III: number; IV: number };
  bradenAlto: number;
  bradenModerado: number;
  bradenBajo: number;
  areaCerrada: number;
  conTratamiento: number;
  tratamientos: StatsCountItem[];
  conDispositivo: number;
  dispositivos: StatsCountItem[];
  colchonSi: number;
  nutricion: StatsCountItem[];
  ubicaciones: StatsCountItem[];
}

export interface StatsPayload {
  status: 'success' | 'error' | 'online';
  message?: string;
  generatedAt?: string;
  from?: string | null;
  to?: string | null;
  sector?: string | null;
  ronda?: string;
  cobertura?: {
    registrosVias: number;
    registrosUpp: number;
    viasUnicas: number;
    uppUnicas: number;
    noEvaluablesVias: number;
    noEvaluablesUpp: number;
    capacidad: number;
    porSector: StatsSectorRow[];
  };
  vias?: StatsViasBlock;
  upp?: StatsUppBlock;
  alertas?: StatsAlerta[];
  alertasTotal?: number;
}
