import React, { useState, useEffect } from 'react';
import {
  Save,
  Plus,
  Minus,
  CheckCircle,
  ShieldAlert,
  Activity,
  ArrowRight,
  CheckCheck,
  Tag,
  Split,
} from 'lucide-react';
import type { BasePatientData, AccesoPerifericoForm as AccesoFormType } from '../../types/form';
import { ToggleYesNo } from '../common/ToggleYesNo';
import { TouchChip } from '../common/TouchChip';
import { StickyBottomBar } from '../common/StickyBottomBar';

interface AccesoPerifericoFormProps {
  patient: BasePatientData;
  onSubmit: (formData: AccesoFormType) => Promise<void>;
  onSwitchToUpp?: () => void;
}

type FijacionKey =
  | 'fijacionTegaderm'
  | 'fijacionCinta'
  | 'fijacionHipafix'
  | 'fijacionVenda'
  | 'fijacionContencionMecanica';

type CintaTipo = 'hipoalergénica' | 'tela' | 'seda' | 'coban' | 'papel' | '';

const INITIAL_ACCESO_STATE = {
  tieneAcceso: false,
  tipoAccesoAlternativo: '' as 'acceso_central' | 'percutaneo' | 'nada' | '',
  accesoCentralUbicacion: '' as 'Y/I' | 'Y/D' | 'S/I' | 'S/D' | '',
  cuantas: 1,
  ubicacionMSD: false,
  ubicacionMSI: false,
  ubicacionMII: false,
  ubicacionMID: false,
  tieneRotulo: true,
  rotuloTieneFecha: true,
  rotuloTieneNombre: true,
  rotuloTieneLegajo: true,
  rotuloTieneEnfermero: true,
  rotuloTieneTurno: true,
  rotuloTieneABB: true,
  visibilidad: true,
  fijacionTegaderm: true,
  fijacionCinta: false,
  fijacionCintaTipo: '' as CintaTipo,
  fijacionHipafix: false,
  fijacionVenda: false,
  fijacionContencionMecanica: false,
  fijacionAdherencia: 'total' as 'total' | 'parcial' | 'nula' | '',
  lumenesLlave3Vias: false,
  lumenesTaponMultifuncion: false,
  caracteristicasInfiltracion: false,
  caracteristicasEritematoso: false,
  caracteristicasRetorno: true,
  infusionType: 'continua' as 'continua' | 'intermitente' | '',
};

export const AccesoPerifericoForm: React.FC<AccesoPerifericoFormProps> = ({
  patient,
  onSubmit,
  onSwitchToUpp,
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

  const handleAllRotuloYes = () => {
    setForm((prev) => ({
      ...prev,
      tieneRotulo: true,
      rotuloTieneFecha: true,
      rotuloTieneNombre: true,
      rotuloTieneLegajo: true,
      rotuloTieneEnfermero: true,
      rotuloTieneTurno: true,
      rotuloTieneABB: true,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const fullData: AccesoFormType = {
        ...patient,
        ...form,
      };
      await onSubmit(fullData);
      setForm(INITIAL_ACCESO_STATE);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render del componente del Rótulo (reutilizado para Acceso Periférico y Percutáneo)
  const renderRotuloSection = (titulo = 'Rótulo de Colocación') => (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-1.5">
          <Tag className="w-4 h-4 text-sky-700" />
          <span className="font-bold text-slate-900 text-sm">{titulo}</span>
        </div>

        {form.tieneRotulo && (
          <button
            type="button"
            onClick={handleAllRotuloYes}
            className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg touch-active cursor-pointer transition-all"
            title="Marcar todos los ítems del rótulo en SÍ"
          >
            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Todo SÍ</span>
          </button>
        )}
      </div>

      {/* Condicional Principal SI / NO */}
      <ToggleYesNo
        label="¿Tiene Rótulo?"
        description="Indica si el acceso cuenta con el rótulo de identificación colocado"
        value={Boolean(form.tieneRotulo)}
        onChange={(val) => setForm((p) => ({ ...p, tieneRotulo: val }))}
      />

      {/* Si tiene rótulo -> Mostrar opciones SI/NO */}
      {form.tieneRotulo && (
        <div className="pt-2 border-t border-slate-100 space-y-2.5 animate-fade-in">
          <span className="text-[11px] font-bold text-slate-600 uppercase block">
            Datos identificados en el rótulo (SI/NO):
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { key: 'rotuloTieneFecha' as const, label: 'Fecha' },
              { key: 'rotuloTieneNombre' as const, label: 'Nombre' },
              { key: 'rotuloTieneLegajo' as const, label: 'Legajo' },
              { key: 'rotuloTieneEnfermero' as const, label: 'Enfermero' },
              { key: 'rotuloTieneTurno' as const, label: 'Turno' },
              { key: 'rotuloTieneABB' as const, label: 'ABB' },
            ].map((item) => {
              const val = Boolean(form[item.key]);
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200"
                >
                  <span className="text-xs font-bold text-slate-700">{item.label}</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, [item.key]: true }))}
                      className={`px-2 py-0.5 text-xs font-bold rounded-md border touch-active cursor-pointer ${
                        val
                          ? 'bg-sky-700 text-white border-sky-700'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      SÍ
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, [item.key]: false }))}
                      className={`px-2 py-0.5 text-xs font-bold rounded-md border touch-active cursor-pointer ${
                        !val
                          ? 'bg-slate-700 text-white border-slate-700'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      NO
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <form
      id="acceso-periferico-form"
      onSubmit={handleSubmit}
      className="px-3 pb-32 md:px-4 space-y-3.5 max-w-2xl mx-auto"
    >
      {/* Pregunta Clave de Mínimos Clicks */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
            Cama {patient.cama} · Habitación {patient.habitacion}
            {patient.historiaClinica && ` · HC: ${patient.historiaClinica}`}
          </span>
          <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
            Atajos: [N] No · [S] Sí
          </span>
        </div>

        <ToggleYesNo
          label="¿El paciente tiene Acceso Periférico?"
          description="Selecciona NO si no presenta vías periféricas activas"
          value={form.tieneAcceso}
          onChange={(val) =>
            setForm((prev) => ({
              ...prev,
              tieneAcceso: val,
              tipoAccesoAlternativo: !val ? 'nada' : '',
            }))
          }
        />
      </div>

      {/* CASO 1: NO TIENE ACCESO PERIFÉRICO -> Opciones: Acceso Central, Percutáneo, Nada */}
      {!form.tieneAcceso && (
        <div className="space-y-3.5 animate-fade-in">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <span className="block font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Split className="w-4 h-4 text-sky-700" />
              Selecciona situación o acceso alternativo:
            </span>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'acceso_central' as const, label: 'Acceso Central' },
                { id: 'percutaneo' as const, label: 'Percutáneo' },
                { id: 'nada' as const, label: 'Nada' },
              ].map((opt) => (
                <TouchChip
                  key={opt.id}
                  label={opt.label}
                  selected={form.tipoAccesoAlternativo === opt.id}
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      tipoAccesoAlternativo: opt.id,
                    }))
                  }
                />
              ))}
            </div>

            {/* Sub-opciones Acceso Central: Y/I, Y/D, S/I, S/D */}
            {form.tipoAccesoAlternativo === 'acceso_central' && (
              <div className="pt-3 border-t border-slate-100 space-y-2 animate-fade-in">
                <span className="block text-xs font-bold text-slate-700">
                  Ubicación del Acceso Central:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'Y/I' as const, label: 'Y/I', sub: 'Yugular Izq.' },
                    { id: 'Y/D' as const, label: 'Y/D', sub: 'Yugular Der.' },
                    { id: 'S/I' as const, label: 'S/I', sub: 'Subclavia Izq.' },
                    { id: 'S/D' as const, label: 'S/D', sub: 'Subclavia Der.' },
                  ].map((sub) => (
                    <TouchChip
                      key={sub.id}
                      label={sub.label}
                      subtitle={sub.sub}
                      selected={form.accesoCentralUbicacion === sub.id}
                      onClick={() => setForm((p) => ({ ...p, accesoCentralUbicacion: sub.id }))}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sub-opciones Percutáneo: Mostrar el módulo de Rótulo completo con SI/NO */}
          {form.tipoAccesoAlternativo === 'percutaneo' &&
            renderRotuloSection('Rótulo de Percutáneo')}

          {/* Botón de Guardar en caso de NO tener acceso periférico */}
          <div className="pt-1 hidden md:block">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[56px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base md:text-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 touch-active cursor-pointer transition-all"
            >
              <CheckCircle className="w-5 h-5" />
              <span>
                {isSubmitting
                  ? 'Guardando...'
                  : form.tipoAccesoAlternativo === 'acceso_central'
                  ? 'Guardar Paciente (Con Acceso Central)'
                  : form.tipoAccesoAlternativo === 'percutaneo'
                  ? 'Guardar Paciente (Con Percutáneo)'
                  : 'Guardar Paciente (Sin Acceso)'}
              </span>
              <span className="text-xs bg-emerald-700/60 px-2 py-0.5 rounded font-mono hidden sm:inline">
                [Enter]
              </span>
            </button>
          </div>

          {/* Transición a Ronda 2 si ya terminó */}
          {onSwitchToUpp && (
            <div className="pt-3 border-t border-slate-200 text-center">
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

      {/* CASO 2: SÍ TIENE ACCESO PERIFÉRICO */}
      {form.tieneAcceso && (
        <div className="space-y-3.5 animate-fade-in">
          {/* 1. Cantidad y Ubicación (Multi-selección) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-sm">Cantidad de Vías</span>
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
                <span className="font-bold text-base w-6 text-center text-sky-900">
                  {form.cuantas}
                </span>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, cuantas: (p.cuantas || 1) + 1 }))}
                  className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center touch-active"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Ubicación Anatómica (Multi-selección) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-slate-800 text-sm">Ubicación Anatómica</span>
                <span className="text-[11px] text-sky-700 font-semibold">
                  (Selección múltiple permitida)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'ubicacionMSD' as const, label: 'MSD', sub: 'Brazo Derecho' },
                  { key: 'ubicacionMSI' as const, label: 'MSI', sub: 'Brazo Izquierdo' },
                  { key: 'ubicacionMID' as const, label: 'MID', sub: 'Pierna Derecha' },
                  { key: 'ubicacionMII' as const, label: 'MII', sub: 'Pierna Izquierda' },
                ].map((item) => (
                  <TouchChip
                    key={item.key}
                    label={item.label}
                    subtitle={item.sub}
                    selected={Boolean(form[item.key])}
                    onClick={() => setForm((p) => ({ ...p, [item.key]: !p[item.key] }))}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 2. Rótulo de Colocación (SI/NO condicional) */}
          {renderRotuloSection('Rótulo de Colocación')}

          {/* 3. Visibilidad */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <ToggleYesNo
              label="Visibilidad del Sitio de Punción"
              description="¿El punto de punción es visible e inspeccionable?"
              value={form.visibilidad}
              onChange={(val) => setForm((p) => ({ ...p, visibilidad: val }))}
            />
          </div>

          {/* 4. Fijación, Sub-tipos de Cinta y Adherencia */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div>
              <span className="block font-bold text-slate-800 text-sm mb-1.5">
                Material de Fijación
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                      setForm((p) => ({
                        ...p,
                        [item.key]: !p[item.key as FijacionKey],
                        // Si desmarca cinta, limpiar subtipo
                        ...(item.key === 'fijacionCinta' && p.fijacionCinta
                          ? { fijacionCintaTipo: '' }
                          : {}),
                      }))
                    }
                  />
                ))}
              </div>
            </div>

            {/* Sub-tipos de Cinta (Aparecen si Cinta está seleccionada) */}
            {form.fijacionCinta && (
              <div className="p-3 bg-sky-50/60 border border-sky-100 rounded-xl space-y-1.5 animate-fade-in">
                <span className="block text-xs font-bold text-sky-900">
                  Tipo de Cinta seleccionada:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      'hipoalergénica',
                      'tela',
                      'seda',
                      'coban',
                      'papel',
                    ] as const
                  ).map((cTipo) => (
                    <button
                      key={cTipo}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, fijacionCintaTipo: cTipo }))}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all touch-active cursor-pointer ${
                        form.fijacionCintaTipo === cTipo
                          ? 'bg-sky-700 text-white border-sky-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cTipo.charAt(0).toUpperCase() + cTipo.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <span className="block font-bold text-slate-800 text-sm mb-1.5">
                Adherencia de Fijación
              </span>
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
              <span className="block font-bold text-slate-800 text-sm mb-1.5">
                Lúmenes / Conectores
              </span>
              <div className="grid grid-cols-2 gap-2">
                <TouchChip
                  label="Llave de 3 vías"
                  selected={form.lumenesLlave3Vias}
                  onClick={() =>
                    setForm((p) => ({ ...p, lumenesLlave3Vias: !p.lumenesLlave3Vias }))
                  }
                />
                <TouchChip
                  label="Tapón multifunción"
                  selected={form.lumenesTaponMultifuncion}
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      lumenesTaponMultifuncion: !p.lumenesTaponMultifuncion,
                    }))
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
                    setForm((p) => ({
                      ...p,
                      caracteristicasInfiltracion: !p.caracteristicasInfiltracion,
                    }))
                  }
                />
                <TouchChip
                  label="Eritematoso"
                  color="danger"
                  selected={form.caracteristicasEritematoso}
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      caracteristicasEritematoso: !p.caracteristicasEritematoso,
                    }))
                  }
                />
                <TouchChip
                  label="Retorno Venoso"
                  color="success"
                  selected={form.caracteristicasRetorno}
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      caracteristicasRetorno: !p.caracteristicasRetorno,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {/* 6. Tipo de Infusión (Solo continua o intermitente) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <span className="block font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-sky-700" />
              Tipo de Infusión
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(['continua', 'intermitente'] as const).map((inf) => (
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
          <div className="pt-2 hidden md:block">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[56px] rounded-2xl bg-sky-700 hover:bg-sky-800 text-white font-extrabold text-base md:text-lg flex items-center justify-center gap-2 shadow-lg shadow-sky-200 touch-active cursor-pointer transition-all"
            >
              <Save className="w-5 h-5" />
              <span>{isSubmitting ? 'Guardando...' : 'Guardar Registro de Vía'}</span>
              <span className="text-xs bg-sky-800/60 px-2 py-0.5 rounded font-mono hidden sm:inline">
                [Enter]
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Barra de Guardado Flotante en la Zona del Pulgar */}
      <StickyBottomBar
        formId="acceso-periferico-form"
        isSubmitting={isSubmitting}
        cama={patient.cama}
        habitacion={patient.habitacion}
        sector={patient.sector}
        hasCondition={form.tieneAcceso}
        roundType="ACCESO_PERIFERICO"
        altType={form.tipoAccesoAlternativo}
      />
    </form>
  );
};
