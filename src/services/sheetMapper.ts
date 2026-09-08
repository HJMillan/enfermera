import type { AccesoPerifericoForm, UppForm } from '../types/form';

// Cabeceras exactas para la hoja Acceso Periférico
export const ACCESO_PERIFERICO_HEADERS = [
  'Fecha/Hora',          // A
  'Sector',              // B
  'Habitación',          // C
  'Cama',                // D
  'Acceso (SI)',         // E
  'Acceso (NO)',         // F
  'Cantidad',            // G
  'Ubicación MSD',       // H
  'Ubicación MSI',       // I
  'Ubicación MII',       // J
  'Ubicación MID',       // K
  'Rótulo Fecha',        // L
  'Rótulo ABB',          // M
  'Rótulo Nombre',       // N
  'Rótulo Legajo',       // O
  'Rótulo Turno',        // P
  'Visibilidad (SI)',    // Q
  'Visibilidad (NO)',    // R
  'Fijación Tegaderm',   // S
  'Fijación Cinta',      // T
  'Fijación Hipafix',    // U
  'Fijación Venda',      // V
  'Fijación Contención', // W
  'Adherencia',          // X
  'Llave 3 Vías',        // Y
  'Tapón Multifunción',  // Z
  'Infiltración',        // AA
  'Eritematoso',         // AB
  'Retorno',             // AC
  'Infusión Tipo'        // AD
];

export function mapAccesoPerifericoToRow(data: AccesoPerifericoForm): (string | number | boolean)[] {
  const tiene = Boolean(data.tieneAcceso);
  return [
    data.fechaHora,                                   // A
    data.sector,                                      // B
    data.habitacion,                                  // C
    data.cama,                                        // D
    tiene ? 'SI' : '',                                // E
    !tiene ? 'NO' : '',                               // F
    tiene ? (data.cuantas ?? 1) : 0,                  // G
    tiene && data.ubicacion === 'MSD' ? 'SI' : '',    // H
    tiene && data.ubicacion === 'MSI' ? 'SI' : '',    // I
    tiene && data.ubicacion === 'MII' ? 'SI' : '',    // J
    tiene && data.ubicacion === 'MID' ? 'SI' : '',    // K
    tiene ? (data.rotuloFecha || '') : '',            // L
    tiene ? (data.rotuloABB ? 'SI' : 'NO') : '',      // M
    tiene ? (data.rotuloNombre || '') : '',           // N
    tiene ? (data.rotuloLegajo || '') : '',           // O
    tiene ? (data.rotuloTurno || '') : '',            // P
    tiene ? (data.visibilidad ? 'SI' : '') : '',      // Q
    tiene ? (!data.visibilidad ? 'NO' : '') : '',     // R
    tiene && data.fijacionTegaderm ? 'SI' : '',       // S
    tiene && data.fijacionCinta ? 'SI' : '',          // T
    tiene && data.fijacionHipafix ? 'SI' : '',        // U
    tiene && data.fijacionVenda ? 'SI' : '',          // V
    tiene && data.fijacionContencionMecanica ? 'SI' : '', // W
    tiene ? (data.fijacionAdherencia || '') : '',     // X
    tiene && data.lumenesLlave3Vias ? 'SI' : '',      // Y
    tiene && data.lumenesTaponMultifuncion ? 'SI' : '',// Z
    tiene && data.caracteristicasInfiltracion ? 'SI' : '', // AA
    tiene && data.caracteristicasEritematoso ? 'SI' : '',   // AB
    tiene && data.caracteristicasRetorno ? 'SI' : '',      // AC
    tiene ? (data.infusionType || 'ninguna') : ''     // AD
  ];
}

// Cabeceras exactas para la hoja UPP (Úlceras por Presión)
export const UPP_HEADERS = [
  'Fecha/Hora',          // A
  'Sector',              // B
  'Habitación',          // C
  'Cama',                // D
  'UPP (SI)',            // E
  'UPP (NO)',            // F
  'Cantidad',            // G
  'Ubicación Sacra',     // H
  'Ubicación Talón',     // I
  'Ubicación Glúteo',    // J
  'Ubicación Posterior', // K
  'Ubicación Otro',      // L
  'Grado',               // M
  'Tratamiento (SI/NO)', // N
  'Tipo Tratamiento',    // O
  'Detalle Tratamiento', // P
  'Escala de Braden',    // Q
  'Nutrición Oral',      // R
  'Nutrición NPT',       // S
  'Nutrición Enteral SN',// T
  'Nutrición Enteral BG',// U
  'Colchón Anti-escaras (SI)', // V
  'Colchón Anti-escaras (NO)', // W
  'Obs Colchón'          // X
];

export function mapUppToRow(data: UppForm): (string | number | boolean)[] {
  const tiene = Boolean(data.tieneUpp);
  return [
    data.fechaHora,                                   // A
    data.sector,                                      // B
    data.habitacion,                                  // C
    data.cama,                                        // D
    tiene ? 'SI' : '',                                // E
    !tiene ? 'NO' : '',                               // F
    tiene ? (data.cuantas ?? 1) : 0,                  // G
    tiene && data.ubicacionSacra ? 'SI' : '',         // H
    tiene && data.ubicacionTalon ? 'SI' : '',         // I
    tiene && data.ubicacionGluteo ? 'SI' : '',        // J
    tiene && data.ubicacionPosterior ? 'SI' : '',      // K
    tiene ? (data.ubicacionOtro || '') : '',          // L
    tiene ? (data.gradoTratamiento || '') : '',       // M
    tiene ? (data.tieneTratamiento ? 'SI' : 'NO') : '', // N
    tiene ? (data.tipoTratamiento || '') : '',        // O
    tiene ? (data.tipoTratamiento ? 'Activo' : '') : '', // P
    tiene ? (data.escalaBraden ?? '') : '',           // Q
    tiene && data.nutricion === 'oral' ? 'SI' : '',   // R
    tiene && data.nutricion === 'NPT' ? 'SI' : '',    // S
    tiene && data.nutricion === 'enteral SN' ? 'SI' : '', // T
    tiene && data.nutricion === 'enteral BG' ? 'SI' : '', // U
    tiene ? (data.colchonAntiEscaras ? 'SI' : '') : '', // V
    tiene ? (!data.colchonAntiEscaras ? 'NO' : '') : '',// W
    tiene ? (data.observacionesColchon || '') : ''    // X
  ];
}
