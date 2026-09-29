import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import {
  ACCESO_PERIFERICO_HEADERS,
  SONDA_HEADERS,
  UPP_HEADERS,
  mapAccesoPerifericoToRow,
  mapSondaToRow,
  mapUppToRow,
} from '../services/sheetMapper';
import type { AccesoPerifericoForm, BasePatientData, SondaVesicalForm, UppForm } from '../types/form';

const base: BasePatientData = {
  fechaHora: '05/03/2026 10:00',
  fechaIngreso: '2026-03-01',
  sexo: 'F',
  sector: 'B',
  habitacion: '201',
  cama: '2',
  historiaClinica: '00123',
  cantidadEnfermeras: 2,
  cantidadAuxiliares: 1,
};

const col = (headers: string[], row: unknown[], name: string) => row[headers.indexOf(name)];

describe('contrato con Code.gs', () => {
  // Code.gs escribe por nombre de columna: los nombres de la app tienen que existir allá.
  const gas = runInNewContext(
    readFileSync('google-apps-script/Code.gs', 'utf8') + '\n;({HEADERS_ACCESO_PERIFERICO, HEADERS_UPP, HEADERS_SONDAS})',
    {}
  );

  it.each([
    ['Acceso', ACCESO_PERIFERICO_HEADERS, gas.HEADERS_ACCESO_PERIFERICO],
    ['UPP', UPP_HEADERS, gas.HEADERS_UPP],
    ['Sondas', SONDA_HEADERS, gas.HEADERS_SONDAS],
  ])('%s: cabeceras de la app = cabeceras del script sin Mail/ID', (_, app, script) => {
    expect([...app, 'Mail Enviado', 'ID Registro']).toEqual(script);
  });
});

describe('mapAccesoPerifericoToRow', () => {
  const data: AccesoPerifericoForm = {
    ...base,
    tieneAcceso: true,
    cuantas: 1,
    ubicacionMSD: true,
    tieneRotulo: true,
    rotuloTieneFecha: true,
    rotuloTieneNombre: false,
    rotuloTieneEnfermero: true,
    visibilidad: false,
    fijacionCinta: true,
    fijacionCintaTipo: 'seda',
    fijacionAdherencia: 'total',
    caracteristicasRetorno: true,
    infusionType: 'continua',
  };
  const row = mapAccesoPerifericoToRow(data);

  it('tiene una celda por cabecera', () => {
    expect(row).toHaveLength(ACCESO_PERIFERICO_HEADERS.length);
  });

  it('Nombre y Enfermero del rótulo son independientes', () => {
    expect(col(ACCESO_PERIFERICO_HEADERS, row, 'Rótulo Nombre')).toBe('NO');
    expect(col(ACCESO_PERIFERICO_HEADERS, row, 'Rótulo Enfermero')).toBe('SI');
  });

  it('visibilidad NO va en su columna', () => {
    expect(col(ACCESO_PERIFERICO_HEADERS, row, 'Visibilidad (NO)')).toBe('NO');
    expect(col(ACCESO_PERIFERICO_HEADERS, row, 'Visibilidad (SI)')).toBe('');
  });

  it('fecha de ingreso en dd/mm/aaaa', () => {
    expect(col(ACCESO_PERIFERICO_HEADERS, row, 'Fecha Ingreso')).toBe('01/03/2026');
  });

  it('cama libre: sin datos de vía y con el estado', () => {
    const libre = mapAccesoPerifericoToRow({ ...base, tieneAcceso: false, tipoAccesoAlternativo: 'ausente', motivoAusente: 'Libre' });
    expect(col(ACCESO_PERIFERICO_HEADERS, libre, 'Tipo Acceso Alt.')).toBe('Libre');
    expect(col(ACCESO_PERIFERICO_HEADERS, libre, 'Rótulo (SI/NO)')).toBe('');
  });
});

describe('mapUppToRow', () => {
  it('área cerrada vacía si no tiene LPP', () => {
    const row = mapUppToRow({ ...base, tieneUpp: false } as UppForm);
    expect(row).toHaveLength(UPP_HEADERS.length);
    expect(col(UPP_HEADERS, row, 'Área Cerrada (SI/NO)')).toBe('');
  });

  it('área cerrada con el nombre si tiene LPP', () => {
    const row = mapUppToRow({ ...base, tieneUpp: true, pasoAreaCerrada: true, areaCerradaCual: 'UTI', escalaBraden: 12 } as UppForm);
    expect(col(UPP_HEADERS, row, 'Área Cerrada (SI/NO)')).toBe('SI (UTI)');
    expect(col(UPP_HEADERS, row, 'Escala de Braden')).toBe(12);
  });
});

describe('mapSondaToRow', () => {
  it('cama libre: estado en su columna y "Tiene Sonda" vacío', () => {
    const row = mapSondaToRow({ ...base, tieneSonda: 'NO', motivoAusente: 'Quimio' } as SondaVesicalForm);
    expect(row).toHaveLength(SONDA_HEADERS.length);
    expect(col(SONDA_HEADERS, row, 'Estado Cama')).toBe('Quimio');
    expect(col(SONDA_HEADERS, row, 'Tiene Sonda')).toBe('');
  });

  it('motivo de ubicación con nombre legible', () => {
    const row = mapSondaToRow({
      ...base,
      tieneSonda: 'SI',
      numeroSonda: '16',
      lumenes: '2',
      fijacion: 'SI',
      ubicacionCorrecta: 'NO',
      ubicacionMotivo: 'bricker',
    });
    expect(col(SONDA_HEADERS, row, 'Motivo Ubicacion')).toBe('Bricker');
  });
});
