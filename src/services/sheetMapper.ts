import type { AccesoPerifericoForm, FormType, SondaVesicalForm, UppForm } from '../types/form';
import { isoToDmy } from '../utils/dateUtils';

// El Sheet agrega "Mail Enviado" e "ID Registro" al final; la app no los manda en rowValues.
// Code.gs escribe por NOMBRE de columna, así que estas listas deben coincidir con sus HEADERS_*.

// Cabeceras para la hoja Acceso Periférico (41 columnas, A..AO)
export const ACCESO_PERIFERICO_HEADERS = [
  'Fecha/Hora',          // A
  'Sector',              // B
  'Habitación',          // C
  'Cama',                // D
  'HC',                  // E
  'Cant. Enfermeras',    // F
  'Cant. Auxiliares',    // G
  'Acceso (SI)',         // H
  'Acceso (NO)',         // I
  'Tipo Acceso Alt.',    // J (acceso_central | percutaneo | nada)
  'Acceso Central Ubic.',// K (Y/I | Y/D | S/I | S/D)
  'Cantidad',            // L
  'Ubicación MSD',       // M
  'Ubicación MSI',       // N
  'Ubicación MII',       // O
  'Ubicación MID',       // P
  'Rótulo (SI/NO)',      // Q
  'Rótulo Fecha',        // R (SI/NO)
  'Rótulo Nombre',       // S (SI/NO)
  'Rótulo Legajo',       // T (SI/NO)
  'Rótulo Enfermero',    // U (SI/NO)
  'Rótulo Turno',        // V (SI/NO)
  'Rótulo ABB',          // W (SI/NO)
  'Visibilidad (SI)',    // X
  'Visibilidad (NO)',    // Y
  'Fijación Tegaderm',   // Z
  'Fijación Cinta',      // AA
  'Tipo Cinta',          // AB
  'Fijación Hipafix',    // AC
  'Fijación Venda',      // AD
  'Fijación Contención', // AE
  'Adherencia',          // AF
  'Llave 3 Vías',        // AG
  'Tapón Multifunción',  // AH
  'Infiltración',        // AI
  'Eritematoso',         // AJ
  'Retorno',             // AK
  'Infusión Tipo',       // AL
  'Observaciones',       // AM
  'Fecha Ingreso',       // AN
  'Sexo'                 // AO
];

function ynOrBlank(val: boolean | undefined): '' | 'SI' | 'NO' {
  if (val === true) return 'SI';
  if (val === false) return 'NO';
  return '';
}

export function mapAccesoPerifericoToRow(data: AccesoPerifericoForm): (string | number | boolean)[] {
  const tiene = Boolean(data.tieneAcceso);
  const esPercutaneo = !tiene && data.tipoAccesoAlternativo === 'percutaneo';
  const evaluaRotulo = tiene || esPercutaneo;

  return [
    data.fechaHora,                                                                 // A
    data.sector,                                                                    // B
    data.habitacion,                                                                // C
    data.cama,                                                                      // D
    data.historiaClinica || '',                                                     // E
    data.cantidadEnfermeras ?? '',                                                  // F
    data.cantidadAuxiliares ?? '',                                                  // G
    tiene ? 'SI' : '',                                                              // H
    !tiene ? 'NO' : '',                                                             // I
    !tiene ? (data.tipoAccesoAlternativo === 'ausente' || data.motivoAusente ? (data.motivoAusente || 'Ausente') : (data.tipoAccesoAlternativo || 'nada')) : '', // J
    !tiene && data.tipoAccesoAlternativo === 'acceso_central' ? (data.accesoCentralUbicacion || '') : '', // K
    tiene ? (data.cuantas ?? 1) : 0,                                                // L
    tiene && data.ubicacionMSD ? 'SI' : '',                                         // M
    tiene && data.ubicacionMSI ? 'SI' : '',                                         // N
    tiene && data.ubicacionMII ? 'SI' : '',                                         // O
    tiene && data.ubicacionMID ? 'SI' : '',                                         // P
    evaluaRotulo ? ynOrBlank(data.tieneRotulo) : '',                                // Q
    evaluaRotulo && data.tieneRotulo === true ? ynOrBlank(data.rotuloTieneFecha) : '', // R
    evaluaRotulo && data.tieneRotulo === true ? ynOrBlank(data.rotuloTieneNombre) : '',   // S
    evaluaRotulo && data.tieneRotulo === true ? ynOrBlank(data.rotuloTieneLegajo) : '', // T
    evaluaRotulo && data.tieneRotulo === true ? ynOrBlank(data.rotuloTieneEnfermero) : '', // U
    evaluaRotulo && data.tieneRotulo === true ? ynOrBlank(data.rotuloTieneTurno) : '', // V
    evaluaRotulo && data.tieneRotulo === true ? ynOrBlank(data.rotuloTieneABB) : '', // W
    tiene && data.visibilidad === true ? 'SI' : '',                                 // X
    tiene && data.visibilidad === false ? 'NO' : '',                                // Y
    tiene && data.fijacionTegaderm ? 'SI' : '',                                     // Z
    tiene && data.fijacionCinta ? 'SI' : '',                                        // AA
    tiene && data.fijacionCinta ? (data.fijacionCintaTipo || '') : '',              // AB
    tiene && data.fijacionHipafix ? 'SI' : '',                                      // AC
    tiene && data.fijacionVenda ? 'SI' : '',                                        // AD
    tiene && data.fijacionContencionMecanica ? 'SI' : '',                           // AE
    tiene ? (data.fijacionAdherencia || '') : '',                                   // AF
    tiene && data.lumenesLlave3Vias ? 'SI' : '',                                    // AG
    tiene && data.lumenesTaponMultifuncion ? 'SI' : '',                             // AH
    tiene && data.caracteristicasInfiltracion ? 'SI' : '',                          // AI
    tiene && data.caracteristicasEritematoso ? 'SI' : '',                           // AJ
    tiene ? (data.caracteristicasRetorno ? 'SI' : 'NO') : '',                        // AK
    tiene ? (data.infusionType || '') : '',                                         // AL
    data.motivoAusente ? (data.observaciones ? `${data.motivoAusente} - ${data.observaciones}` : data.motivoAusente) : (data.observaciones || ''), // AM
    isoToDmy(data.fechaIngreso),                                                    // AN
    data.sexo === 'M' ? 'Masculino' : data.sexo === 'F' ? 'Femenino' : ''           // AO
  ];
}

// Cabeceras para la hoja UPP (Úlceras por Presión) (37 columnas, A..AK)
export const UPP_HEADERS = [
  'Fecha/Hora',                // A
  'Sector',                    // B
  'Habitación',                // C
  'Cama',                      // D
  'HC',                        // E
  'Cant. Enfermeras',          // F
  'Cant. Auxiliares',          // G
  'Fecha Ingreso',             // H
  'Área Cerrada (SI/NO)',      // I
  'UPP (SI)',                  // J
  'UPP (NO)',                  // K
  'Cantidad',                  // L
  'Ubicación Sacra',           // M
  'Ubicación Talón',           // N
  'Ubicación Glúteo',          // O
  'Ubicación Posterior',       // P
  'Ubicación Otro',            // Q
  'Grado I',                   // R
  'Grado II',                  // S
  'Grado III',                 // T
  'Grado IV',                  // U
  'Tratamiento (SI/NO)',       // V
  'Tipo Tratamiento',          // W
  'Detalle Tratamiento',       // X
  'Dispositivo Apoyo (SI/NO)', // Y
  'Disp. Aro',                 // Z
  'Disp. Guantes Agua',        // AA
  'Disp. Otro',                // AB
  'Escala de Braden',          // AC
  'Nutrición Oral',            // AD
  'Nutrición NPT',             // AE
  'Nutrición Enteral SN',      // AF
  'Nutrición Enteral BG',      // AG
  'Colchón Anti-escaras (SI)', // AH
  'Colchón Anti-escaras (NO)', // AI
  'Obs Colchón',               // AJ
  'Sexo'                       // AK
];

export function mapUppToRow(data: UppForm): (string | number | boolean)[] {
  const tiene = Boolean(data.tieneUpp);
  const listaTratamientos = Array.isArray(data.tratamientos) && data.tratamientos.length > 0
    ? data.tratamientos.join(', ')
    : (data.tipoTratamiento || '');

  return [
    data.fechaHora,                                                                 // A
    data.sector,                                                                    // B
    data.habitacion,                                                                // C
    data.cama,                                                                      // D
    data.historiaClinica || '',                                                     // E
    data.cantidadEnfermeras ?? '',                                                  // F
    data.cantidadAuxiliares ?? '',                                                  // G
    isoToDmy(data.fechaIngreso),                                                    // H
    tiene ? (data.pasoAreaCerrada ? (data.areaCerradaCual ? `SI (${data.areaCerradaCual})` : 'SI') : 'NO') : '', // I
    tiene ? 'SI' : '',                                                              // J
    !tiene ? 'NO' : '',                                                             // K
    tiene ? (data.cuantas ?? 1) : 0,                                                // L
    tiene && data.ubicacionSacra ? 'SI' : '',                                       // M
    tiene && data.ubicacionTalon ? 'SI' : '',                                       // N
    tiene && data.ubicacionGluteo ? 'SI' : '',                                      // O
    tiene && data.ubicacionPosterior ? 'SI' : '',                                   // P
    tiene ? (data.ubicacionOtro || '') : '',                                        // Q
    tiene && data.gradoI ? 'SI' : '',                                               // R
    tiene && data.gradoII ? 'SI' : '',                                              // S
    tiene && data.gradoIII ? 'SI' : '',                                             // T
    tiene && data.gradoIV ? 'SI' : '',                                              // U
    tiene ? (data.tieneTratamiento ? 'SI' : 'NO') : '',                             // V
    tiene ? listaTratamientos : '',                                                 // W
    tiene ? (listaTratamientos ? 'Activo' : '') : '',                               // X
    tiene ? (data.tieneDispositivoApoyo ? 'SI' : 'NO') : '',                        // Y
    tiene && data.tieneDispositivoApoyo && data.dispositivoAro ? 'SI' : '',         // Z
    tiene && data.tieneDispositivoApoyo && data.dispositivoGuantesAgua ? 'SI' : '', // AA
    tiene && data.tieneDispositivoApoyo && data.dispositivoOtro ? data.dispositivoOtro : '', // AB
    tiene ? (data.escalaBraden ?? '') : '',                                         // AC
    tiene && (data.nutricionOral || data.nutricion === 'oral') ? 'SI' : '',         // AD
    tiene && (data.nutricionNpt || data.nutricion === 'NPT') ? 'SI' : '',           // AE
    tiene && (data.nutricionEnteralSn || data.nutricion === 'enteral SN') ? 'SI' : '', // AF
    tiene && (data.nutricionEnteralBg || data.nutricion === 'enteral BG') ? 'SI' : '', // AG
    tiene ? (data.colchonAntiEscaras ? 'SI' : '') : '',                             // AH
    tiene ? (!data.colchonAntiEscaras ? 'NO' : '') : '',                            // AI
    !tiene && data.motivoAusente ? `Paciente ausente / Cama libre: ${data.motivoAusente}` : (data.observacionesColchon || ''), // AJ
    data.sexo === 'M' ? 'Masculino' : data.sexo === 'F' ? 'Femenino' : ''           // AK
  ];
}

export const MOTIVO_UBICACION_LABEL: Record<string, string> = {
  nefrectomia_derecha: 'Nefrectomía derecha',
  nefrectomia_izquierda: 'Nefrectomía izquierda',
  bricker: 'Bricker',
  nada: 'Nada',
};

export const SONDA_HEADERS = [
  'Fecha/Hora',
  'Sector',
  'Habitación',
  'Cama',
  'HC',
  'Cant. Enfermeras',
  'Cant. Auxiliares',
  'Fecha Ingreso',
  'Sexo',
  'Tiene Sonda',
  'Numero Sonda',
  'Lumenes',
  'Fijacion',
  'Ubicacion Correcta',
  'Motivo Ubicacion',
  'Observaciones',
  'Estado Cama',
];

export function mapSondaToRow(data: SondaVesicalForm): (string | number | boolean)[] {
  const tiene = data.tieneSonda === 'SI';
  const motivo = tiene && data.ubicacionCorrecta === 'NO'
    ? (MOTIVO_UBICACION_LABEL[data.ubicacionMotivo || ''] || data.ubicacionMotivo || '')
    : '';

  return [
    data.fechaHora,
    data.sector,
    data.habitacion,
    data.cama,
    data.historiaClinica || '',
    data.cantidadEnfermeras ?? '',
    data.cantidadAuxiliares ?? '',
    isoToDmy(data.fechaIngreso),
    data.sexo === 'M' ? 'Masculino' : data.sexo === 'F' ? 'Femenino' : '',
    data.motivoAusente ? '' : (data.tieneSonda || ''),
    tiene ? (data.numeroSonda || '') : '',
    tiene ? (data.lumenes || '') : '',
    tiene ? (data.fijacion || '') : '',
    tiene ? (data.ubicacionCorrecta || '') : '',
    motivo,
    data.observaciones || '',
    data.motivoAusente || '',
  ];
}

export const HEADERS_BY_FORM: Record<FormType, string[]> = {
  ACCESO_PERIFERICO: ACCESO_PERIFERICO_HEADERS,
  UPP: UPP_HEADERS,
  SONDA_VESICAL: SONDA_HEADERS,
};

export function mapRecordToRow(
  formType: FormType,
  data: AccesoPerifericoForm | UppForm | SondaVesicalForm
): (string | number | boolean)[] {
  if (formType === 'ACCESO_PERIFERICO') return mapAccesoPerifericoToRow(data as AccesoPerifericoForm);
  if (formType === 'SONDA_VESICAL') return mapSondaToRow(data as SondaVesicalForm);
  return mapUppToRow(data as UppForm);
}
