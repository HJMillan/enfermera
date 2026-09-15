import React, { useState, useEffect } from 'react';
import {
  Save,
  Plus,
  Minus,
  CheckCircle,
  HeartPulse,
  Sparkles,
  Award,
  Calendar,
  LifeBuoy,
} from 'lucide-react';
import type { BasePatientData, UppForm as UppFormType } from '../../types/form';
import { ToggleYesNo } from '../common/ToggleYesNo';
import { TouchChip } from '../common/TouchChip';
import { BedStatusSelector } from '../common/BedStatusSelector';
import { getCurrentDateISO } from '../../utils/dateUtils';

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

type GradoKey = 'gradoI' | 'gradoII' | 'gradoIII' | 'gradoIV';

const COMMON_TREATMENTS = [
  'Curación Plana',
  'Platsul / Sulfadiazina',
  'DuoDerm / Hidrocoloide',
  'Colagenasa (Iruxol)',
  'Alginato',
  'Cavilon / Film Protector',
  'Solución Fisiológica',
  'Sacarosa (Azúcar)',
];

const INITIAL_UPP_STATE = {
  tieneUpp: false,
  motivoAusente: '',
  fechaIngreso: getCurrentDateISO(),
  pasoAreaCerrada: false,
  areaCerradaCual: '',
  cuantas: 1,
  ubicacionSacra: false,
  ubicacionTalon: false,
  ubicacionGluteo: false,
  ubicacionPosterior: false,
  ubicacionOtro: '',
  gradoI: false,
  gradoII: false,
  gradoIII: false,
  gradoIV: false,
  tieneTratamiento: true,
  tratamientos: [] as string[],
  otroTratamiento: '',
  tieneDispositivoApoyo: false,
  dispositivoAro: false,
  dispositivoGuantesAgua: false,
  dispositivoOtro: '',
  escalaBraden: 15,
  nutricionOral: true,
  nutricionNpt: false,
  nutricionEnteralSn: false,
  nutricionEnteralBg: false,
  colchonAntiEscaras: true,
  observacionesColchon: '',
};

export const UppForm: React.FC<UppFormProps> = ({ patient, onSubmit, onOpenShiftClose }) => {
  const [form, setForm] = useState(INITIAL_UPP_STATE);
  const [hasOtroDispositivo, setHasOtroDispositivo] = useState(false);
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

  const toggleTratamiento = (treat: string) => {
    setForm((prev) => {
      const exists = prev.tratamientos.includes(treat);
      return {
        ...prev,
        tratamientos: exists
          ? prev.tratamientos.filter((t) => t !== treat)
          : [...prev.tratamientos, treat],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const allTreatments = [...form.tratamientos];
      if (form.otroTratamiento.trim()) {
        allTreatments.push(form.otroTratamiento.trim());
      }
      const tipoTratamientoStr = allTreatments.join(', ');

      const nutricionList = [
        form.nutricionOral && 'Oral',
        form.nutricionNpt && 'NPT',
        form.nutricionEnteralSn && 'Enteral (Sonda Naso)',
        form.nutricionEnteralBg && 'Enteral (Botón Gástrico)',
      ]
        .filter(Boolean)
        .join(', ');

      const fullData: UppFormType = {
        ...patient,
        ...form,
        tratamientos: allTreatments,
        tipoTratamiento: tipoTratamientoStr,
        nutricion: nutricionList,
        dispositivoOtro: hasOtroDispositivo ? form.dispositivoOtro : '',
      };
      await onSubmit(fullData);
      setForm(INITIAL_UPP_STATE);
      setHasOtroDispositivo(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rangos actualizados de Braden:
  // <= 12: Riesgo Alto (rojo)
  // 13 - 14: Riesgo Moderado (ámbar)
  // > 14: Riesgo Bajo (verde)
  const getBradenRiskBadge = (score: number) => {
    if (score <= 12) {
      return { label: 'Riesgo Alto', color: 'bg-rose-100 text-rose-800 border-rose-300' };
    }
    if (score <= 14) {
      return { label: 'Riesgo Moderado', color: 'bg-amber-100 text-amber-800 border-amber-300' };
    }
    return { label: 'Riesgo Bajo', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
  };

  const bradenRisk = getBradenRiskBadge(form.escalaBraden);

  return (
    <form
      id="upp-form"
      onSubmit={handleSubmit}
      className="px-3 pb-12 md:px-4 space-y-3.5 max-w-2xl mx-auto"
    >
      {/* 0. ESTADO DE LA CAMA (Al comienzo del relevamiento) */}
      <BedStatusSelector
        value={form.motivoAusente || ''}
        onChange={(status) =>
          setForm((p) => ({
            ...p,
            motivoAusente: status,
            tieneUpp: status ? false : p.tieneUpp,
          }))
        }
        cama={patient.cama}
        habitacion={patient.habitacion}
      />

      {/* SI SE SELECCIONA UN ESTADO DE CAMA, LO DE ABAJO SE BLOQUEA Y SOLO APARECE EL BOTÓN DE GUARDAR */}
      {form.motivoAusente ? (
        <div className="space-y-3 animate-fade-in pt-1">
          <div className="p-4 rounded-2xl bg-amber-50/90 border-2 border-amber-300 text-amber-950 space-y-2 text-center shadow-xs">
            <h3 className="font-extrabold text-base md:text-lg">
              Cama {patient.cama} — {form.motivoAusente === 'Libre' ? 'Cama Libre' : `Paciente en ${form.motivoAusente}`}
            </h3>
            <p className="text-xs text-amber-800 font-medium max-w-md mx-auto">
              Relevamiento de UPP bloqueado para esta cama ya que el paciente no se encuentra en ella.
            </p>
          </div>

          {/* Único botón visible: Guardar correspondiente */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[58px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base md:text-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 touch-active cursor-pointer transition-all"
          >
            <CheckCircle className="w-5 h-5" />
            <span>
              {isSubmitting
                ? 'Guardando...'
                : form.motivoAusente === 'Libre'
                ? 'Guardar Cama Libre'
                : `Guardar Paciente en ${form.motivoAusente}`}
            </span>
            <span className="text-xs bg-emerald-700/60 px-2 py-0.5 rounded font-mono hidden sm:inline">
              [Enter]
            </span>
          </button>
        </div>
      ) : (
        <>
          {/* Pregunta Clave de Mínimos Clicks */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                Cama {patient.cama} · Habitación {patient.habitacion}
                {patient.historiaClinica && ` · HC: ${patient.historiaClinica}`}
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
                <span className="text-xs bg-emerald-700/60 px-2 py-0.5 rounded font-mono hidden sm:inline">
                  [Enter]
                </span>
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

      {/* CASO 2: SÍ TIENE UPP -> Formulario completo desplegado */}
      {form.tieneUpp && (
        <div className="space-y-3.5 animate-fade-in">
          {/* 1. Contexto de Ingreso y Área Cerrada */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <span className="block font-bold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Calendar className="w-4 h-4 text-rose-700" />
              Datos de Ingreso del Paciente
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                  Fecha de Ingreso
                </label>
                <input
                  type="date"
                  value={form.fechaIngreso}
                  onChange={(e) => setForm((p) => ({ ...p, fechaIngreso: e.target.value }))}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                  ¿Pasó por Área Cerrada?
                </label>
                <div className="grid grid-cols-2 gap-2 min-h-[44px]">
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, pasoAreaCerrada: true }))}
                    className={`rounded-xl font-bold text-xs border touch-active cursor-pointer ${
                      form.pasoAreaCerrada
                        ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    SÍ
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, pasoAreaCerrada: false, areaCerradaCual: '' }))}
                    className={`rounded-xl font-bold text-xs border touch-active cursor-pointer ${
                      !form.pasoAreaCerrada
                        ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    NO
                  </button>
                </div>
              </div>
            </div>

            {/* Selector de Servicio Cerrado si respondió SÍ */}
            {form.pasoAreaCerrada && (
              <div className="pt-2 border-t border-slate-100 space-y-2 animate-fade-in">
                <span className="text-[11px] font-bold text-slate-600 uppercase block">
                  Selecciona o escribe el Área Cerrada de origen:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {['UTI', 'UCO', 'Quirófano', 'Shock Room', 'Piso / Sala'].map((area) => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, areaCerradaCual: area }))}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all touch-active cursor-pointer ${
                        form.areaCerradaCual === area
                          ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {area}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={form.areaCerradaCual}
                  onChange={(e) => setForm((p) => ({ ...p, areaCerradaCual: e.target.value }))}
                  placeholder="O escribe otra área específica..."
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white"
                />
              </div>
            )}
          </div>

          {/* 2. Cantidad y Ubicación Anatómica */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-sm">Cantidad de Lesiones</span>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() =>
                    setForm((p) => ({ ...p, cuantas: Math.max(1, (p.cuantas || 1) - 1) }))
                  }
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center touch-active"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-bold text-base w-6 text-center text-rose-900">
                  {form.cuantas}
                </span>
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
              <span className="block font-bold text-slate-800 text-sm mb-1.5">
                Ubicación de la Lesión
              </span>
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
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                  Otra ubicación (opcional)
                </label>
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

          {/* 3. Grados de la UPP (Multi-selección) y Tratamiento */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-slate-800 text-sm">Grado de la UPP</span>
                <span className="text-[11px] text-rose-700 font-semibold">
                  (Selección múltiple permitida)
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { key: 'gradoI' as const, label: 'I' },
                  { key: 'gradoII' as const, label: 'II' },
                  { key: 'gradoIII' as const, label: 'III' },
                  { key: 'gradoIV' as const, label: 'IV' },
                ].map((g) => (
                  <TouchChip
                    key={g.key}
                    label={g.label}
                    subtitle="Grado"
                    color="danger"
                    selected={Boolean(form[g.key as GradoKey])}
                    onClick={() =>
                      setForm((p) => ({ ...p, [g.key]: !p[g.key as GradoKey] }))
                    }
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
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                  Tipo de Curación / Tratamiento
                </label>

                {/* Chips de insumos rápidos con selección múltiple */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {COMMON_TREATMENTS.map((treat) => {
                    const isSelected = form.tratamientos.includes(treat);
                    return (
                      <button
                        key={treat}
                        type="button"
                        onClick={() => toggleTratamiento(treat)}
                        className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition-all touch-active cursor-pointer ${
                          isSelected
                            ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Sparkles className="w-3 h-3 inline mr-1 text-amber-500" />
                        {treat}
                      </button>
                    );
                  })}
                </div>

                <input
                  type="text"
                  value={form.otroTratamiento}
                  onChange={(e) => setForm((p) => ({ ...p, otroTratamiento: e.target.value }))}
                  placeholder="O escribe otro tratamiento personalizado..."
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white"
                />
              </div>
            )}
          </div>

          {/* 4. Dispositivos de Apoyo (Nueva sección / Card) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <LifeBuoy className="w-4 h-4 text-sky-700" />
              <span className="font-bold text-slate-900 text-sm">Dispositivos de Apoyo</span>
            </div>

            <ToggleYesNo
              label="¿Cuenta con Dispositivo de Apoyo?"
              description="Indica si el paciente utiliza elementos de alivio de presión"
              value={Boolean(form.tieneDispositivoApoyo)}
              onChange={(val) => setForm((p) => ({ ...p, tieneDispositivoApoyo: val }))}
            />

            {form.tieneDispositivoApoyo && (
              <div className="space-y-3 pt-2 border-t border-slate-100 animate-fade-in">
                <span className="text-[11px] font-bold text-slate-600 uppercase block">
                  Dispositivos en uso:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <TouchChip
                    label="Aro"
                    selected={Boolean(form.dispositivoAro)}
                    onClick={() => setForm((p) => ({ ...p, dispositivoAro: !p.dispositivoAro }))}
                  />

                  <TouchChip
                    label="Guantes con agua"
                    subtitle="Para talones"
                    selected={Boolean(form.dispositivoGuantesAgua)}
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        dispositivoGuantesAgua: !p.dispositivoGuantesAgua,
                      }))
                    }
                  />

                  <TouchChip
                    label="Otro"
                    subtitle="Especificar..."
                    selected={hasOtroDispositivo}
                    onClick={() => setHasOtroDispositivo((prev) => !prev)}
                  />
                </div>

                {/* Input libre cuando "Otro" está seleccionado */}
                {hasOtroDispositivo && (
                  <div className="pt-1 animate-fade-in">
                    <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                      Descripción del otro dispositivo de apoyo:
                    </label>
                    <input
                      type="text"
                      value={form.dispositivoOtro}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, dispositivoOtro: e.target.value }))
                      }
                      placeholder="Ej: Taloneras de vellón, almohada cuña, etc..."
                      className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. Escala de Braden (<=12 Alto, 13-14 Moderado, >14 Bajo) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 text-sm block">Escala de Braden</span>
                <span className="text-xs text-slate-600">Riesgo de lesión según puntuación</span>
              </div>
              <span
                className={`text-xs font-extrabold px-2.5 py-1 rounded-full border ${bradenRisk.color}`}
              >
                {form.escalaBraden} pts · {bradenRisk.label}
              </span>
            </div>

            {/* Stepper numérico */}
            <div className="flex items-center justify-center gap-4 py-1">
              <button
                type="button"
                onClick={() =>
                  setForm((p) => ({ ...p, escalaBraden: Math.max(3, p.escalaBraden - 1) }))
                }
                className="w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-lg touch-active cursor-pointer"
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
                onClick={() =>
                  setForm((p) => ({ ...p, escalaBraden: Math.min(23, p.escalaBraden + 1) }))
                }
                className="w-12 h-12 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white flex items-center justify-center font-bold text-lg touch-active cursor-pointer"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Presets rápidos ajustados a los 3 rangos exactos */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { score: 10, label: '≤12 (Riesgo Alto)' },
                { score: 13, label: '13-14 (Riesgo Moderado)' },
                { score: 15, label: '>14 (Riesgo Bajo)' },
              ].map((preset) => (
                <button
                  key={preset.score}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, escalaBraden: preset.score }))}
                  className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all touch-active cursor-pointer ${
                    (preset.score === 10 && form.escalaBraden <= 12) ||
                    (preset.score === 13 && form.escalaBraden >= 13 && form.escalaBraden <= 14) ||
                    (preset.score === 15 && form.escalaBraden > 14)
                      ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Nutrición (Multi-selección) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <span className="block font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-rose-700" />
              Tipo de Nutrición (Selección múltiple)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <TouchChip
                label="Oral"
                selected={form.nutricionOral}
                onClick={() => setForm((p) => ({ ...p, nutricionOral: !p.nutricionOral }))}
              />
              <TouchChip
                label="NPT (Parenteral)"
                selected={form.nutricionNpt}
                onClick={() => setForm((p) => ({ ...p, nutricionNpt: !p.nutricionNpt }))}
              />
              <TouchChip
                label="Enteral (Sonda Naso)"
                selected={form.nutricionEnteralSn}
                onClick={() => setForm((p) => ({ ...p, nutricionEnteralSn: !p.nutricionEnteralSn }))}
              />
              <TouchChip
                label="Enteral (Botón Gástrico)"
                selected={form.nutricionEnteralBg}
                onClick={() => setForm((p) => ({ ...p, nutricionEnteralBg: !p.nutricionEnteralBg }))}
              />
            </div>
          </div>

          {/* 7. Colchón Anti-escaras */}
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
          <div className="pt-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[56px] rounded-2xl bg-rose-700 hover:bg-rose-800 text-white font-extrabold text-base md:text-lg flex items-center justify-center gap-2 shadow-lg shadow-rose-200 touch-active cursor-pointer transition-all"
            >
              <Save className="w-5 h-5" />
              <span>{isSubmitting ? 'Guardando...' : 'Guardar Registro de UPP'}</span>
              <span className="text-xs bg-rose-800/60 px-2 py-0.5 rounded font-mono hidden sm:inline">
                [Enter]
              </span>
            </button>
          </div>
        </div>
      )}
        </>
      )}
    </form>
  );
};
