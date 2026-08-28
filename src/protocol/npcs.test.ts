import { describe, expect, it } from 'vitest';
import { hostilesFromRoom } from './combat';
import { lookFromRoom } from './look';
import {
  clearNpcCmd,
  findNpc,
  nextNpcId,
  npcClearNotice,
  npcRow,
  spawnCmd,
  spawnReady,
  NPC_CATALOG,
} from './npcs';
import { needsCombatScreen, parseSlashLine, SLASH_COMMANDS } from './slash';

describe('staff npc spawn', () => {
  it('resolves catalog slugs and DS numbers', () => {
    expect(NPC_CATALOG.length).toBeGreaterThan(10);
    expect(findNpc('sprawl-cop')).toMatchObject({ slug: 'sprawl-cop', ds: 10, name: 'Sprawl Cop' });
    expect(findNpc('cop')?.slug).toBe('sprawl-cop');
    expect(findNpc('12')).toMatchObject({ slug: 'ds-12', ds: 12 });
    expect(findNpc('nope')).toBeNull();
    expect(spawnReady('gang-member')).toBe(true);
    expect(spawnCmd('sprawl-cop')).toBe('+npc/spawn sprawl-cop');
    expect(spawnCmd('sprawl-cop', 'Beat Cop')).toBe('+npc/spawn sprawl-cop=Beat Cop');
    expect(clearNpcCmd()).toBe('+npc/clear');
    expect(clearNpcCmd('cop')).toBe('+npc/clear cop');
  });

  it('drops a room row the combat desk can fight', () => {
    const row = npcRow(findNpc('sprawl-cop')!, '21');
    expect(row).toMatchObject({ flag: 'NPC', id: '21' });
    expect(row.sub).toMatch(/DS10\/10/);
    const listed = hostilesFromRoom({ people: [], stuff: [row] });
    expect(listed[0]).toMatchObject({ slug: 'sprawl-cop', ds: 10, kind: 'npc' });
    const look = lookFromRoom({ name: 'Alley', description: '', people: [], stuff: [row], exits: [] });
    expect(look.lists.map((list) => list.label)).toEqual(['HOSTILES']);
    expect(look.lists[0]?.items[0]?.label).toBe(row.label);
    expect(nextNpcId([{ id: '12' }, { id: '19' }])).toBe('20');
  });

  it('wires /npc /spawn /npc/clear onto plugin verbs', () => {
    expect(parseSlashLine('/npc')?.cmd.id).toBe('npc');
    expect(parseSlashLine('/spawn')?.cmd.id).toBe('npc-spawn');
    expect(parseSlashLine('/npc/spawn cop')?.cmd.id).toBe('npc-spawn');
    expect(parseSlashLine('+npc/spawn sprawl-cop')).toEqual({
      cmd: expect.objectContaining({ id: 'npc-spawn' }),
      target: 'sprawl-cop',
    });
    expect(parseSlashLine('/npc/clear')?.cmd.id).toBe('npc-clear');
    expect(parseSlashLine('/clear')?.cmd.id).toBe('npc-clear');
    expect(parseSlashLine('/clear')?.target).toBe('');
    expect(SLASH_COMMANDS.find((cmd) => cmd.id === 'npc')?.listed).toBe(true);
    expect(needsCombatScreen(SLASH_COMMANDS.find((cmd) => cmd.id === 'npc-clear')!)).toBe(true);
  });

  it('reports what /clear did', () => {
    expect(npcClearNotice(0)).toEqual({ kind: 'system', title: 'NPC', body: 'NOTHING HERE' });
    expect(npcClearNotice(2)).toEqual({ kind: 'system', title: 'NPC', body: 'CLEARED 02' });
    expect(npcClearNotice(1, 'cop')).toEqual({ kind: 'system', title: 'NPC', body: 'CLEARED COP' });
  });
});
