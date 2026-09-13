import React, { useMemo } from 'react';
import { X, CheckCircle2, Bed, MapPin } from 'lucide-react';
import type { SectorType, FormType, StoredRecord } from '../../types/form';
import { getValidRooms, COMMON_BEDS } from '../../config/sectorConfig';

interface SectorBedMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  sector: SectorType;
  currentRoom: string;
  currentBed: string;
  activeRound?: FormType | 'HISTORY';
  records: StoredRecord[];
  onSelectBed: (habitacion: string, cama: string) => void;
}

export const SectorBedMatrixModal: React.FC<SectorBedMatrixModalProps> = ({
  isOpen,
  onClose,
  sector,
  currentRoom,
  currentBed,
  activeRound = 'ACCESO_PERIFERICO',
  records,
  onSelectBed,
}) => {
  const validRooms = useMemo(() => getValidRooms(sector), [sector]);

  // Mapa de camas censadas en el sector para la ronda activa
  const censadasSet = useMemo(() => {
    const set = new Set<string>();
    records
      .filter((r) => r.formType === activeRound && r.data.sector === sector)
      .forEach((r) => {
        set.add(`${r.data.habitacion}-${r.data.cama}`);
      });
    return set;
  }, [records, activeRound, sector]);

  if (!isOpen) return null;

  const totalBeds = validRooms.length * 4;
  const censadasCount = censadasSet.size;
  const progressPercent = totalBeds > 0 ? Math.round((censadasCount / totalBeds) * 100) : 0;

  const isVias = activeRound === 'ACCESO_PERIFERICO';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera del Modal */}
        <div
          className={`p-4 border-b text-white flex items-center justify-between ${
            isVias
              ? 'bg-gradient-to-r from-sky-700 to-cyan-700 border-sky-800'
              : 'bg-gradient-to-r from-rose-700 to-pink-700 border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-black text-base md:text-lg leading-tight">
                Mapa de Camas · Sector {sector}
              </h2>
              <p className="text-xs text-white/80">
                {isVias ? 'Ronda 1: Vías Periféricas' : 'Ronda 2: UPP'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 touch-active cursor-pointer"
            title="Cerrar mapa"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Progreso y Leyenda */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 space-y-2.5 text-xs">
          <div className="flex items-center justify-between font-bold text-slate-700">
            <span>Progreso del Sector {sector}:</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs ${
                isVias
                  ? 'bg-sky-100 text-sky-900 font-extrabold'
                  : 'bg-rose-100 text-rose-900 font-extrabold'
              }`}
            >
              {censadasCount} de {totalBeds} camas censadas ({progressPercent}%)
            </span>
          </div>

          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isVias ? 'bg-sky-600' : 'bg-rose-600'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Leyenda */}
          <div className="flex items-center gap-3 pt-0.5 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-slate-600 font-semibold">Censada hoy</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-md border border-slate-300 bg-white shrink-0" />
              <span className="text-slate-600 font-semibold">Pendiente</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-md ring-2 ring-sky-500 bg-sky-50 shrink-0" />
              <span className="text-slate-600 font-semibold">Cama actual</span>
            </div>
          </div>
        </div>

        {/* Lista de Habitaciones y Camas */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {validRooms.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              No hay habitaciones configuradas para este sector.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {validRooms.map((room) => {
                const roomStr = String(room);
                const isCurrentRoom = currentRoom === roomStr;

                return (
                  <div
                    key={room}
                    className={`p-3 rounded-2xl border transition-all ${
                      isCurrentRoom
                        ? 'border-sky-400 bg-sky-50/40 shadow-xs ring-1 ring-sky-300'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-extrabold text-xs text-slate-800 flex items-center gap-1">
                        <span>Habitación {room}</span>
                        {isCurrentRoom && (
                          <span className="text-[10px] bg-sky-600 text-white font-bold px-1.5 py-0.2 rounded">
                            Actual
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Chips de las 4 Camas de la Habitación */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {COMMON_BEDS.map((bed) => {
                        const isCensada = censadasSet.has(`${roomStr}-${bed}`);
                        const isSelected = isCurrentRoom && currentBed === bed;

                        return (
                          <button
                            key={bed}
                            type="button"
                            onClick={() => {
                              onSelectBed(roomStr, bed);
                              onClose();
                            }}
                            className={`min-h-[44px] rounded-xl font-bold text-xs flex flex-col items-center justify-center transition-all touch-active cursor-pointer border ${
                              isSelected
                                ? 'bg-sky-600 text-white border-sky-600 shadow-sm ring-2 ring-sky-300'
                                : isCensada
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-white'
                            }`}
                            title={`Habitación ${room} Cama ${bed} (${
                              isCensada ? 'Censada' : 'Pendiente'
                            })`}
                          >
                            <span className="flex items-center gap-0.5">
                              <Bed className="w-3 h-3" />
                              <span>{bed}</span>
                            </span>
                            <span className="text-[9px] font-semibold leading-tight">
                              {isCensada ? (
                                <CheckCircle2 className="w-2.5 h-2.5 inline text-emerald-600" />
                              ) : (
                                'Pend'
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pie del modal */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-200 text-slate-800 hover:bg-slate-300 font-bold text-xs touch-active cursor-pointer"
          >
            Volver al Formulario
          </button>
        </div>
      </div>
    </div>
  );
};
