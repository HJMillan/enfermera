import React from 'react';
import { Bed, DoorOpen, Building2, Plus, Minus, Clock, Keyboard } from 'lucide-react';
import type { BasePatientData, SectorType, FormType } from '../../types/form';

interface PatientHeaderProps {
  patient: BasePatientData;
  onChange: (updated: Partial<BasePatientData>) => void;
  onNextBed: () => void;
  activeRound?: FormType | 'HISTORY';
  totalCensadasHoy?: number;
}

const SECTORS: SectorType[] = ['A', 'B', 'C', 'D', 'E'];
const COMMON_BEDS = ['1', '2', '3', '4'];

export const PatientHeader: React.FC<PatientHeaderProps> = ({
  patient,
  onChange,
  onNextBed,
  activeRound,
  totalCensadasHoy = 0,
}) => {
  const handleBedStep = (delta: number) => {
    const current = parseInt(patient.cama, 10);
    if (!isNaN(current)) {
      const next = Math.max(1, current + delta);
      onChange({ cama: String(next) });
    }
  };

  const handleRoomStep = (delta: number) => {
    const current = parseInt(patient.habitacion, 10);
    if (!isNaN(current)) {
      const next = Math.max(1, current + delta);
      onChange({ habitacion: String(next), cama: '1' });
    }
  };

  const isVias = activeRound === 'ACCESO_PERIFERICO';

  return (
    <div className="bg-white border-b border-slate-200 shadow-xs sticky top-0 z-20 px-3 py-2.5 md:px-4 md:py-3 transition-all">
      {/* Barra superior: Ronda activa, reloj y avance */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <div
            className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg border shrink-0 ${
              isVias
                ? 'bg-sky-50 text-sky-800 border-sky-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <span>{isVias ? '💉' : '🩹'}</span>
            <span className="hidden xs:inline">{isVias ? 'Ronda 1: ' : 'Ronda 2: '}</span>
            <span>{isVias ? 'Vías' : 'UPP'}</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg shrink-0">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>{patient.fechaHora}</span>
          </div>

          {totalCensadasHoy > 0 && (
            <span className="text-[11px] font-bold text-slate-600 hidden sm:inline shrink-0">
              · {totalCensadasHoy} camas hoy
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Hint de atajos en Chromebook / PC */}
          <div className="hidden lg:flex items-center gap-1 text-[11px] text-slate-600 font-mono bg-slate-50 px-2 py-1 rounded-md border border-slate-200" title="Atajos de teclado activos en Chromebook">
            <Keyboard className="w-3.5 h-3.5 text-slate-600" />
            <span>[N] No · [S] Sí · [Enter] Guardar</span>
          </div>

          {/* Botón Siguiente Cama */}
          <button
            type="button"
            onClick={onNextBed}
            className="flex items-center gap-1.5 bg-gradient-to-r from-sky-600 to-cyan-600 text-white text-xs md:text-sm font-bold px-2.5 py-1.5 rounded-lg shadow-xs hover:from-sky-700 hover:to-cyan-700 touch-active cursor-pointer shrink-0"
            title="Mantener sector y habitación, e incrementar la cama"
          >
            <Bed className="w-3.5 h-3.5" />
            <span>+1 Cama</span>
          </button>
        </div>
      </div>

      {/* Selector de Sector en Chips Rápidos */}
      <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-0.5 scrollbar-none">
        <span className="text-xs font-bold text-slate-600 flex items-center gap-1 mr-1">
          <Building2 className="w-3.5 h-3.5 text-slate-600" />
          Sector:
        </span>
        {SECTORS.map((sec) => (
          <button
            key={sec}
            type="button"
            onClick={() => onChange({ sector: sec })}
            className={`min-w-[40px] h-9 px-2.5 rounded-lg font-bold text-xs md:text-sm border transition-all touch-active cursor-pointer ${
              patient.sector === sec
                ? 'bg-sky-700 text-white border-sky-700 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {sec}
          </button>
        ))}
      </div>

      {/* Habitación y Selector Directo de Camas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Habitación con incremento */}
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 focus-within:border-sky-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-100">
          <div className="flex items-center flex-1 min-w-0">
            <DoorOpen className="w-4 h-4 text-slate-600 mr-2 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-600 leading-tight">Habitación</span>
              <input
                type="text"
                inputMode="numeric"
                value={patient.habitacion}
                onChange={(e) => onChange({ habitacion: e.target.value })}
                placeholder="101"
                className="w-16 bg-transparent font-bold text-base text-slate-800 outline-none p-0"
              />
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleRoomStep(-1)}
              className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs hover:bg-slate-100 touch-active cursor-pointer"
              title="Habitación anterior"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => handleRoomStep(1)}
              className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs hover:bg-slate-300 touch-active cursor-pointer"
              title="Siguiente habitación"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Camas: Selector de 1 toque (Chips 1, 2, 3, 4) + custom stepper */}
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
          <div className="flex items-center gap-1.5 flex-1 overflow-x-auto">
            <Bed className="w-4 h-4 text-slate-600 shrink-0" />
            <span className="text-[10px] uppercase font-bold text-slate-600 mr-1 shrink-0">Cama:</span>
            {COMMON_BEDS.map((bedNum) => (
              <button
                key={bedNum}
                type="button"
                onClick={() => onChange({ cama: bedNum })}
                className={`w-8 h-8 rounded-lg font-bold text-xs md:text-sm border transition-all touch-active cursor-pointer ${
                  patient.cama === bedNum
                    ? 'bg-sky-700 text-white border-sky-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {bedNum}
              </button>
            ))}
          </div>

          {/* Stepper fino si la cama es 5 o superior */}
          <div className="flex items-center gap-1 pl-1.5 border-l border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => handleBedStep(-1)}
              className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs hover:bg-slate-100 touch-active cursor-pointer"
              title="Restar cama"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="font-bold text-sm text-slate-800 w-5 text-center">{patient.cama}</span>
            <button
              type="button"
              onClick={() => handleBedStep(1)}
              className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center font-bold text-xs hover:bg-sky-100 touch-active cursor-pointer"
              title="Sumar cama"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
