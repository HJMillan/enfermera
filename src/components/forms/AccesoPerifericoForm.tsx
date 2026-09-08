import React, { useState, useEffect } from 'react';
import { Save, Plus, Minus, CheckCircle, ShieldAlert, Activity, ArrowRight, UserCheck } from 'lucide-react';
import type { BasePatientData, AccesoPerifericoForm as AccesoFormType } from '../../types/form';
import { ToggleYesNo } from '../common/ToggleYesNo';
import { TouchChip } from '../common/TouchChip';
import { getCurrentDateISO } from '../../utils/dateUtils';

interface AccesoPerifericoFormProps {
  patient: BasePatientData;
  onSubmit: (formData: AccesoFormType) => Promise<void>;
  onSwitchToUpp?: () => void;
  recentColocadores?: string[];
}

type FijacionKey =
  | 'fijacionTegaderm'
  | 'fijacionCinta'
  | 'fijacionHipafix'
  | 'fijacionVenda'
  | 'fijacionContencionMecanica';

const INITIAL_ACCESO_STATE = {
  tieneAcceso: false,
  cuantas: 1,
  ubicacion: '' as 'MSD' | 'MSI' | 'MII' | 'MID' | '',
  rotuloFecha: getCurrentDateISO(),
  rotuloABB: true,
  rotuloNombre: '',
  rotuloLegajo: '',
  rotuloTurno: 'Mañana' as 'Mañana' | 'Tarde' | 'Noche' | '',
  visibilidad: true,
  fijacionTegaderm: true,
  fijacionCinta: false,
  fijacionHipafix: false,
  fijacionVenda: false,
  fijacionContencionMecanica: false,
  fijacionAdherencia: 'total' as 'total' | 'parcial' | 'nula' | '',
  lumenesLlave3Vias: false,
  lumenesTaponMultifuncion: false,
  caracteristicasInfiltracion: false,
  caracteristicasEritematoso: false,
  caracteristicasRetorno: true,
  infusionType: 'continua' as 'continua' | 'intermitente' | 'ninguna' | '',
};

export const AccesoPerifericoForm: React.FC<AccesoPerifericoFormProps> = ({
  patient,
  onSubmit,
  onSwitchToUpp,
  recentColocadores = [],
}) => {
  const [form, setForm] = useState(INITIAL_ACCESO_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Atajos de teclado en Chromebook cuando no se está dentro de un input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setForm((prev) => ({ ...prev, tieneAcceso: false }));
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setForm((prev) => ({ ...prev, tieneAcceso: true }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const fullData: AccesoFormType = {
        ...patient,
        ...form,
      };
      await onSubmit(fullData);
      setForm((prev) => ({
        ...INITIAL_ACCESO_STATE,
        rotuloNombre: prev.rotuloNombre,
        rotuloLegajo: prev.rotuloLegajo,
        rotuloTurno: prev.rotuloTurno,
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="px-3 pb-24 md:px-4 space-y-3.5 max-w-2xl mx-auto">
      {/* Pregunta Clave de Mínimos Clicks */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
            Cama {patient.cama} · Habitación {patient.habitacion}
          </span>
          <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
            Atajos: [N] No · [S] Sí
          </span>
        </div>

        <ToggleYesNo
          label="¿El paciente tiene Acceso Periférico?"
          description="Selecciona NO si no presenta vías periféricas activas"
          value={form.tieneAcceso}
          onChange={(val) => setForm((prev) => ({ ...prev, tieneAcceso: val }))}
        />
      </div>

      {/* CASO 1: NO TIENE ACCESO -> Botón Inmediato (1 toque o tecla Enter) */}
      {!form.tieneAcceso && (
        <div className="pt-2 animate-fade-in space-y-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[56px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base md:text-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 touch-active cursor-pointer transition-all"
          >
            <CheckCircle className="w-5 h-5" />
            <span>{isSubmitting ? 'Guardando...' : 'Guardar Paciente (Sin Acceso)'}</span>
            <span className="text-xs bg-emerald-700/60 px-2 py-0.5 rounded font-mono hidden sm:inline">[Enter]</span>
          </button>

          <p className="text-center text-xs text-slate-600">
            Se registrará como NO presenta vía y avanzará automáticamente a la siguiente cama.
          </p>

          {/* Transición a Ronda 2 si ya terminó */}
          {onSwitchToUpp && (
            <div className="pt-4 border-t border-slate-200 text-center">
              <button
                type="button"
                onClick={onSwitchToUpp}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 px-3.5 py-2 rounded-xl border border-sky-200 touch-active cursor-pointer"
              >
                <span>¿Terminaste todas las vías? Iniciar Ronda 2: UPP</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* CASO 2: SÍ TIENE ACCESO -> Acordeón con preguntas desplegadas */}
      {form.tieneAcceso && (
        <div className="space-y-3.5 animate-fade-in">
          {/* 1. Cantidad y Ubicación */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-sm">Cantidad de Vías</span>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, cuantas: Math.max(1, (p.cuantas || 1) - 1) }))}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center touch-active"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-bold text-base w-6 text-center text-sky-900">{form.cuantas}</span>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, cuantas: (p.cuantas || 1) + 1 }))}
                  className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center touch-active"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Ubicación Anatómica */}
            <div>
              <span className="block font-bold text-slate-800 text-sm mb-1.5">Ubicación Anatómica</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'MSD' as const, label: 'MSD', sub: 'Brazo Derecho' },
                  { id: 'MSI' as const, label: 'MSI', sub: 'Brazo Izquierdo' },
                  { id: 'MID' as const, label: 'MID', sub: 'Pierna Derecha' },
                  { id: 'MII' as const, label: 'MII', sub: 'Pierna Izquierda' },
                ].map((item) => (
                  <TouchChip
                    key={item.id}
                    label={item.label}
                    subtitle={item.sub}
                    selected={form.ubicacion === item.id}
                    onClick={() => setForm((p) => ({ ...p, ubicacion: item.id }))}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 2. Rótulo de Colocación (Quien colocó la vía) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="border-b border-slate-100 pb-2">
              <span className="font-bold text-slate-900 text-sm block">
                Datos del Rótulo de Colocación (Quien colocó la vía)
              </span>
              <span className="text-xs text-slate-600">
                Trazabilidad del profesional que realizó la venopunción y fecha indicada en el rótulo
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Fecha de Colocación</label>
                <input
                  type="date"
                  value={form.rotuloFecha}
                  onChange={(e) => setForm((p) => ({ ...p, rotuloFecha: e.target.value }))}
                  className="w-full min-h-[44px] px-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">¿Rótulo ABB?</label>
                <div className="grid grid-cols-2 gap-1.5 min-h-[44px]">
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, rotuloABB: true }))}
                    className={`rounded-xl font-bold text-xs border touch-active ${
                      form.rotuloABB
                        ? 'bg-sky-700 text-white border-sky-700'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    SÍ
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, rotuloABB: false }))}
                    className={`rounded-xl font-bold text-xs border touch-active ${
                      !form.rotuloABB
                        ? 'bg-slate-700 text-white border-slate-700'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    NO
                  </button>
                </div>
              </div>
            </div>

            {/* Turno en que se colocó */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1.5">Turno de Colocación</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Mañana', 'Tarde', 'Noche'] as const).map((t) => (
                  <TouchChip
                    key={t}
                    label={t}
                    selected={form.rotuloTurno === t}
                    onClick={() => setForm((p) => ({ ...p, rotuloTurno: t }))}
                  />
                ))}
              </div>
            </div>

            {/* Nombre y Legajo Enfermero que colocó */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                  Enfermero/a (Colocador/a)
                </label>
                <input
                  type="text"
                  value={form.rotuloNombre}
                  onChange={(e) => setForm((p) => ({ ...p, rotuloNombre: e.target.value }))}
                  placeholder="Nombre según rótulo"
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white"
                />

                {/* Chips de sugerencias de nombres recientes */}
                {recentColocadores.length > 0 && (
                  <div className="flex items-center gap-1 mt-1.5 overflow-x-auto pb-0.5">
                    <UserCheck className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="text-[10px] text-slate-500 shrink-0">Recientes:</span>
                    {recentColocadores.slice(0, 3).map((nom) => (
                      <button
                        key={nom}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, rotuloNombre: nom }))}
                        className="text-[10px] bg-sky-50 text-sky-800 border border-sky-200 px-1.5 py-0.5 rounded-md hover:bg-sky-100 shrink-0 touch-active cursor-pointer"
                      >
                        {nom}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                  N° Legajo (Colocador/a)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.rotuloLegajo}
                  onChange={(e) => setForm((p) => ({ ...p, rotuloLegajo: e.target.value }))}
                  placeholder="N° Legajo numérico"
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* 3. Visibilidad */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <ToggleYesNo
              label="Visibilidad del Sitio de Punción"
              description="¿El punto de punción es visible e inspeccionable?"
              value={form.visibilidad}
              onChange={(val) => setForm((p) => ({ ...p, visibilidad: val }))}
            />
          </div>

          {/* 4. Fijación y Adherencia */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div>
              <span className="block font-bold text-slate-800 text-sm mb-1.5">Material de Fijación</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'fijacionTegaderm' as const, label: 'Tegaderm' },
                  { key: 'fijacionCinta' as const, label: 'Cinta' },
                  { key: 'fijacionHipafix' as const, label: 'Hipafix' },
                  { key: 'fijacionVenda' as const, label: 'Venda' },
                  { key: 'fijacionContencionMecanica' as const, label: 'Contención Mecánica' },
                ].map((item) => (
                  <TouchChip
                    key={item.key}
                    label={item.label}
                    selected={Boolean(form[item.key as FijacionKey])}
                    onClick={() =>
                      setForm((p) => ({ ...p, [item.key]: !p[item.key as FijacionKey] }))
                    }
                  />
                ))}
              </div>
            </div>

            <div>
              <span className="block font-bold text-slate-800 text-sm mb-1.5">Adherencia de Fijación</span>
              <div className="grid grid-cols-3 gap-2">
                {(['total', 'parcial', 'nula'] as const).map((adh) => (
                  <TouchChip
                    key={adh}
                    label={adh.toUpperCase()}
                    selected={form.fijacionAdherencia === adh}
                    color={adh === 'total' ? 'success' : adh === 'parcial' ? 'warning' : 'danger'}
                    onClick={() => setForm((p) => ({ ...p, fijacionAdherencia: adh }))}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 5. Lúmenes y Características Clínicas */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div>
              <span className="block font-bold text-slate-800 text-sm mb-1.5">Lúmenes / Conectores</span>
              <div className="grid grid-cols-2 gap-2">
                <TouchChip
                  label="Llave de 3 vías"
                  selected={form.lumenesLlave3Vias}
                  onClick={() => setForm((p) => ({ ...p, lumenesLlave3Vias: !p.lumenesLlave3Vias }))}
                />
                <TouchChip
                  label="Tapón multifunción"
                  selected={form.lumenesTaponMultifuncion}
                  onClick={() =>
                    setForm((p) => ({ ...p, lumenesTaponMultifuncion: !p.lumenesTaponMultifuncion }))
                  }
                />
              </div>
            </div>

            <div>
              <span className="block font-bold text-slate-800 text-sm mb-1.5 flex items-center gap-1">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                Características del Acceso
              </span>
              <div className="grid grid-cols-3 gap-2">
                <TouchChip
                  label="Infiltración"
                  color="danger"
                  selected={form.caracteristicasInfiltracion}
                  onClick={() =>
                    setForm((p) => ({ ...p, caracteristicasInfiltracion: !p.caracteristicasInfiltracion }))
                  }
                />
                <TouchChip
                  label="Eritematoso"
                  color="danger"
                  selected={form.caracteristicasEritematoso}
                  onClick={() =>
                    setForm((p) => ({ ...p, caracteristicasEritematoso: !p.caracteristicasEritematoso }))
                  }
                />
                <TouchChip
                  label="Retorno Venoso"
                  color="success"
                  selected={form.caracteristicasRetorno}
                  onClick={() =>
                    setForm((p) => ({ ...p, caracteristicasRetorno: !p.caracteristicasRetorno }))
                  }
                />
              </div>
            </div>
          </div>

          {/* 6. Tipo de Infusión */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <span className="block font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-sky-700" />
              Tipo de Infusión
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(['continua', 'intermitente', 'ninguna'] as const).map((inf) => (
                <TouchChip
                  key={inf}
                  label={inf.charAt(0).toUpperCase() + inf.slice(1)}
                  selected={form.infusionType === inf}
                  onClick={() => setForm((p) => ({ ...p, infusionType: inf }))}
                />
              ))}
            </div>
          </div>

          {/* Botón Principal de Guardar */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[56px] rounded-2xl bg-sky-700 hover:bg-sky-800 text-white font-extrabold text-base md:text-lg flex items-center justify-center gap-2 shadow-lg shadow-sky-200 touch-active cursor-pointer transition-all"
            >
              <Save className="w-5 h-5" />
              <span>{isSubmitting ? 'Guardando...' : 'Guardar Registro de Vía'}</span>
              <span className="text-xs bg-sky-800/60 px-2 py-0.5 rounded font-mono hidden sm:inline">[Enter]</span>
            </button>
          </div>
        </div>
      )}
    </form>
  );
};
