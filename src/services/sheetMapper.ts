import type { AccesoPerifericoForm, UppForm } from '../types/form';

// Cabeceras para la hoja Acceso Periférico (38 columnas)
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
  'Observaciones'        // AM
];

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
    !tiene ? (data.tipoAccesoAlternativo || 'nada') : '',                          // J
    !tiene && data.tipoAccesoAlternativo === 'acceso_central' ? (data.accesoCentralUbicacion || '') : '', // K
    tiene ? (data.cuantas ?? 1) : 0,                                                // L
    tiene && data.ubicacionMSD ? 'SI' : '',                                         // M
    tiene && data.ubicacionMSI ? 'SI' : '',                                         // N
    tiene && data.ubicacionMII ? 'SI' : '',                                         // O
    tiene && data.ubicacionMID ? 'SI' : '',                                         // P
    evaluaRotulo ? (data.tieneRotulo ? 'SI' : 'NO') : '',                           // Q
    evaluaRotulo && data.tieneRotulo ? (data.rotuloTieneFecha ? 'SI' : 'NO') : '',   // R
    evaluaRotulo && data.tieneRotulo ? (data.rotuloTieneNombre ? 'SI' : 'NO') : '',  // S
    evaluaRotulo && data.tieneRotulo ? (data.rotuloTieneLegajo ? 'SI' : 'NO') : '',  // T
    evaluaRotulo && data.tieneRotulo ? (data.rotuloTieneEnfermero ? 'SI' : 'NO') : '', // U
    evaluaRotulo && data.tieneRotulo ? (data.rotuloTieneTurno ? 'SI' : 'NO') : '',   // V
    evaluaRotulo && data.tieneRotulo ? (data.rotuloTieneABB ? 'SI' : 'NO') : '',     // W
    tiene ? (data.visibilidad ? 'SI' : '') : '',                                    // X
    tiene ? (!data.visibilidad ? 'NO' : '') : '',                                   // Y
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
    tiene && data.caracteristicasRetorno ? 'SI' : '',                               // AK
    tiene ? (data.infusionType || '') : '',                                         // AL
    data.observaciones || ''                                                        // AM
  ];
}

// Cabeceras para la hoja UPP (Úlceras por Presión) (36 columnas)
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
  'Obs Colchón'                // AJ
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
    data.fechaIngreso || '',                                                        // H
    data.pasoAreaCerrada ? (data.areaCerradaCual ? `SI (${data.areaCerradaCual})` : 'SI') : 'NO', // I
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
    tiene ? (data.observacionesColchon || '') : ''                                  // AJ
  ];
}
