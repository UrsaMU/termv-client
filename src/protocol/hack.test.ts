import { describe, expect, it } from 'vitest';
import { hackLocksFromRoom, lockCmd, lockLine } from './hack';
import { lookFromRoom, roomFromLook } from './look';
import type { WireMessage } from './frames';

describe('hackLocksFromRoom', () => {
  it('lists only in-room LOCK rows, not hostiles or plain exits', () => {
    const listed = hackLocksFromRoom({
      stuff: [
        { label: 'Service Hatch', flag: 'LOCK', sub: 'LOCKED · DS12', idle: '', id: '9' },
        { label: 'Sprawl Cop', flag: 'NPC', sub: 'DS10/10', idle: '', id: '12' },
        { label: 'Crowbar', flag: '', sub: '', idle: '', id: '3' },
      ],
      exits: [
        { name: 'north', cmd: 'n', flag: 'LOCK', sub: 'LOCKED · DS8', id: '4' },
        { name: 'east', cmd: 'e' },
      ],
    });
    expect(listed.map((row) => `${row.name}:${row.ds}:${row.locked ? 'L' : 'O'}`)).toEqual([
      'Service Hatch:12:L',
      'north:8:L',
    ]);
  });

  it('builds +lock ds/n without touching @lock', () => {
    expect(lockCmd('north', 12)).toBe('+lock north=ds/12');
    expect(lockCmd('north')).toBe('+lock north');
    expect(lockLine('')).toBe('');
    expect(lockLine('north')).toBe('+lock north');
    expect(lockLine('north=ds/12')).toBe('+lock north=ds/12');
    expect(lockLine('north 12')).toBe('+lock north=ds/12');
    expect(lockLine('panel ds/8')).toBe('+lock panel=ds/8');
  });
});

describe('room look carries lock badges onto HERE exits', () => {
  it('keeps LOCK / DS on exit rows', () => {
    const wire: WireMessage = {
      text: '',
      data: {
        ui: {
          type: 'layout',
          meta: { type: 'look', isRoom: true },
          components: [
            { type: 'header', title: 'Alley' },
            {
              type: 'actions',
              title: 'Exits',
              items: [
                { label: 'north', role: 'LOCK', badge: 'DS 12', sublabel: 'LOCKED · DS12', id: '4', action: { cmd: 'n' } },
                { label: 'east', action: { cmd: 'e' } },
              ],
            },
          ],
        },
      },
    };
    const room = roomFromLook(wire)!;
    expect(hackLocksFromRoom(room).map((row) => row.name)).toEqual(['north']);
    const here = lookFromRoom(room);
    const exits = here.lists.find((list) => list.label === 'EXITS')?.items ?? [];
    expect(exits[0]).toMatchObject({ flag: 'LOCK', sub: 'LOCKED · DS12' });
  });
});
