import type { SectorType } from '../types/form';

export interface SectorRoomRange {
  min: number;
  max: number;
  exclusions?: number[];
}

export const SECTOR_CONFIG: Record<string, SectorRoomRange> = {
  'PB': { min: 1, max: 8 },
  '1° Piso': { min: 101, max: 110, exclusions: [105, 106] },
  'Maternidad': {
    min: 242,
    max: 261,
    // No existen 252 a 259
    exclusions: [252, 253, 254, 255, 256, 257, 258, 259],
  },
  'A': { min: 230, max: 236 },
  'B': { min: 201, max: 215 },
  'C': {
    min: 237,
    max: 256,
    // No existe 242 a 252
    exclusions: [242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252],
  },
  'D': { min: 216, max: 229 },
  'E': { min: 262, max: 277 },
};

/** Sectores sin habitaciones: cada lugar es una cama, un box o un sillón. */
export interface PlaceGroup {
  /** Valor que se guarda en la columna Habitación. */
  habitacion: string;
  /** Palabra que ve la enfermera junto al número. */
  noun: string;
  count: number;
}

export const PLACE_SECTORS: Record<string, { groups: PlaceGroup[] }> = {
  UCE: {
    groups: [{ habitacion: 'UCE', noun: 'Cama', count: 8 }],
  },
  RCA: {
    groups: [
      { habitacion: 'Box', noun: 'Box', count: 12 },
      { habitacion: 'Sillón', noun: 'Sillón', count: 4 },
    ],
  },
};

export const SECTORS: SectorType[] = [
  'PB',
  '1° Piso',
  'Maternidad',
  'A',
  'B',
  'C',
  'D',
  'E',
  'UCE',
  'RCA',
];

export const MAX_BEDS = 4;
export const COMMON_BEDS = ['1', '2', '3', '4'];

export interface SectorPlace {
  habitacion: string;
  cama: string;
  noun: string;
  group: string;
}

export function isPlaceSector(sector: SectorType): boolean {
  return Boolean(PLACE_SECTORS[sector]);
}

export function placeGroupTitle(noun: string): string {
  if (noun === 'Cama') return 'Camas';
  if (noun === 'Sillón') return 'Sillones';
  return noun;
}

export function getSectorPlaces(sector: SectorType): SectorPlace[] {
  const layout = PLACE_SECTORS[sector];
  if (layout) {
    const places: SectorPlace[] = [];
    for (const group of layout.groups) {
      for (let i = 1; i <= group.count; i++) {
        places.push({
          habitacion: group.habitacion,
          cama: String(i),
          noun: group.noun,
          group: placeGroupTitle(group.noun),
        });
      }
    }
    return places;
  }

  const rooms = getValidRooms(sector);
  const places: SectorPlace[] = [];
  for (const room of rooms) {
    for (const bed of COMMON_BEDS) {
      places.push({
        habitacion: String(room),
        cama: bed,
        noun: 'Cama',
        group: `Habitación ${room}`,
      });
    }
  }
  return places;
}

export function getDefaultPlace(sector: SectorType): { habitacion: string; cama: string } {
  if (isPlaceSector(sector)) {
    const first = getSectorPlaces(sector)[0];
    return first
      ? { habitacion: first.habitacion, cama: first.cama }
      : { habitacion: sector, cama: '1' };
  }
  return { habitacion: getDefaultRoom(sector), cama: '1' };
}

export function coercePlace(
  sector: SectorType,
  habitacion: string,
  cama: string
): { habitacion: string; cama: string } {
  if (isPlaceSector(sector)) {
    const places = getSectorPlaces(sector);
    const exact = places.find((p) => p.habitacion === habitacion && p.cama === cama);
    if (exact) return { habitacion: exact.habitacion, cama: exact.cama };
    return getDefaultPlace(sector);
  }

  const roomValid = isValidRoom(sector, habitacion);
  const nextRoom = roomValid ? habitacion : getDefaultRoom(sector);
  const bedOk = COMMON_BEDS.includes(cama);
  return { habitacion: nextRoom, cama: roomValid && bedOk ? cama : '1' };
}

/** Avanza o retrocede. En internación se queda en la misma habitación. En UCE/RCA recorre la lista. */
export function stepBed(
  sector: SectorType,
  habitacion: string,
  cama: string,
  delta: number
): { habitacion: string; cama: string } {
  if (isPlaceSector(sector)) {
    const places = getSectorPlaces(sector);
    if (places.length === 0) return { habitacion, cama };
    const idx = places.findIndex((p) => p.habitacion === habitacion && p.cama === cama);
    const start = idx === -1 ? 0 : idx;
    const next = Math.min(places.length - 1, Math.max(0, start + delta));
    return { habitacion: places[next].habitacion, cama: places[next].cama };
  }

  const idx = COMMON_BEDS.indexOf(cama);
  const start = idx === -1 ? 0 : idx;
  const next = Math.min(COMMON_BEDS.length - 1, Math.max(0, start + delta));
  return { habitacion, cama: COMMON_BEDS[next] };
}

export function formatPlace(sector: SectorType, habitacion: string, cama: string): string {
  const layout = PLACE_SECTORS[sector];
  if (layout) {
    const group = layout.groups.find((g) => g.habitacion === habitacion);
    if (group && group.habitacion === sector) return `${group.noun} ${cama}`;
    if (group) return `${group.habitacion} ${cama}`;
  }
  return `Hab ${habitacion} · Cama ${cama}`;
}

export function sectorPlaceCount(sector?: SectorType): number {
  if (!sector) {
    return SECTORS.reduce((total, sec) => total + getSectorPlaces(sec).length, 0);
  }
  return getSectorPlaces(sector).length;
}

export function getValidRooms(sector: SectorType): number[] {
  const config = SECTOR_CONFIG[sector];
  if (!config) return [];

  const rooms: number[] = [];
  const exclusionsSet = new Set(config.exclusions || []);

  for (let r = config.min; r <= config.max; r++) {
    if (!exclusionsSet.has(r)) {
      rooms.push(r);
    }
  }
  return rooms;
}

export function isValidRoom(sector: SectorType, room: number | string): boolean {
  const roomNum = typeof room === 'string' ? parseInt(room, 10) : room;
  if (isNaN(roomNum)) return false;

  const config = SECTOR_CONFIG[sector];
  if (!config) return true; // Si no hay config, permitir

  if (roomNum < config.min || roomNum > config.max) return false;
  if (config.exclusions && config.exclusions.includes(roomNum)) return false;

  return true;
}

export function getDefaultRoom(sector: SectorType): string {
  const rooms = getValidRooms(sector);
  return rooms.length > 0 ? String(rooms[0]) : '1';
}

export function getNextValidRoom(sector: SectorType, currentRoom: string, delta: number): string {
  const rooms = getValidRooms(sector);
  if (rooms.length === 0) {
    const parsed = parseInt(currentRoom, 10);
    return String(isNaN(parsed) ? 1 : Math.max(1, parsed + delta));
  }

  const currentNum = parseInt(currentRoom, 10);
  const currentIndex = rooms.indexOf(currentNum);

  if (currentIndex === -1) {
    // Si no está en la lista, buscar el más cercano o ir al primero
    if (delta > 0) {
      const next = rooms.find((r) => r > currentNum);
      return String(next !== undefined ? next : rooms[rooms.length - 1]);
    } else {
      const reversed = [...rooms].reverse();
      const prev = reversed.find((r) => r < currentNum);
      return String(prev !== undefined ? prev : rooms[0]);
    }
  }

  const nextIndex = Math.min(Math.max(0, currentIndex + delta), rooms.length - 1);
  return String(rooms[nextIndex]);
}
