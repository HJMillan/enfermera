import React, { useState, useEffect } from 'react';
import { Save, Plus, Minus, CheckCircle, HeartPulse, Sparkles, Award } from 'lucide-react';
import type { BasePatientData, UppForm as UppFormType } from '../../types/form';
import { ToggleYesNo } from '../common/ToggleYesNo';
import { TouchChip } from '../common/TouchChip';

interface UppFormProps {
  patient: BasePatientData;
  onSubmit: (formData: UppFormType) => Promise<void>;
  onOpenShiftClose?: () => void;
}

type UbicacionKey =
  | 'ubicacionSacra'
  | 'ubicacionTalon'
  | 'ubicacionGluteo'
  | 'ubicacionPosterior';

const COMMON_TREATMENTS = [
  'Curación Plana',
  'Platsul / Sulfadiazina',
  'DuoDerm / Hidrocoloide',
  'Alginato de Calcio',
  'Cavilon / Film Protector',
  'Solución Fisiológica',
];

const INITIAL_UPP_STATE = {
  tieneUpp: false,
  cuantas: 1,
  ubicacionSacra: false,
  ubicacionTalon: false,
  ubicacionGluteo: false,
  ubicacionPosterior: false,
  ubicacionOtro: '',
  gradoTratamiento: 'I' as 'I' | 'II' | 'III' | 'IV' | '',
  tieneTratamiento: true,
  tipoTratamiento: '',
  escalaBraden: 15,
  nutricion: 'oral' as 'oral' | 'NPT' | 'enteral SN' | 'enteral BG' | '',
  colchonAntiEscaras: true,
  observacionesColchon: '',
};

export const UppForm: React.FC<UppFormProps> = ({ patient, onSubmit, onOpenShiftClose }) => {
  const [form, setForm] = useState(INITIAL_UPP_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Atajos de teclado en Chromebook
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setForm((prev) => ({ ...prev, tieneUpp: false }));
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setForm((prev) => ({ ...prev, tieneUpp: true }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const fullData: UppFormType = {
        ...patient,
        ...form,
      };
      await onSubmit(fullData);
      setForm(INITIAL_UPP_STATE);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBradenRiskBadge = (score: number) => {
    if (score <= 12) {
      return { label: 'Alto Riesgo', color: 'bg-rose-100 text-rose-800 border-rose-300' };
    }
    if (score <= 14) {
      return { label: 'Riesgo Moderado', color: 'bg-amber-100 text-amber-800 border-amber-300' };
    }
    if (score <= 18) {
      return { label: 'Bajo Riesgo', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
    }
    return { label: 'Sin Riesgo', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
  };

  const bradenRisk = getBradenRiskBadge(form.escalaBraden);

  return (
    <form onSubmit={handleSubmit} className="px-3 pb-24 md:px-4 space-y-3.5 max-w-2xl mx-auto">
      {/* Pregunta Clave de Mínimos Clicks */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
            Cama {patient.cama} · Habitación {patient.habitacion}
          </span>
          <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
            Atajos: [N] No · [S] Sí
          </span>
        </div>

        <ToggleYesNo
          label="¿El paciente presenta Úlcera por Presión (UPP)?"
          description="Selecciona NO si la piel se encuentra íntegra sin lesiones"
          value={form.tieneUpp}
          onChange={(val) => setForm((prev) => ({ ...prev, tieneUpp: val }))}
        />
      </div>

      {/* CASO 1: NO TIENE UPP -> Botón Inmediato (1 toque o Enter) */}
      {!form.tieneUpp && (
        <div className="pt-2 animate-fade-in space-y-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[56px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base md:text-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 touch-active cursor-pointer transition-all"
          >
            <CheckCircle className="w-5 h-5" />
            <span>{isSubmitting ? 'Guardando...' : 'Guardar Paciente (Sin UPP / Piel Íntegra)'}</span>
            <span className="text-xs bg-emerald-700/60 px-2 py-0.5 rounded font-mono hidden sm:inline">[Enter]</span>
          </button>

          <p className="text-center text-xs text-slate-600">
            Se registrará como NO presenta úlceras por presión para esta cama.
          </p>

          {/* Botón rápido para finalizar turno */}
          {onOpenShiftClose && (
            <div className="pt-4 border-t border-slate-200 text-center">
              <button
                type="button"
                onClick={onOpenShiftClose}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl border border-slate-300 touch-active cursor-pointer"
              >
                <Award className="w-4 h-4 text-sky-700" />
                <span>¿Finalizaste la ronda de UPP? Ver Cierre de Turno 8-16hs</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* CASO 2: SÍ TIENE UPP -> Acordeón con preguntas desplegadas */}
      {form.tieneUpp && (
        <div className="space-y-3.5 animate-fade-in">
          {/* 1. Cantidad y Ubicación Anatómica */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-sm">Cantidad de Lesiones</span>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, cuantas: Math.max(1, (p.cuantas || 1) - 1) }))}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center touch-active"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-bold text-base w-6 text-center text-rose-900">{form.cuantas}</span>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, cuantas: (p.cuantas || 1) + 1 }))}
                  className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center touch-active"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <span className="block font-bold text-slate-800 text-sm mb-1.5">Ubicación de la Lesión</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'ubicacionSacra' as const, label: 'Sacra' },
                  { key: 'ubicacionTalon' as const, label: 'Talón' },
                  { key: 'ubicacionGluteo' as const, label: 'Glúteo' },
                  { key: 'ubicacionPosterior' as const, label: 'Posterior' },
                ].map((item) => (
                  <TouchChip
                    key={item.key}
                    label={item.label}
                    color="danger"
                    selected={Boolean(form[item.key as UbicacionKey])}
                    onClick={() =>
                      setForm((p) => ({ ...p, [item.key]: !p[item.key as UbicacionKey] }))
                    }
                  />
                ))}
              </div>

              {/* Otra ubicación */}
              <div className="mt-2.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Otra ubicación (opcional)</label>
                <input
                  type="text"
                  value={form.ubicacionOtro}
                  onChange={(e) => setForm((p) => ({ ...p, ubicacionOtro: e.target.value }))}
                  placeholder="Ej: Omóplato, Occipital, Oreja..."
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* 2. Grado de la Lesión y Tratamiento con Chips Rápidos */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div>
              <span className="block font-bold text-slate-800 text-sm mb-1.5">Grado de la UPP</span>
              <div className="grid grid-cols-4 gap-1.5">
                {(['I', 'II', 'III', 'IV'] as const).map((g) => (
                  <TouchChip
                    key={g}
                    label={g}
                    subtitle="Grado"
                    color="danger"
                    selected={form.gradoTratamiento === g}
                    onClick={() => setForm((p) => ({ ...p, gradoTratamiento: g }))}
                  />
                ))}
              </div>
            </div>

            <ToggleYesNo
              label="¿Tiene Tratamiento Activo?"
              value={form.tieneTratamiento}
              onChange={(val) => setForm((p) => ({ ...p, tieneTratamiento: val }))}
            />

            {form.tieneTratamiento && (
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                  Tipo de Curación / Tratamiento
                </label>

                {/* Chips de insumos rápidos (Zero-Typing) */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {COMMON_TREATMENTS.map((treat) => (
                    <button
                      key={treat}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, tipoTratamiento: treat }))}
                      className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition-all touch-active cursor-pointer ${
                        form.tipoTratamiento === treat
                          ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Sparkles className="w-3 h-3 inline mr-1 text-amber-500" />
                      {treat}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={form.tipoTratamiento}
                  onChange={(e) => setForm((p) => ({ ...p, tipoTratamiento: e.target.value }))}
                  placeholder="O escribe otro tratamiento personalizado..."
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white"
                />
              </div>
            )}
          </div>

          {/* 3. Escala de Braden (3 al 23) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 text-sm block">Escala de Braden</span>
                <span className="text-xs text-slate-600">Rango de 3 a 23 puntos</span>
              </div>
              <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full border ${bradenRisk.color}`}>
                {form.escalaBraden} pts · {bradenRisk.label}
              </span>
            </div>

            {/* Stepper y Presets rápidos */}
            <div className="flex items-center justify-center gap-4 py-1">
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, escalaBraden: Math.max(3, p.escalaBraden - 1) }))}
                className="w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-lg touch-active"
              >
                <Minus className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center">
                <input
                  type="number"
                  min="3"
                  max="23"
                  value={form.escalaBraden}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v)) {
                      setForm((p) => ({ ...p, escalaBraden: Math.min(23, Math.max(3, v)) }));
                    }
                  }}
                  className="w-20 text-center font-extrabold text-3xl text-slate-800 outline-none"
                />
                <span className="text-[10px] text-slate-600 uppercase font-bold">Puntos</span>
              </div>

              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, escalaBraden: Math.min(23, p.escalaBraden + 1) }))}
                className="w-12 h-12 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white flex items-center justify-center font-bold text-lg touch-active"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Accesos rápidos de puntajes estándar */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[
                { score: 10, label: '10 (Alto)' },
                { score: 14, label: '14 (Mod)' },
                { score: 17, label: '17 (Bajo)' },
                { score: 23, label: '23 (Sin)' },
              ].map((preset) => (
                <button
                  key={preset.score}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, escalaBraden: preset.score }))}
                  className={`py-1.5 px-1 rounded-xl text-xs font-bold border transition-all touch-active ${
                    form.escalaBraden === preset.score
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Nutrición */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <span className="block font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-rose-700" />
              Tipo de Nutrición
            </span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'oral' as const, label: 'Oral' },
                { id: 'NPT' as const, label: 'NPT (Parenteral)' },
                { id: 'enteral SN' as const, label: 'Enteral (Sonda Naso)' },
                { id: 'enteral BG' as const, label: 'Enteral (Botón Gástrico)' },
              ].map((item) => (
                <TouchChip
                  key={item.id}
                  label={item.label}
                  selected={form.nutricion === item.id}
                  onClick={() => setForm((p) => ({ ...p, nutricion: item.id }))}
                />
              ))}
            </div>
          </div>

          {/* 5. Colchón Anti-escaras */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <ToggleYesNo
              label="¿Cuenta con Colchón Anti-escaras?"
              value={form.colchonAntiEscaras}
              onChange={(val) => setForm((p) => ({ ...p, colchonAntiEscaras: val }))}
            />

            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                Observaciones del Colchón (opcional)
              </label>
              <input
                type="text"
                value={form.observacionesColchon}
                onChange={(e) => setForm((p) => ({ ...p, observacionesColchon: e.target.value }))}
                placeholder="Ej: En funcionamiento, pinchado, pendiente cambio..."
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white"
              />
            </div>
          </div>

          {/* Botón Principal Guardar */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[56px] rounded-2xl bg-rose-700 hover:bg-rose-800 text-white font-extrabold text-base md:text-lg flex items-center justify-center gap-2 shadow-lg shadow-rose-200 touch-active cursor-pointer transition-all"
            >
              <Save className="w-5 h-5" />
              <span>{isSubmitting ? 'Guardando...' : 'Guardar Registro de UPP'}</span>
              <span className="text-xs bg-rose-800/60 px-2 py-0.5 rounded font-mono hidden sm:inline">[Enter]</span>
            </button>
          </div>
        </div>
      )}
    </form>
  );
};
