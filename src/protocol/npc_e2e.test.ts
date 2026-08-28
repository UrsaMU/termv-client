import { describe, expect, it } from 'vitest';
import { applyAttackToHostile, hostilesFromRoom, overlayHostiles } from './combat';
import { lookFromRoom } from './look';
import { matchSlash, parseSlashLine, planCombatSlash, SLASH_COMMANDS } from './slash';

const room = {
  name: 'Harbor Stairs',
  description: 'Salt air.',
  people: [],
  stuff: [
    { label: 'Sprawl Cop', flag: 'NPC', sub: 'DS10/10 · cheap SMG', idle: '', id: '12' },
    { label: 'Street Punks', flag: 'HORDE', sub: 'DS8 · damage drops members 1:1', idle: '', id: '19' },
  ],
  exits: [],
};

describe('npc look + combat e2e', () => {
  it('lists NPC in the optic and parses /npc', () => {
    expect(matchSlash('/').some((cmd) => cmd.id === 'npc')).toBe(true);
    expect(SLASH_COMMANDS.find((cmd) => cmd.id === 'npc')?.listed).toBe(true);
    expect(parseSlashLine('/npc')?.cmd.id).toBe('npc');
    expect(parseSlashLine('/hostile cop')).toEqual({
      cmd: expect.objectContaining({ id: 'npc' }),
      target: 'cop',
    });
    expect(planCombatSlash(SLASH_COMMANDS.find((cmd) => cmd.id === 'npc')!, '')).toMatchObject({
      fire: false,
      select: '',
      path: '/play',
    });
  });

  it('HERE HOSTILES follow live DS after a shot', () => {
    const cop = hostilesFromRoom(room)[0]!;
    const hit = applyAttackToHostile(cop, { success: true, damageToTarget: 5 });
    const lists = lookFromRoom(room, hit).lists;
    expect(lists.map((list) => list.label)).toEqual(['HOSTILES']);
    expect(lists[0]?.items[0]).toMatchObject({ label: 'Sprawl Cop', flag: 'DS 5' });
    const down = applyAttackToHostile(hit, { success: true, damageToTarget: 5 });
    expect(lookFromRoom(room, down).lists[0]?.items[0]?.flag).toBe('DOWN');
    const live = overlayHostiles(room, down).filter((row) => !row.dead);
    expect(live.map((row) => row.slug)).toEqual(['street-punks']);
  });
});
