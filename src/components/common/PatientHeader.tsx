import React, { useEffect, useState, useMemo } from 'react';
import {
  Bed,
  DoorOpen,
  Building2,
  Plus,
  Minus,
  Clock,
  Keyboard,
  Users,
  FileText,
  Sun,
  MapPin,
  CalendarDays,
  UserRound,
} from 'lucide-react';
import type { BasePatientData, SectorType, FormType, StoredRecord } from '../../types/form';
import { composeFechaHora, parseFechaHora } from '../../utils/dateUtils';
import {
  SECTORS,
  COMMON_BEDS,
  isValidRoom,
  getDefaultRoom,
  getNextValidRoom,
  getValidRooms,
  SECTOR_CONFIG,
} from '../../config/sectorConfig';
import { getStaffBySector, saveStaffBySector } from '../../services/storageService';
import { useWakeLock } from '../../hooks/useWakeLock';
import { SectorBedMatrixModal } from './SectorBedMatrixModal';

interface PatientHeaderProps {
  patient: BasePatientData;
  onChange: (updated: Partial<BasePatientData>) => void;
  onNextBed: () => void;
  activeRound?: FormType | 'HISTORY';
  totalCensadasHoy?: number;
  records?: StoredRecord[];
}

export const PatientHeader: React.FC<PatientHeaderProps> = ({
  patient,
  onChange,
  onNextBed,
  activeRound,
  totalCensadasHoy = 0,
  records = [],
}) => {
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);
  const wakeLock = useWakeLock(true);

  // Inicializar staff del sector si aún no está presente en el paciente
  useEffect(() => {
    const staff = getStaffBySector(patient.sector);
    if (
      patient.cantidadEnfermeras === undefined ||
      patient.cantidadAuxiliares === undefined
    ) {
      onChange({
        cantidadEnfermeras: staff.enfermeras,
        cantidadAuxiliares: staff.auxiliares,
      });
    }
  }, [patient.sector, patient.cantidadEnfermeras, patient.cantidadAuxiliares, onChange]);

  const handleSectorChange = (sec: SectorType) => {
    const staff = getStaffBySector(sec);
    const roomValid = isValidRoom(sec, patient.habitacion);
    const nextRoom = roomValid ? patient.habitacion : getDefaultRoom(sec);

    onChange({
      sector: sec,
      habitacion: nextRoom,
      cama: roomValid ? patient.cama : '1',
      cantidadEnfermeras: staff.enfermeras,
      cantidadAuxiliares: staff.auxiliares,
    });
  };


  const handleRoomStep = (delta: number) => {
    const nextRoom = getNextValidRoom(patient.sector, patient.habitacion, delta);
    onChange({ habitacion: nextRoom, cama: '1' });
  };

  const handleStaffChange = (type: 'enfermeras' | 'auxiliares', delta: number) => {
    const currentStaff = getStaffBySector(patient.sector);
    const updatedValue = Math.max(0, (currentStaff[type] || 0) + delta);
    const newStaff = {
      ...currentStaff,
      [type]: updatedValue,
    };
    saveStaffBySector(patient.sector, newStaff);
    onChange({
      [type === 'enfermeras' ? 'cantidadEnfermeras' : 'cantidadAuxiliares']: updatedValue,
    });
  };

  const isVias = activeRound === 'ACCESO_PERIFERICO';
  const isLpp = activeRound === 'UPP';
  const isSondas = activeRound === 'SONDA_VESICAL';
  const fechaParts = parseFechaHora(patient.fechaHora);
  const sectorConfig = SECTOR_CONFIG[patient.sector];
  const isRoomValid = isValidRoom(patient.sector, patient.habitacion);

  const cantEnfermeras = patient.cantidadEnfermeras ?? getStaffBySector(patient.sector).enfermeras;
  const cantAuxiliares = patient.cantidadAuxiliares ?? getStaffBySector(patient.sector).auxiliares;

  // Camas censadas en este sector en el turno de hoy
  const validRoomsSector = useMemo(() => getValidRooms(patient.sector), [patient.sector]);
  const totalBedsSector = validRoomsSector.length * 4;

  const censadasSector = useMemo(() => {
    const set = new Set<string>();
    records
      .filter((r) => r.formType === activeRound && r.data.sector === patient.sector)
      .forEach((r) => {
        set.add(`${r.data.habitacion}-${r.data.cama}`);
      });
    return set.size;
  }, [records, activeRound, patient.sector]);

  return (
    <div className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-[var(--shadow-rest)] sticky z-20 px-2.5 py-2 md:px-4 md:py-3 transition-[box-shadow,border-color] duration-[var(--duration-base)] ease-[var(--ease-standard)]" style={{ top: 'var(--header-height)' }}>
      {/* Barra superior: Ronda activa, reloj, Wake Lock y avance */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <div
            className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 md:py-1 rounded-[var(--radius-sm)] border shrink-0 ${
              isVias
                ? 'bg-sky-50 text-sky-800 border-sky-200'
                : isSondas
                ? 'bg-teal-50 text-teal-800 border-teal-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <span>{isVias ? '💉' : isSondas ? '🩺' : '🩹'}</span>
            <span className="hidden xs:inline">
              {isVias ? 'Ronda 1: ' : isLpp ? 'Ronda 2: ' : 'Ronda 3: '}
            </span>
            <span>{isVias ? 'Vías' : isSondas ? 'Sondas' : 'LPP'}</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 md:py-1 rounded-[var(--radius-sm)] shrink-0">
            <Clock className="w-3 h-3 text-slate-500" />
            <input
              type="date"
              aria-label="Fecha del registro"
              value={fechaParts.date}
              onChange={(e) =>
                onChange({ fechaHora: composeFechaHora(e.target.value, fechaParts.time) })
              }
              className="bg-transparent font-semibold text-[11px] text-slate-700 outline-none w-[7.4rem]"
            />
            <input
              type="time"
              aria-label="Hora del registro"
              value={fechaParts.time}
              onChange={(e) =>
                onChange({ fechaHora: composeFechaHora(fechaParts.date, e.target.value) })
              }
              className="bg-transparent font-semibold text-[11px] text-slate-700 outline-none w-[4.2rem]"
            />
          </div>

          {/* Wake Lock Screen Indicator */}
          {wakeLock.isSupported && (
            <button
              type="button"
              onClick={wakeLock.toggleWakeLock}
              className={`flex items-center gap-1 text-[10px] md:text-[11px] font-bold px-2 py-0.5 md:py-1 rounded-[var(--radius-sm)] border transition-[transform,background-color,border-color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] cursor-pointer shrink-0 ${
                wakeLock.isActive
                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                  : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
              }`}
              title={
                wakeLock.isActive
                  ? 'Pantalla activa (no se apaga sola mientras esté abierta)'
                  : 'Pantalla con suspensión estándar (haga clic para mantener encendida)'
              }
            >
              <Sun
                className={`w-3 h-3 ${
                  wakeLock.isActive ? 'text-amber-500 fill-amber-500 animate-pulse' : 'text-slate-400'
                }`}
              />
              <span className="hidden xs:inline">
                {wakeLock.isActive ? 'Pantalla Activa' : 'Normal'}
              </span>
            </button>
          )}

          {totalCensadasHoy > 0 && (
            <span className="text-[11px] font-bold text-slate-600 hidden sm:inline shrink-0">
              · {totalCensadasHoy} camas hoy
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Hint de atajos en Chromebook / PC */}
          <div
            className="hidden lg:flex items-center gap-1 text-[11px] text-slate-600 font-mono bg-slate-50 px-2 py-1 rounded-[var(--radius-sm)] border border-slate-200"
            title="Atajos de teclado activos en Chromebook"
          >
            <Keyboard className="w-3.5 h-3.5 text-slate-600" />
            <span>[N] No · [S] Sí · [Enter] Guardar</span>
          </div>

          {/* Botón Siguiente Cama */}
          <button
            type="button"
            onClick={onNextBed}
            className="flex items-center gap-1 bg-linear-to-r from-sky-600 to-cyan-600 text-white text-xs md:text-sm font-bold px-2.5 py-1 md:py-1.5 rounded-[var(--radius-sm)] shadow-[var(--shadow-rest)] hover:shadow-[var(--shadow-hover)] hover:-translate-y-0.5 active:scale-[0.98] transition-[transform,box-shadow,filter] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] cursor-pointer shrink-0"
            title="Mantener sector y habitación, e incrementar la cama"
          >
            <Bed className="w-3.5 h-3.5" />
            <span>+1 Cama</span>
          </button>
        </div>
      </div>

      {/* Selector de Sector en Chips Rápidos y Botón de Mapa de Camas */}
      <div className="flex items-center justify-between gap-1 mb-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs font-bold text-slate-600 flex items-center gap-0.5 mr-0.5 shrink-0">
            <Building2 className="w-3.5 h-3.5 text-slate-600" />
            Sector:
          </span>
          {SECTORS.map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => handleSectorChange(sec)}
              className={`min-w-9 md:min-w-10 h-8 md:h-9 px-2 md:px-2.5 rounded-[var(--radius-sm)] font-bold text-xs md:text-sm border transition-[transform,box-shadow,background-color,border-color,color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] cursor-pointer shrink-0 ${
                patient.sector === sec
                  ? 'bg-sky-700 text-white border-sky-700 shadow-[var(--shadow-rest)] ring-2 ring-sky-200 hover:scale-[1.015]'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
              }`}
            >
              {sec}
            </button>
          ))}
        </div>

        {/* Botón Mapa de Camas del Sector */}
        <button
          type="button"
          onClick={() => setIsMatrixOpen(true)}
          className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-[var(--radius-sm)] bg-sky-50 text-sky-900 border border-sky-200 hover:bg-sky-100 shadow-[var(--shadow-rest)] hover:shadow-[var(--shadow-hover)] hover:-translate-y-0.5 active:scale-[0.98] transition-[transform,box-shadow,background-color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] cursor-pointer shrink-0"
          title="Ver mapa de camas del sector (cuáles faltan censar)"
        >
          <MapPin className="w-3.5 h-3.5 text-sky-700" />
          <span>{censadasSector}/{totalBedsSector} camas</span>
        </button>
      </div>

      {/* Barra de Personal por Servicio (Enfermeras y Auxiliares por Sector) */}
      <div className="flex items-center justify-between bg-slate-50/90 border border-slate-200 rounded-xl px-2 py-1 mb-1.5 flex-wrap gap-1.5">
        <div className="flex items-center gap-1 text-[11px] md:text-xs font-bold text-slate-700">
          <Users className="w-3.5 h-3.5 text-sky-700 shrink-0" />
          <span>Personal {patient.sector}:</span>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {/* Stepper Enfermeras */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-1.5 py-0.5 shadow-2xs">
            <span className="text-[11px] md:text-xs font-bold text-slate-600">Enf:</span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => handleStaffChange('enfermeras', -1)}
                className="w-8 h-8 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer touch-active relative before:absolute before:-inset-2 before:content-['']"
                title="Restar enfermera"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="font-extrabold text-xs text-sky-900 w-4 text-center">
                {cantEnfermeras}
              </span>
              <button
                type="button"
                onClick={() => handleStaffChange('enfermeras', 1)}
                className="w-8 h-8 rounded-md bg-sky-600 hover:bg-sky-700 text-white flex items-center justify-center font-bold text-xs cursor-pointer touch-active relative before:absolute before:-inset-2 before:content-['']"
                title="Sumar enfermera"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Stepper Auxiliares */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-1.5 py-0.5 shadow-2xs">
            <span className="text-[11px] md:text-xs font-bold text-slate-600">Aux:</span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => handleStaffChange('auxiliares', -1)}
                className="w-8 h-8 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer touch-active relative before:absolute before:-inset-2 before:content-['']"
                title="Restar auxiliar"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="font-extrabold text-xs text-sky-900 w-4 text-center">
                {cantAuxiliares}
              </span>
              <button
                type="button"
                onClick={() => handleStaffChange('auxiliares', 1)}
                className="w-8 h-8 rounded-md bg-sky-600 hover:bg-sky-700 text-white flex items-center justify-center font-bold text-xs cursor-pointer touch-active relative before:absolute before:-inset-2 before:content-['']"
                title="Sumar auxiliar"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Habitación, Cama e Historia Clínica (HC) - Grid Adaptativo Inteligente */}
      <div className="grid grid-cols-12 gap-1.5 md:gap-2">
        {/* Habitación con incremento y rango de sector */}
        <div
          className={`col-span-6 sm:col-span-4 flex items-center justify-between bg-slate-50 border rounded-xl px-2 py-1 focus-within:border-sky-500 focus-within:bg-white focus-within:ring-1 focus-within:ring-sky-100 ${
            isRoomValid ? 'border-slate-200' : 'border-rose-300 bg-rose-50/50'
          }`}
        >
          <div className="flex items-center flex-1 min-w-0">
            <DoorOpen
              className={`w-3.5 h-3.5 mr-1.5 shrink-0 ${isRoomValid ? 'text-slate-600' : 'text-rose-500'}`}
            />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[11px] md:text-xs uppercase font-bold text-slate-600 leading-tight">
                  Hab
                </span>
                {sectorConfig && (
                  <span className="text-[10px] md:text-[11px] text-slate-500 font-mono hidden xs:inline">
                    ({sectorConfig.min}-{sectorConfig.max})
                  </span>
                )}
              </div>
              <input
                type="text"
                inputMode="numeric"
                value={patient.habitacion}
                onChange={(e) => onChange({ habitacion: e.target.value })}
                placeholder="101"
                className="w-12 md:w-16 bg-transparent font-bold text-sm md:text-base text-slate-800 outline-none p-0"
              />
            </div>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => handleRoomStep(-1)}
              className="w-8 h-8 md:w-9 md:h-9 rounded-[var(--radius-sm)] bg-white border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs hover:bg-slate-100 transition-[transform,background-color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] cursor-pointer relative before:absolute before:-inset-1 before:content-['']"
              title="Habitación anterior válida"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => handleRoomStep(1)}
              className="w-8 h-8 md:w-9 md:h-9 rounded-[var(--radius-sm)] bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs hover:bg-slate-300 transition-[transform,background-color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] cursor-pointer relative before:absolute before:-inset-1 before:content-['']"
              title="Siguiente habitación válida"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Historia Clínica (HC) */}
        <div className="col-span-6 sm:col-span-3 flex items-center bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] px-2 py-1 focus-within:border-sky-500 focus-within:bg-white focus-within:ring-1 focus-within:ring-sky-100">
          <FileText className="w-3.5 h-3.5 text-slate-500 mr-1.5 shrink-0" />
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-[11px] md:text-xs uppercase font-bold text-slate-600 leading-tight">
              HC (Hist. Clínica)
            </span>
            <input
              type="text"
              value={patient.historiaClinica || ''}
              onChange={(e) => onChange({ historiaClinica: e.target.value })}
              placeholder="N° HC"
              className="w-full bg-transparent font-bold text-xs md:text-sm text-slate-800 outline-none p-0"
            />
          </div>
        </div>

        {/* Camas: Selector de 1 toque (Chips 1, 2, 3, 4 - Máximo 4) */}
        <div className="col-span-12 sm:col-span-5 flex items-center justify-between bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] px-2 py-1">
          <div className="flex items-center gap-1.5 flex-1 overflow-x-auto">
            <Bed className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span className="text-[11px] md:text-xs uppercase font-bold text-slate-600 mr-0.5 shrink-0">
              Cama:
            </span>
            {COMMON_BEDS.map((bedNum) => (
              <button
                key={bedNum}
                type="button"
                onClick={() => onChange({ cama: bedNum })}
                className={`flex-1 sm:flex-none w-10 h-10 rounded-[var(--radius-sm)] font-bold text-xs md:text-sm border transition-[transform,box-shadow,background-color,border-color,color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] cursor-pointer ${
                  patient.cama === bedNum
                    ? 'bg-sky-700 text-white border-sky-700 shadow-[var(--shadow-rest)] ring-2 ring-sky-200 hover:scale-[1.015]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300 hover:shadow-[var(--shadow-rest)]'
                }`}
              >
                {bedNum}
              </button>
            ))}
          </div>

        </div>
      </div>

      <div className="grid grid-cols-12 gap-1.5 md:gap-2 mt-1.5">
        <div className="col-span-12 sm:col-span-6 flex items-center bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] px-2 py-1 focus-within:border-sky-500 focus-within:bg-white focus-within:ring-1 focus-within:ring-sky-100">
          <CalendarDays className="w-3.5 h-3.5 text-slate-500 mr-1.5 shrink-0" />
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-[11px] md:text-xs uppercase font-bold text-slate-600 leading-tight">
              Fecha de ingreso
            </span>
            <input
              type="date"
              aria-label="Fecha de ingreso del paciente"
              value={patient.fechaIngreso || ''}
              onChange={(e) => onChange({ fechaIngreso: e.target.value })}
              className="w-full bg-transparent font-bold text-xs md:text-sm text-slate-800 outline-none p-0 min-h-[22px]"
            />
          </div>
        </div>

        <div className="col-span-12 sm:col-span-6 flex items-center justify-between bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] px-2 py-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <UserRound className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-[11px] md:text-xs uppercase font-bold text-slate-600 shrink-0">
              Sexo:
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {(
              [
                { id: 'M' as const, label: 'Masculino' },
                { id: 'F' as const, label: 'Femenino' },
              ]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ sexo: opt.id })}
                className={`min-h-9 px-3 rounded-[var(--radius-sm)] font-bold text-xs border transition-[transform,box-shadow,background-color,border-color,color] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.98] cursor-pointer ${
                  patient.sexo === opt.id
                    ? 'bg-sky-700 text-white border-sky-700 shadow-[var(--shadow-rest)]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Interactivo de Mapa de Camas del Sector */}
      <SectorBedMatrixModal
        isOpen={isMatrixOpen}
        onClose={() => setIsMatrixOpen(false)}
        sector={patient.sector}
        currentRoom={patient.habitacion}
        currentBed={patient.cama}
        activeRound={activeRound}
        records={records}
        onSelectBed={(hab, bed) => {
          onChange({ habitacion: hab, cama: bed });
        }}
      />
    </div>
  );
};
