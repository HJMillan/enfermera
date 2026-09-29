import { describe, expect, it } from 'vitest';
import { validateAccesoForm, validatePlace, validateSharedPatient, validateSondaForm, validateUppForm } from '../utils/patientValidation';
import { composeFechaHora, isoToDmy, parseFechaHora } from '../utils/dateUtils';
import type { BasePatientData } from '../types/form';

const patient: BasePatientData = {
  fechaHora: '05/03/2026 10:00',
  fechaIngreso: '',
  sexo: '',
  sector: 'B',
  habitacion: '201',
  cama: '1',
  historiaClinica: '',
};

describe('validaciones', () => {
  it('habitación inexistente', () => {
    expect(validatePlace({ ...patient, habitacion: '999' })).toMatch(/no existe/);
    expect(validatePlace(patient)).toBeNull();
    expect(validatePlace({ ...patient, sector: 'UCE', habitacion: 'UCE' })).toBeNull();
  });

  it('en Vías sexo e ingreso son opcionales', () => {
    expect(validateSharedPatient(patient, { requireSexoYIngreso: false })).toBeNull();
    expect(validateSharedPatient(patient)).toMatch(/masculino o femenino/);
  });

  it('acceso central exige ubicación y cinta exige tipo', () => {
    expect(validateAccesoForm({ tieneAcceso: false, tipoAccesoAlternativo: 'acceso_central' })).toMatch(/acceso central/);
    expect(validateAccesoForm({ tieneAcceso: true, fijacionCinta: true, fijacionCintaTipo: '' })).toMatch(/cinta/);
    expect(validateAccesoForm({ tieneAcceso: false, tipoAccesoAlternativo: 'acceso_central', motivoAusente: 'Libre' })).toBeNull();
  });

  it('LPP exige ubicación y grado', () => {
    expect(validateUppForm({ tieneUpp: true })).toMatch(/ubicación/);
    expect(validateUppForm({ tieneUpp: true, ubicacionSacra: true })).toMatch(/grado/);
    expect(validateUppForm({ tieneUpp: true, ubicacionOtro: 'Oreja', gradoII: true })).toBeNull();
    expect(validateUppForm({ tieneUpp: false })).toBeNull();
  });

  it('sonda: Fr entre 6 y 26', () => {
    const ok = {
      tieneSonda: 'SI' as const,
      numeroSonda: '16',
      lumenes: '2' as const,
      fijacion: 'SI' as const,
      ubicacionCorrecta: 'SI' as const,
    };
    expect(validateSondaForm(ok)).toBeNull();
    expect(validateSondaForm({ ...ok, numeroSonda: '30' })).toMatch(/Fr/);
  });
});

describe('fechas', () => {
  it('iso a dd/mm/aaaa', () => {
    expect(isoToDmy('2026-03-01')).toBe('01/03/2026');
    expect(isoToDmy('')).toBe('');
  });

  it('parse y compose son inversos', () => {
    const parts = parseFechaHora('05/03/2026 09:07');
    expect(parts).toEqual({ date: '2026-03-05', time: '09:07' });
    expect(composeFechaHora(parts.date, parts.time)).toBe('05/03/2026 09:07');
  });
});
