import type { BasePatientData, SondaVesicalForm } from '../types/form';
import { isPlaceSector, isValidRoom } from '../config/sectorConfig';

/** La habitación tiene que existir en el sector (vale también para camas libres o ausentes). */
export function validatePlace(patient: BasePatientData): string | null {
  if (isPlaceSector(patient.sector)) return null;
  if (!isValidRoom(patient.sector, patient.habitacion)) {
    return `La habitación ${patient.habitacion || '(vacía)'} no existe en el sector ${patient.sector}.`;
  }
  return null;
}

export function validateSharedPatient(
  patient: BasePatientData,
  { requireSexoYIngreso = true }: { requireSexoYIngreso?: boolean } = {}
): string | null {
  if (requireSexoYIngreso) {
    if (!patient.sexo) return 'Indicá si el paciente es masculino o femenino.';
    if (!patient.fechaIngreso) return 'Indicá la fecha de ingreso del paciente.';
  }
  if (!patient.fechaHora) return 'Indicá la fecha y hora del registro.';
  return null;
}

export function validateSondaForm(form: Pick<
  SondaVesicalForm,
  'tieneSonda' | 'numeroSonda' | 'lumenes' | 'fijacion' | 'ubicacionCorrecta' | 'ubicacionMotivo' | 'motivoAusente'
>): string | null {
  if (form.motivoAusente) return null;
  if (form.tieneSonda !== 'SI' && form.tieneSonda !== 'NO') {
    return 'Indicá si el paciente tiene sonda vesical.';
  }
  if (form.tieneSonda === 'NO') return null;

  const fr = Number(form.numeroSonda);
  if (!form.numeroSonda || Number.isNaN(fr) || fr < 6 || fr > 26 || !Number.isInteger(fr)) {
    return 'Indicá el número (Fr) de la sonda, entre 6 y 26.';
  }
  if (form.lumenes !== '2' && form.lumenes !== '3') {
    return 'Indicá si la sonda es de 2 o 3 lúmenes.';
  }
  if (form.fijacion !== 'SI' && form.fijacion !== 'NO') {
    return 'Indicá si la sonda tiene fijación.';
  }
  if (form.ubicacionCorrecta !== 'SI' && form.ubicacionCorrecta !== 'NO') {
    return 'Indicá si la ubicación de la sonda es correcta.';
  }
  if (form.ubicacionCorrecta === 'NO' && !form.ubicacionMotivo) {
    return 'Si la ubicación no es correcta, elegí nefrectomía, Bricker o nada.';
  }
  return null;
}

type AccesoChecks = {
  tieneAcceso: boolean;
  tipoAccesoAlternativo?: string;
  accesoCentralUbicacion?: string;
  fijacionCinta?: boolean;
  fijacionCintaTipo?: string;
  motivoAusente?: string;
};

export function validateAccesoForm(form: AccesoChecks): string | null {
  if (form.motivoAusente) return null;
  if (!form.tieneAcceso && form.tipoAccesoAlternativo === 'acceso_central' && !form.accesoCentralUbicacion) {
    return 'Indicá la ubicación del acceso central (Y/I, Y/D, S/I o S/D).';
  }
  if (form.tieneAcceso && form.fijacionCinta && !form.fijacionCintaTipo) {
    return 'Indicá el tipo de cinta de la fijación.';
  }
  return null;
}

type UppChecks = {
  tieneUpp: boolean;
  motivoAusente?: string;
  ubicacionSacra?: boolean;
  ubicacionTalon?: boolean;
  ubicacionGluteo?: boolean;
  ubicacionPosterior?: boolean;
  ubicacionOtro?: string;
  gradoI?: boolean;
  gradoII?: boolean;
  gradoIII?: boolean;
  gradoIV?: boolean;
};

export function validateUppForm(form: UppChecks): string | null {
  if (form.motivoAusente || !form.tieneUpp) return null;
  const hasUbicacion =
    form.ubicacionSacra || form.ubicacionTalon || form.ubicacionGluteo || form.ubicacionPosterior || Boolean(form.ubicacionOtro?.trim());
  if (!hasUbicacion) return 'Indicá al menos una ubicación de la lesión.';
  if (!(form.gradoI || form.gradoII || form.gradoIII || form.gradoIV)) return 'Indicá al menos un grado de la lesión.';
  return null;
}
