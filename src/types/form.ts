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

export type SexoPaciente = 'M' | 'F' | '';

export interface BasePatientData {
  fechaHora: string;
  fechaIngreso: string;
  sexo: SexoPaciente;
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
  fijacionCintaTipo?: 'hipoalergénica' | 'tela' | 'seda' | 'coban' | 'papel' | 'transparente' | '';
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
  tipoAccesoAlternativo?: 'acceso_central' | 'percutaneo' | 'nada' | 'ausente' | string;
  accesoCentralUbicacion?: 'Y/I' | 'Y/D' | 'S/I' | 'S/D' | '';
  motivoAusente?: string;

  // Observaciones libres
  observaciones?: string;
}

// 2. Úlceras por Presión (UPP)
export interface UppForm extends BasePatientData {
  tieneUpp: boolean;
  motivoAusente?: string;
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
  observaciones?: string;
}

export type UbicacionSondaMotivo =
  | 'nefrectomia_derecha'
  | 'nefrectomia_izquierda'
  | 'bricker'
  | 'nada'
  | '';

export interface SondaVesicalForm extends BasePatientData {
  tieneSonda: 'SI' | 'NO' | '';
  numeroSonda?: string;
  lumenes?: '2' | '3' | '';
  fijacion?: 'SI' | 'NO' | '';
  ubicacionCorrecta?: 'SI' | 'NO' | '';
  ubicacionMotivo?: UbicacionSondaMotivo;
  motivoAusente?: string;
  observaciones?: string;
}

export type FormType = 'ACCESO_PERIFERICO' | 'UPP' | 'SONDA_VESICAL';

export type SyncStatus = 'PENDING' | 'SYNCED' | 'FAILED';

export interface StoredRecord {
  id: string;
  formType: FormType;
  timestamp: string;
  data: AccesoPerifericoForm | UppForm | SondaVesicalForm;
  rowValues: (string | number | boolean)[];
  syncStatus: SyncStatus;
  errorMessage?: string;
}
