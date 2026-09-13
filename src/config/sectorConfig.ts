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

export const SECTORS: SectorType[] = [
  'PB',
  '1° Piso',
  'Maternidad',
  'A',
  'B',
  'C',
  'D',
  'E',
];

export const MAX_BEDS = 4;
export const COMMON_BEDS = ['1', '2', '3', '4'];

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
