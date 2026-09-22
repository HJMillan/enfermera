/**
 * Carga registros genéricos TEST-* en el Sheet (solo para ver Stats).
 * Uso: node scripts/seed-demo-stats.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);
const WEBHOOK = env.VITE_WEBHOOK_URL;
if (!WEBHOOK) {
  console.error('Falta VITE_WEBHOOK_URL en .env');
  process.exit(1);
}

const FECHA = '22/09/2026';
const ts = (hhmm) => `${FECHA} ${hhmm}`;

function mapVias(d) {
  const tiene = Boolean(d.tieneAcceso);
  const esPercutaneo = !tiene && d.tipoAccesoAlternativo === 'percutaneo';
  const evaluaRotulo = tiene || esPercutaneo;
  return [
    d.fechaHora,
    d.sector,
    d.habitacion,
    d.cama,
    d.historiaClinica || '',
    d.cantidadEnfermeras ?? '',
    d.cantidadAuxiliares ?? '',
    tiene ? 'SI' : '',
    !tiene ? 'NO' : '',
    !tiene
      ? d.tipoAccesoAlternativo === 'ausente' || d.motivoAusente
        ? d.motivoAusente || 'Ausente'
        : d.tipoAccesoAlternativo || 'nada'
      : '',
    !tiene && d.tipoAccesoAlternativo === 'acceso_central' ? d.accesoCentralUbicacion || '' : '',
    tiene ? (d.cuantas ?? 1) : 0,
    tiene && d.ubicacionMSD ? 'SI' : '',
    tiene && d.ubicacionMSI ? 'SI' : '',
    tiene && d.ubicacionMII ? 'SI' : '',
    tiene && d.ubicacionMID ? 'SI' : '',
    evaluaRotulo ? (d.tieneRotulo ? 'SI' : 'NO') : '',
    evaluaRotulo && d.tieneRotulo ? (d.rotuloTieneFecha ? 'SI' : 'NO') : '',
    evaluaRotulo && d.tieneRotulo ? (d.rotuloTieneEnfermero ? 'SI' : 'NO') : '',
    evaluaRotulo && d.tieneRotulo ? (d.rotuloTieneLegajo ? 'SI' : 'NO') : '',
    evaluaRotulo && d.tieneRotulo ? (d.rotuloTieneEnfermero ? 'SI' : 'NO') : '',
    evaluaRotulo && d.tieneRotulo ? (d.rotuloTieneTurno ? 'SI' : 'NO') : '',
    evaluaRotulo && d.tieneRotulo ? (d.rotuloTieneABB ? 'SI' : 'NO') : '',
    tiene ? (d.visibilidad ? 'SI' : '') : '',
    tiene ? (!d.visibilidad ? 'NO' : '') : '',
    tiene && d.fijacionTegaderm ? 'SI' : '',
    tiene && d.fijacionCinta ? 'SI' : '',
    tiene && d.fijacionCinta ? d.fijacionCintaTipo || '' : '',
    tiene && d.fijacionHipafix ? 'SI' : '',
    tiene && d.fijacionVenda ? 'SI' : '',
    tiene && d.fijacionContencionMecanica ? 'SI' : '',
    tiene ? d.fijacionAdherencia || '' : '',
    tiene && d.lumenesLlave3Vias ? 'SI' : '',
    tiene && d.lumenesTaponMultifuncion ? 'SI' : '',
    tiene && d.caracteristicasInfiltracion ? 'SI' : '',
    tiene && d.caracteristicasEritematoso ? 'SI' : '',
    tiene ? (d.caracteristicasRetorno ? 'SI' : 'NO') : '',
    tiene ? d.infusionType || '' : '',
    d.motivoAusente
      ? d.observaciones
        ? `${d.motivoAusente} - ${d.observaciones}`
        : d.motivoAusente
      : d.observaciones || '',
  ];
}

function mapUpp(d) {
  const tiene = Boolean(d.tieneUpp);
  const lista = Array.isArray(d.tratamientos) && d.tratamientos.length ? d.tratamientos.join(', ') : '';
  return [
    d.fechaHora,
    d.sector,
    d.habitacion,
    d.cama,
    d.historiaClinica || '',
    d.cantidadEnfermeras ?? '',
    d.cantidadAuxiliares ?? '',
    d.fechaIngreso || '',
    d.pasoAreaCerrada ? (d.areaCerradaCual ? `SI (${d.areaCerradaCual})` : 'SI') : 'NO',
    tiene ? 'SI' : '',
    !tiene ? 'NO' : '',
    tiene ? (d.cuantas ?? 1) : 0,
    tiene && d.ubicacionSacra ? 'SI' : '',
    tiene && d.ubicacionTalon ? 'SI' : '',
    tiene && d.ubicacionGluteo ? 'SI' : '',
    tiene && d.ubicacionPosterior ? 'SI' : '',
    tiene ? d.ubicacionOtro || '' : '',
    tiene && d.gradoI ? 'SI' : '',
    tiene && d.gradoII ? 'SI' : '',
    tiene && d.gradoIII ? 'SI' : '',
    tiene && d.gradoIV ? 'SI' : '',
    tiene ? (d.tieneTratamiento ? 'SI' : 'NO') : '',
    tiene ? lista : '',
    tiene ? (lista ? 'Activo' : '') : '',
    tiene ? (d.tieneDispositivoApoyo ? 'SI' : 'NO') : '',
    tiene && d.tieneDispositivoApoyo && d.dispositivoAro ? 'SI' : '',
    tiene && d.tieneDispositivoApoyo && d.dispositivoGuantesAgua ? 'SI' : '',
    tiene && d.tieneDispositivoApoyo && d.dispositivoOtro ? d.dispositivoOtro : '',
    tiene ? (d.escalaBraden ?? '') : '',
    tiene && d.nutricionOral ? 'SI' : '',
    tiene && d.nutricionNpt ? 'SI' : '',
    tiene && d.nutricionEnteralSn ? 'SI' : '',
    tiene && d.nutricionEnteralBg ? 'SI' : '',
    tiene ? (d.colchonAntiEscaras ? 'SI' : '') : '',
    tiene ? (!d.colchonAntiEscaras ? 'NO' : '') : '',
    !tiene && d.motivoAusente
      ? `Paciente ausente / Cama libre: ${d.motivoAusente}`
      : d.observacionesColchon || '',
  ];
}

const rotuloOk = {
  tieneRotulo: true,
  rotuloTieneFecha: true,
  rotuloTieneEnfermero: true,
  rotuloTieneLegajo: true,
  rotuloTieneTurno: true,
  rotuloTieneABB: true,
};

const vias = [
  {
    fechaHora: ts('08:10'),
    sector: 'PB',
    habitacion: '1',
    cama: '1',
    historiaClinica: 'TEST-VIA-01',
    cantidadEnfermeras: 3,
    cantidadAuxiliares: 2,
    tieneAcceso: true,
    cuantas: 1,
    ubicacionMSD: true,
    ...rotuloOk,
    visibilidad: true,
    fijacionTegaderm: true,
    fijacionAdherencia: 'total',
    caracteristicasRetorno: true,
    infusionType: 'continua',
  },
  {
    fechaHora: ts('08:15'),
    sector: 'PB',
    habitacion: '1',
    cama: '2',
    historiaClinica: 'TEST-VIA-02',
    cantidadEnfermeras: 3,
    cantidadAuxiliares: 2,
    tieneAcceso: true,
    cuantas: 1,
    ubicacionMSI: true,
    tieneRotulo: true,
    rotuloTieneFecha: true,
    rotuloTieneEnfermero: true,
    rotuloTieneLegajo: false,
    rotuloTieneTurno: true,
    rotuloTieneABB: false,
    visibilidad: true,
    fijacionTegaderm: true,
    fijacionAdherencia: 'parcial',
    caracteristicasInfiltracion: true,
    caracteristicasRetorno: true,
    infusionType: 'intermitente',
  },
  {
    fechaHora: ts('08:20'),
    sector: '1° Piso',
    habitacion: '101',
    cama: '1',
    historiaClinica: 'TEST-VIA-03',
    cantidadEnfermeras: 4,
    cantidadAuxiliares: 2,
    tieneAcceso: true,
    cuantas: 1,
    ubicacionMID: true,
    tieneRotulo: false,
    visibilidad: true,
    fijacionTegaderm: true,
    fijacionAdherencia: 'total',
    caracteristicasEritematoso: true,
    caracteristicasRetorno: true,
    infusionType: 'continua',
  },
  {
    fechaHora: ts('08:25'),
    sector: '1° Piso',
    habitacion: '102',
    cama: '1',
    historiaClinica: 'TEST-VIA-04',
    cantidadEnfermeras: 4,
    cantidadAuxiliares: 2,
    tieneAcceso: true,
    cuantas: 2,
    ubicacionMSD: true,
    ubicacionMSI: true,
    ...rotuloOk,
    visibilidad: false,
    fijacionTegaderm: true,
    fijacionAdherencia: 'nula',
    caracteristicasRetorno: false,
    infusionType: 'continua',
  },
  {
    fechaHora: ts('08:30'),
    sector: 'Maternidad',
    habitacion: '242',
    cama: '1',
    historiaClinica: 'TEST-VIA-05',
    cantidadEnfermeras: 2,
    cantidadAuxiliares: 1,
    tieneAcceso: true,
    cuantas: 1,
    ubicacionMII: true,
    ...rotuloOk,
    visibilidad: true,
    fijacionHipafix: true,
    fijacionAdherencia: 'total',
    caracteristicasRetorno: true,
    infusionType: 'intermitente',
  },
  {
    fechaHora: ts('08:35'),
    sector: 'A',
    habitacion: '230',
    cama: '1',
    historiaClinica: 'TEST-VIA-06',
    cantidadEnfermeras: 3,
    cantidadAuxiliares: 1,
    tieneAcceso: false,
    tipoAccesoAlternativo: 'acceso_central',
    accesoCentralUbicacion: 'Y/D',
  },
  {
    fechaHora: ts('08:40'),
    sector: 'B',
    habitacion: '201',
    cama: '1',
    historiaClinica: 'TEST-VIA-07',
    cantidadEnfermeras: 5,
    cantidadAuxiliares: 2,
    tieneAcceso: false,
    tipoAccesoAlternativo: 'percutaneo',
    tieneRotulo: false,
  },
  {
    fechaHora: ts('08:45'),
    sector: 'C',
    habitacion: '237',
    cama: '1',
    historiaClinica: 'TEST-VIA-08',
    cantidadEnfermeras: 3,
    cantidadAuxiliares: 2,
    tieneAcceso: false,
    tipoAccesoAlternativo: 'ausente',
    motivoAusente: 'Libre',
  },
  {
    fechaHora: ts('08:50'),
    sector: 'D',
    habitacion: '216',
    cama: '1',
    historiaClinica: 'TEST-VIA-09',
    cantidadEnfermeras: 2,
    cantidadAuxiliares: 1,
    tieneAcceso: false,
    tipoAccesoAlternativo: 'nada',
  },
  {
    fechaHora: ts('08:55'),
    sector: 'E',
    habitacion: '262',
    cama: '1',
    historiaClinica: 'TEST-VIA-10',
    cantidadEnfermeras: 4,
    cantidadAuxiliares: 3,
    tieneAcceso: true,
    cuantas: 1,
    ubicacionMSD: true,
    ...rotuloOk,
    visibilidad: true,
    fijacionTegaderm: true,
    fijacionAdherencia: 'total',
    caracteristicasInfiltracion: true,
    caracteristicasEritematoso: true,
    caracteristicasRetorno: true,
    infusionType: 'continua',
  },
  {
    fechaHora: ts('09:00'),
    sector: 'E',
    habitacion: '263',
    cama: '2',
    historiaClinica: 'TEST-VIA-11',
    cantidadEnfermeras: 4,
    cantidadAuxiliares: 3,
    tieneAcceso: false,
    tipoAccesoAlternativo: 'ausente',
    motivoAusente: 'Quimio',
  },
  {
    fechaHora: ts('09:05'),
    sector: 'A',
    habitacion: '231',
    cama: '2',
    historiaClinica: 'TEST-VIA-12',
    cantidadEnfermeras: 3,
    cantidadAuxiliares: 1,
    tieneAcceso: true,
    cuantas: 1,
    ubicacionMID: true,
    ...rotuloOk,
    visibilidad: true,
    fijacionTegaderm: true,
    fijacionAdherencia: 'total',
    caracteristicasRetorno: true,
    infusionType: 'intermitente',
  },
];

const upp = [
  {
    fechaHora: ts('09:10'),
    sector: 'PB',
    habitacion: '1',
    cama: '1',
    historiaClinica: 'TEST-UPP-01',
    cantidadEnfermeras: 3,
    cantidadAuxiliares: 2,
    tieneUpp: false,
    fechaIngreso: '20/09/2026',
  },
  {
    fechaHora: ts('09:12'),
    sector: 'PB',
    habitacion: '1',
    cama: '2',
    historiaClinica: 'TEST-UPP-02',
    cantidadEnfermeras: 3,
    cantidadAuxiliares: 2,
    tieneUpp: true,
    fechaIngreso: '18/09/2026',
    cuantas: 1,
    ubicacionSacra: true,
    gradoI: true,
    escalaBraden: 16,
    tieneTratamiento: true,
    tratamientos: ['Hidrocoloide'],
    nutricionOral: true,
    colchonAntiEscaras: true,
  },
  {
    fechaHora: ts('09:15'),
    sector: '1° Piso',
    habitacion: '101',
    cama: '1',
    historiaClinica: 'TEST-UPP-03',
    cantidadEnfermeras: 4,
    cantidadAuxiliares: 2,
    tieneUpp: true,
    fechaIngreso: '15/09/2026',
    cuantas: 1,
    ubicacionSacra: true,
    gradoII: true,
    escalaBraden: 11,
    tieneTratamiento: true,
    tratamientos: ['Espuma', 'Hidrogel'],
    nutricionOral: true,
    colchonAntiEscaras: true,
  },
  {
    fechaHora: ts('09:18'),
    sector: '1° Piso',
    habitacion: '102',
    cama: '1',
    historiaClinica: 'TEST-UPP-04',
    cantidadEnfermeras: 4,
    cantidadAuxiliares: 2,
    tieneUpp: true,
    fechaIngreso: '10/09/2026',
    pasoAreaCerrada: false,
    cuantas: 1,
    ubicacionGluteo: true,
    gradoIII: true,
    escalaBraden: 10,
    tieneTratamiento: true,
    tratamientos: ['Alginato'],
    tieneDispositivoApoyo: true,
    dispositivoAro: true,
    nutricionEnteralSn: true,
    colchonAntiEscaras: true,
  },
  {
    fechaHora: ts('09:20'),
    sector: 'Maternidad',
    habitacion: '242',
    cama: '1',
    historiaClinica: 'TEST-UPP-05',
    cantidadEnfermeras: 2,
    cantidadAuxiliares: 1,
    tieneUpp: false,
    fechaIngreso: '21/09/2026',
  },
  {
    fechaHora: ts('09:22'),
    sector: 'A',
    habitacion: '230',
    cama: '1',
    historiaClinica: 'TEST-UPP-06',
    cantidadEnfermeras: 3,
    cantidadAuxiliares: 1,
    tieneUpp: true,
    fechaIngreso: '08/09/2026',
    pasoAreaCerrada: true,
    areaCerradaCual: 'UTI',
    cuantas: 1,
    ubicacionTalon: true,
    gradoIV: true,
    escalaBraden: 8,
    tieneTratamiento: true,
    tratamientos: ['Apósito de plata'],
    nutricionNpt: true,
    colchonAntiEscaras: true,
  },
  {
    fechaHora: ts('09:25'),
    sector: 'B',
    habitacion: '201',
    cama: '1',
    historiaClinica: 'TEST-UPP-07',
    cantidadEnfermeras: 5,
    cantidadAuxiliares: 2,
    tieneUpp: true,
    fechaIngreso: '12/09/2026',
    cuantas: 2,
    ubicacionSacra: true,
    ubicacionTalon: true,
    gradoI: true,
    gradoII: true,
    escalaBraden: 13,
    tieneTratamiento: true,
    tratamientos: ['Hidrocoloide'],
    tieneDispositivoApoyo: true,
    dispositivoGuantesAgua: true,
    nutricionOral: true,
    colchonAntiEscaras: false,
  },
  {
    fechaHora: ts('09:28'),
    sector: 'C',
    habitacion: '237',
    cama: '1',
    historiaClinica: 'TEST-UPP-08',
    cantidadEnfermeras: 3,
    cantidadAuxiliares: 2,
    tieneUpp: false,
    motivoAusente: 'Libre',
  },
  {
    fechaHora: ts('09:30'),
    sector: 'D',
    habitacion: '216',
    cama: '1',
    historiaClinica: 'TEST-UPP-09',
    cantidadEnfermeras: 2,
    cantidadAuxiliares: 1,
    tieneUpp: true,
    fechaIngreso: '19/09/2026',
    cuantas: 1,
    ubicacionPosterior: true,
    gradoII: true,
    escalaBraden: 14,
    tieneTratamiento: true,
    tratamientos: ['Espuma'],
    nutricionEnteralBg: true,
    colchonAntiEscaras: true,
  },
  {
    fechaHora: ts('09:32'),
    sector: 'E',
    habitacion: '262',
    cama: '1',
    historiaClinica: 'TEST-UPP-10',
    cantidadEnfermeras: 4,
    cantidadAuxiliares: 3,
    tieneUpp: true,
    fechaIngreso: '17/09/2026',
    cuantas: 1,
    ubicacionSacra: true,
    gradoII: true,
    escalaBraden: 15,
    tieneTratamiento: false,
    nutricionOral: true,
    colchonAntiEscaras: false,
  },
];

const payloads = [
  ...vias.map((data) => ({ formType: 'ACCESO_PERIFERICO', data, rowValues: mapVias(data) })),
  ...upp.map((data) => ({ formType: 'UPP', data, rowValues: mapUpp(data) })),
];

async function postOne(payload, i) {
  const body = JSON.stringify({
    formType: payload.formType,
    timestamp: new Date().toISOString(),
    data: payload.data,
    rowValues: payload.rowValues,
  });
  const res = await fetch(WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body,
    redirect: 'follow',
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text.slice(0, 120) };
  }
  const ok = parsed.status === 'success' || res.type === 'opaqueredirect' || res.status === 200;
  console.log(
    `${String(i + 1).padStart(2, '0')}/${payloads.length} ${payload.formType} ${payload.data.historiaClinica} -> ${
      parsed.status || res.status
    } ${parsed.message || ''}`.trim()
  );
  if (!ok && parsed.status === 'error') throw new Error(parsed.message || 'POST error');
}

for (let i = 0; i < payloads.length; i++) {
  await postOne(payloads[i], i);
  await new Promise((r) => setTimeout(r, 450));
}

const qs = new URL(WEBHOOK);
qs.searchParams.set('action', 'GET_STATS');
qs.searchParams.set('from', '2026-09-22');
qs.searchParams.set('to', '2026-09-22');
qs.searchParams.set('ronda', 'ambas');
const check = await fetch(qs, { redirect: 'follow' });
const stats = await check.json();
console.log(
  JSON.stringify(
    {
      status: stats.status,
      filasVias: stats.cobertura?.registrosVias,
      filasUpp: stats.cobertura?.registrosUpp,
      camasVias: stats.cobertura?.viasUnicas,
      camasUpp: stats.cobertura?.uppUnicas,
      perifericos: stats.vias?.conPeriferico,
      conUpp: stats.upp?.conUpp,
      alertas: stats.alertasTotal,
    },
    null,
    2
  )
);
