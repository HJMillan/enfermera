import React, { useState, useEffect } from 'react';
import { Save, CheckCircle } from 'lucide-react';
import type { BasePatientData, SondaVesicalForm as SondaFormType, UbicacionSondaMotivo } from '../../types/form';
import { ToggleYesNo } from '../common/ToggleYesNo';
import { TouchChip } from '../common/TouchChip';
import { BedStatusSelector } from '../common/BedStatusSelector';
import { validateSharedPatient, validateSondaForm } from '../../utils/patientValidation';

interface SondaVesicalFormProps {
  patient: BasePatientData;
  onSubmit: (formData: SondaFormType) => Promise<void>;
}

const INITIAL_SONDA_STATE = {
  tieneSonda: '' as 'SI' | 'NO' | '',
  numeroSonda: '',
  lumenes: '' as '2' | '3' | '',
  fijacion: '' as 'SI' | 'NO' | '',
  ubicacionCorrecta: '' as 'SI' | 'NO' | '',
  ubicacionMotivo: '' as UbicacionSondaMotivo,
  motivoAusente: '',
  observaciones: '',
};

const MOTIVO_UBICACION: { id: Exclude<UbicacionSondaMotivo, ''>; label: string }[] = [
  { id: 'nefrectomia_derecha', label: 'Nefrectomía derecha' },
  { id: 'nefrectomia_izquierda', label: 'Nefrectomía izquierda' },
  { id: 'bricker', label: 'Bricker' },
  { id: 'nada', label: 'Nada' },
];

export const SondaVesicalForm: React.FC<SondaVesicalFormProps> = ({ patient, onSubmit }) => {
  const [form, setForm] = useState(INITIAL_SONDA_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setForm((prev) => ({
          ...prev,
          tieneSonda: 'NO',
          numeroSonda: '',
          lumenes: '',
          fijacion: '',
          ubicacionCorrecta: '',
          ubicacionMotivo: '',
        }));
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setForm((prev) => ({ ...prev, tieneSonda: 'SI' }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTieneSonda = (val: boolean) => {
    setError(null);
    if (!val) {
      setForm((prev) => ({
        ...prev,
        tieneSonda: 'NO',
        numeroSonda: '',
        lumenes: '',
        fijacion: '',
        ubicacionCorrecta: '',
        ubicacionMotivo: '',
      }));
      return;
    }
    setForm((prev) => ({ ...prev, tieneSonda: 'SI' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.motivoAusente) {
      const sharedError = validateSharedPatient(patient);
      if (sharedError) {
        setError(sharedError);
        return;
      }
    }
    const sondaError = validateSondaForm(form);
    if (sondaError) {
      setError(sondaError);
      return;
    }

    setIsSubmitting(true);
    try {
      const fullData: SondaFormType = {
        ...patient,
        ...form,
      };
      await onSubmit(fullData);
      setForm(INITIAL_SONDA_STATE);
      setError(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      id="sonda-vesical-form"
      onSubmit={handleSubmit}
      className="px-3 pb-12 md:px-4 space-y-3.5 max-w-2xl mx-auto"
    >
      <BedStatusSelector
        value={form.motivoAusente || ''}
        onChange={(status) =>
          setForm((p) => ({
            ...p,
            motivoAusente: status,
            tieneSonda: status ? 'NO' : p.tieneSonda,
            numeroSonda: status ? '' : p.numeroSonda,
            lumenes: status ? '' : p.lumenes,
            fijacion: status ? '' : p.fijacion,
            ubicacionCorrecta: status ? '' : p.ubicacionCorrecta,
            ubicacionMotivo: status ? '' : p.ubicacionMotivo,
          }))
        }
        cama={patient.cama}
        habitacion={patient.habitacion}
      />

      {form.motivoAusente ? (
        <div className="space-y-3 animate-fade-in pt-1">
          <div className="p-4 rounded-[var(--radius-md)] bg-amber-50/95 border-2 border-amber-300 text-amber-950 space-y-2 text-center shadow-[var(--shadow-rest)]">
            <h3 className="font-extrabold text-base md:text-lg">
              Cama {patient.cama} — {form.motivoAusente === 'Libre' ? 'Cama Libre' : `Paciente en ${form.motivoAusente}`}
            </h3>
            <p className="text-xs text-amber-800 font-medium max-w-md mx-auto">
              Relevamiento de sonda vesical bloqueado para esta cama ya que el paciente no se encuentra en ella.
            </p>
          </div>

          {error && (
            <p className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-[var(--radius-sm)] px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[58px] rounded-[var(--radius-md)] bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base md:text-lg flex items-center justify-center gap-2 shadow-[var(--shadow-hover)] cursor-pointer transition-[transform,box-shadow,background-color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] hover:scale-[1.015] hover:-translate-y-0.5"
          >
            <CheckCircle className="w-5 h-5" />
            <span>
              {isSubmitting
                ? 'Guardando...'
                : form.motivoAusente === 'Libre'
                ? 'Guardar Cama Libre'
                : `Guardar Paciente en ${form.motivoAusente}`}
            </span>
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white p-4 rounded-[var(--radius-md)] border border-slate-200/80 shadow-[var(--shadow-rest)]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded-[var(--radius-sm)] border border-teal-100">
                Cama {patient.cama} · Habitación {patient.habitacion}
                {patient.historiaClinica && ` · HC: ${patient.historiaClinica}`}
              </span>
              <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                Atajos: [N] No · [S] Sí
              </span>
            </div>

            <ToggleYesNo
              label="¿El paciente tiene sonda vesical?"
              description="Si elegís SÍ se piden graduación, lúmenes, fijación y ubicación"
              value={form.tieneSonda === '' ? undefined : form.tieneSonda === 'SI'}
              onChange={handleTieneSonda}
            />
          </div>

          {form.tieneSonda === 'NO' && (
            <div className="pt-2 animate-fade-in space-y-3">
              {error && (
                <p className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-[var(--radius-sm)] px-3 py-2">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[56px] rounded-[var(--radius-md)] bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base md:text-lg flex items-center justify-center gap-2 shadow-[var(--shadow-hover)] cursor-pointer transition-[transform,box-shadow,background-color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] hover:scale-[1.015] hover:-translate-y-0.5"
              >
                <CheckCircle className="w-5 h-5" />
                <span>{isSubmitting ? 'Guardando...' : 'Guardar paciente (sin sonda vesical)'}</span>
              </button>
              <p className="text-center text-xs text-slate-600 font-medium">
                Se registrará como NO tiene sonda vesical para esta cama.
              </p>
            </div>
          )}

          {form.tieneSonda === 'SI' && (
            <div className="space-y-3.5 animate-fade-in">
              <div className="bg-white p-4 rounded-[var(--radius-md)] border border-slate-200/80 shadow-[var(--shadow-rest)] space-y-3">
                <span className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2 block">
                  Datos de la sonda
                </span>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                    Número / graduación (Fr)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={6}
                    max={26}
                    step={1}
                    value={form.numeroSonda}
                    onChange={(e) => setForm((p) => ({ ...p, numeroSonda: e.target.value }))}
                    placeholder="Ej: 16"
                    className="w-full min-h-[44px] px-3 rounded-[var(--radius-sm)] border border-slate-200 text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <span className="font-bold text-slate-800 text-sm block mb-1.5">
                    Lúmenes de la sonda
                  </span>
                  <p className="text-xs text-slate-600 mb-2">Solo puede ser 2 o 3.</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {(['2', '3'] as const).map((lum) => (
                      <button
                        key={lum}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, lumenes: lum }))}
                        className={`min-h-[52px] rounded-[var(--radius-sm)] font-extrabold text-base border-2 transition-[transform,box-shadow,background-color,border-color,color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] cursor-pointer ${
                          form.lumenes === lum
                            ? 'bg-teal-700 text-white border-teal-700 shadow-[var(--shadow-rest)]'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {lum} lúmenes
                      </button>
                    ))}
                  </div>
                </div>

                <ToggleYesNo
                  label="¿Tiene fijación?"
                  value={form.fijacion === '' ? undefined : form.fijacion === 'SI'}
                  onChange={(val) => setForm((p) => ({ ...p, fijacion: val ? 'SI' : 'NO' }))}
                />

                <ToggleYesNo
                  label="¿Ubicación correcta?"
                  value={form.ubicacionCorrecta === '' ? undefined : form.ubicacionCorrecta === 'SI'}
                  onChange={(val) =>
                    setForm((p) => ({
                      ...p,
                      ubicacionCorrecta: val ? 'SI' : 'NO',
                      ubicacionMotivo: val ? '' : p.ubicacionMotivo,
                    }))
                  }
                />

                {form.ubicacionCorrecta === 'NO' && (
                  <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl space-y-1.5 animate-fade-in">
                    <span className="block text-xs font-bold text-amber-950">
                      Motivo de ubicación no correcta:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {MOTIVO_UBICACION.map((opt) => (
                        <TouchChip
                          key={opt.id}
                          label={opt.label}
                          selected={form.ubicacionMotivo === opt.id}
                          onClick={() => setForm((p) => ({ ...p, ubicacionMotivo: opt.id }))}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white p-4 rounded-[var(--radius-md)] border border-slate-200/80 shadow-[var(--shadow-rest)] space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase block">
                  Observaciones (opcional)
                </label>
                <input
                  type="text"
                  value={form.observaciones}
                  onChange={(e) => setForm((p) => ({ ...p, observaciones: e.target.value }))}
                  placeholder="Notas adicionales de la sonda"
                  className="w-full min-h-[44px] px-3 rounded-[var(--radius-sm)] border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white"
                />
              </div>

              {error && (
                <p className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-[var(--radius-sm)] px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[56px] rounded-[var(--radius-md)] bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-base md:text-lg flex items-center justify-center gap-2 shadow-[var(--shadow-hover)] cursor-pointer transition-[transform,box-shadow,background-color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] hover:scale-[1.015] hover:-translate-y-0.5"
              >
                <Save className="w-5 h-5" />
                <span>{isSubmitting ? 'Guardando...' : 'Guardar registro de sonda'}</span>
              </button>
            </div>
          )}
        </>
      )}
    </form>
  );
};
