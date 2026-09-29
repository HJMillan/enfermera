import { describe, expect, it } from 'vitest';
import { advancePlace, getValidRooms, isValidRoom, sectorPlaceCount, stepBed } from '../config/sectorConfig';

describe('habitaciones por sector', () => {
  it('respeta las exclusiones', () => {
    expect(getValidRooms('1° Piso')).toEqual([101, 102, 103, 104, 107, 108, 109, 110]);
    expect(getValidRooms('C')).toEqual([237, 238, 239, 240, 241, 253, 254, 255, 256]);
    expect(getValidRooms('Maternidad')).toEqual([242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 260, 261]);
  });

  it('valida habitaciones', () => {
    expect(isValidRoom('B', '201')).toBe(true);
    expect(isValidRoom('B', '216')).toBe(false);
    expect(isValidRoom('1° Piso', '105')).toBe(false);
    expect(isValidRoom('PB', 'abc')).toBe(false);
  });

  it('capacidad de UCE y RCA', () => {
    expect(sectorPlaceCount('UCE')).toBe(8);
    expect(sectorPlaceCount('RCA')).toBe(16);
  });
});

describe('advancePlace', () => {
  it('avanza de cama dentro de la habitación', () => {
    expect(advancePlace('B', '201', '2')).toEqual({ habitacion: '201', cama: '3', sectorEnd: false });
  });

  it('después de la cama 4 pasa a la siguiente habitación válida', () => {
    expect(advancePlace('1° Piso', '104', '4')).toEqual({ habitacion: '107', cama: '1', sectorEnd: false });
  });

  it('en la última cama del sector no se mueve', () => {
    expect(advancePlace('B', '215', '4')).toEqual({ habitacion: '215', cama: '4', sectorEnd: true });
  });

  it('en RCA pasa de box a sillón', () => {
    expect(advancePlace('RCA', 'Box', '12')).toEqual({ habitacion: 'Sillón', cama: '1', sectorEnd: false });
    expect(advancePlace('RCA', 'Sillón', '4').sectorEnd).toBe(true);
  });

  it('retroceder no baja de la cama 1', () => {
    expect(stepBed('B', '201', '1', -1)).toEqual({ habitacion: '201', cama: '1' });
  });
});
