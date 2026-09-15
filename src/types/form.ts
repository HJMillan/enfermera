export type SectorType =
  | 'PB'
  | '1° Piso'
  | 'Maternidad'
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | string;

export interface BasePatientData {
  fechaHora: string;
  sector: SectorType;
  habitacion: string;
  cama: string;
  historiaClinica: string;
  cantidadEnfermeras?: number;
  cantidadAuxiliares?: number;
}

// 1. Acceso Periférico
export interface AccesoPerifericoForm extends BasePatientData {
  tieneAcceso: boolean;
  cuantas?: number;

  // Ubicación anatómica (multi-selección)
  ubicacionMSD?: boolean;
  ubicacionMSI?: boolean;
  ubicacionMII?: boolean;
  ubicacionMID?: boolean;

  // Rótulo de colocación (SI/NO condicional)
  tieneRotulo?: boolean;
  rotuloTieneFecha?: boolean;
  rotuloTieneNombre?: boolean;
  rotuloTieneLegajo?: boolean;
  rotuloTieneEnfermero?: boolean;
  rotuloTieneTurno?: boolean;
  rotuloTieneABB?: boolean;

  // Inspección y fijación
  visibilidad?: boolean;
  fijacionTegaderm?: boolean;
  fijacionCinta?: boolean;
  fijacionCintaTipo?: 'hipoalergénica' | 'tela' | 'seda' | 'coban' | 'papel' | '';
  fijacionHipafix?: boolean;
  fijacionVenda?: boolean;
  fijacionContencionMecanica?: boolean;
  fijacionAdherencia?: 'total' | 'parcial' | 'nula' | '';

  // Lúmenes y clínica
  lumenesLlave3Vias?: boolean;
  lumenesTaponMultifuncion?: boolean;
  caracteristicasInfiltracion?: boolean;
  caracteristicasEritematoso?: boolean;
  caracteristicasRetorno?: boolean;

  // Infusión (solo continua o intermitente)
  infusionType?: 'continua' | 'intermitente' | '';

  // Opciones cuando NO tiene acceso periférico
  tipoAccesoAlternativo?: 'acceso_central' | 'percutaneo' | 'nada' | '';
  accesoCentralUbicacion?: 'Y/I' | 'Y/D' | 'S/I' | 'S/D' | '';

  // Observaciones libres
  observaciones?: string;
}

// 2. Úlceras por Presión (UPP)
export interface UppForm extends BasePatientData {
  tieneUpp: boolean;
  fechaIngreso?: string;
  pasoAreaCerrada?: boolean;
  areaCerradaCual?: string;
  cuantas?: number;

  // Ubicación
  ubicacionSacra?: boolean;
  ubicacionTalon?: boolean;
  ubicacionGluteo?: boolean;
  ubicacionPosterior?: boolean;
  ubicacionOtro?: string;

  // Grados de la UPP (multi-selección)
  gradoI?: boolean;
  gradoII?: boolean;
  gradoIII?: boolean;
  gradoIV?: boolean;

  // Tratamiento
  // Tratamiento (multi-selección)
  tieneTratamiento?: boolean;
  tipoTratamiento?: string;
  tratamientos?: string[];

  // Dispositivos de Apoyo
  tieneDispositivoApoyo?: boolean;
  dispositivoAro?: boolean;
  dispositivoGuantesAgua?: boolean;
  dispositivoOtro?: string;

  // Escala y Cuidados
  escalaBraden?: number;
  nutricion?: string;
  nutricionOral?: boolean;
  nutricionNpt?: boolean;
  nutricionEnteralSn?: boolean;
  nutricionEnteralBg?: boolean;
  colchonAntiEscaras?: boolean;
  observacionesColchon?: string;
}

export type FormType = 'ACCESO_PERIFERICO' | 'UPP';

export type SyncStatus = 'PENDING' | 'SYNCED' | 'FAILED';

export interface StoredRecord {
  id: string;
  formType: FormType;
  timestamp: string;
  data: AccesoPerifericoForm | UppForm;
  rowValues: (string | number | boolean)[];
  syncStatus: SyncStatus;
  errorMessage?: string;
}
