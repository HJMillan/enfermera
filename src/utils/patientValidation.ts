import type { BasePatientData, SondaVesicalForm } from '../types/form';

export function validateSharedPatient(patient: BasePatientData): string | null {
  if (!patient.sexo) return 'Indicá si el paciente es masculino o femenino.';
  if (!patient.fechaIngreso) return 'Indicá la fecha de ingreso del paciente.';
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
