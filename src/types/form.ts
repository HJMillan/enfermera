export type SectorType = 'A' | 'B' | 'C' | 'D' | 'E' | string;

export interface BasePatientData {
  fechaHora: string;
  sector: SectorType;
  habitacion: string;
  cama: string;
}

// 1. Acceso Periférico (Columnas A - AD)
export interface AccesoPerifericoForm extends BasePatientData {
  tieneAcceso: boolean;
  cuantas?: number;
  ubicacion?: 'MSD' | 'MSI' | 'MII' | 'MID' | '';
  rotuloFecha?: string;
  rotuloABB?: boolean;
  rotuloNombre?: string;
  rotuloLegajo?: string;
  rotuloTurno?: 'Mañana' | 'Tarde' | 'Noche' | '';
  visibilidad?: boolean;
  fijacionTegaderm?: boolean;
  fijacionCinta?: boolean;
  fijacionHipafix?: boolean;
  fijacionVenda?: boolean;
  fijacionContencionMecanica?: boolean;
  fijacionAdherencia?: 'total' | 'parcial' | 'nula' | '';
  lumenesLlave3Vias?: boolean;
  lumenesTaponMultifuncion?: boolean;
  caracteristicasInfiltracion?: boolean;
  caracteristicasEritematoso?: boolean;
  caracteristicasRetorno?: boolean;
  infusionType?: 'continua' | 'intermitente' | 'ninguna' | '';
}

// 2. Úlceras por Presión (UPP) (Columnas A - X)
export interface UppForm extends BasePatientData {
  tieneUpp: boolean;
  cuantas?: number;
  ubicacionSacra?: boolean;
  ubicacionTalon?: boolean;
  ubicacionGluteo?: boolean;
  ubicacionPosterior?: boolean;
  ubicacionOtro?: string;
  gradoTratamiento?: 'I' | 'II' | 'III' | 'IV' | '';
  tieneTratamiento?: boolean;
  tipoTratamiento?: string;
  escalaBraden?: number;
  nutricion?: 'oral' | 'NPT' | 'enteral SN' | 'enteral BG' | '';
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
