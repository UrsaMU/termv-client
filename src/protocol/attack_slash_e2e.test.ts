import { describe, expect, it } from 'vitest';
import { hostilesFromRoom } from './combat';
import { routeInput } from './speech';
import {
  armableSlash,
  attackSlashMode,
  buildSlash,
  matchSlash,
  needsCombatScreen,
  panelPathFor,
  parseSlashLine,
  planCombatSlash,
  combatFireLine,
  combatNeedsTarget,
  SLASH_COMMANDS,
} from './slash';

describe('npc attack slash e2e', () => {
  it('lists ATTACK in the optic and keeps +attack as a raw line', () => {
    expect(matchSlash('/').some((cmd) => cmd.id === 'attack')).toBe(true);
    expect(matchSlash('/atk').map((cmd) => cmd.id)).toContain('attack');
    expect(matchSlash('/burst').map((cmd) => cmd.id)).toContain('attack-burst');
    expect(routeInput('+attack sprawl-cop', 'pose')).toBe('+attack sprawl-cop');
  });

  it('builds +attack lines against a named NPC', () => {
    const attack = SLASH_COMMANDS.find((cmd) => cmd.id === 'attack')!;
    const burst = SLASH_COMMANDS.find((cmd) => cmd.id === 'attack-burst')!;
    const reload = SLASH_COMMANDS.find((cmd) => cmd.id === 'attack-reload')!;
    expect(buildSlash(attack, 'sprawl-cop')).toBe('+attack sprawl-cop');
    expect(buildSlash(burst, 'eswat')).toBe('+attack/burst eswat');
    expect(buildSlash(reload)).toBe('+reload');
    expect(buildSlash(attack, '')).toBe('');
    expect(routeInput('/attack cop', 'pose')).toBe('+attack cop');
    expect(parseSlashLine('/npc eswat')?.cmd.id).toBe('npc');
  });

  it('keeps attack on street and sets the fire mode', () => {
    const attack = SLASH_COMMANDS.find((cmd) => cmd.id === 'attack')!;
    const aim = SLASH_COMMANDS.find((cmd) => cmd.id === 'attack-aim')!;
    const npc = SLASH_COMMANDS.find((cmd) => cmd.id === 'npc')!;
    expect(needsCombatScreen(attack)).toBe(true);
    expect(needsCombatScreen(npc)).toBe(true);
    expect(panelPathFor(attack)).toBe('/play');
    expect(panelPathFor(npc)).toBeNull();
    expect(attackSlashMode(attack)).toBe('aim');
    expect(attackSlashMode(aim)).toBe('aim');
    expect(attackSlashMode(SLASH_COMMANDS.find((cmd) => cmd.id === 'attack-auto')!)).toBe('auto');
  });

  it('named /attack fires on street; empty stays to pick; never opens a combat desk', () => {
    const attack = SLASH_COMMANDS.find((cmd) => cmd.id === 'attack')!;
    const burst = SLASH_COMMANDS.find((cmd) => cmd.id === 'attack-burst')!;
    const npc = SLASH_COMMANDS.find((cmd) => cmd.id === 'npc')!;
    const reload = SLASH_COMMANDS.find((cmd) => cmd.id === 'attack-reload')!;
    expect(planCombatSlash(attack, '')).toEqual({
      path: '/play',
      mode: 'aim',
      select: '',
      fire: false,
      reload: false,
    });
    expect(planCombatSlash(attack, 'sprawl-cop')).toEqual({
      path: '/play',
      mode: 'aim',
      select: 'sprawl-cop',
      fire: true,
      reload: false,
    });
    expect(planCombatSlash(burst, '')).toMatchObject({ mode: 'burst', fire: false, path: '/play' });
    expect(planCombatSlash(npc, 'cop')).toMatchObject({ fire: false, select: 'cop', path: '/play' });
    expect(planCombatSlash(reload, '')).toMatchObject({ reload: true, fire: false, path: '/play' });
    expect(combatFireLine(attack, 'sprawl-cop')).toBe('+attack sprawl-cop');
    expect(combatFireLine(burst, 'eswat')).toBe('+attack/burst eswat');
    expect(combatFireLine(attack, '')).toBe('');
    const aim = SLASH_COMMANDS.find((cmd) => cmd.id === 'attack-aim')!;
    const auto = SLASH_COMMANDS.find((cmd) => cmd.id === 'attack-auto')!;
    expect(combatNeedsTarget(attack, '')).toBe(true);
    expect(combatNeedsTarget(aim, '')).toBe(true);
    expect(combatNeedsTarget(burst, '')).toBe(true);
    expect(combatNeedsTarget(auto, '')).toBe(true);
    expect(combatNeedsTarget(attack, 'cop')).toBe(false);
    expect(combatNeedsTarget(reload, '')).toBe(false);
  });

  it('arms unique /attack lines and leaves bare words alone', () => {
    expect(armableSlash('/attack')?.cmd.id).toBe('attack');
    expect(armableSlash('/atk')?.cmd.id).toBe('attack');
    expect(armableSlash('/attack cop')).toEqual({
      cmd: expect.objectContaining({ id: 'attack' }),
      target: 'cop',
    });
    expect(armableSlash('/burst eswat')?.cmd.id).toBe('attack-burst');
    expect(armableSlash('/aim')?.cmd.id).toBe('attack-aim');
    expect(armableSlash('/auto')?.cmd.id).toBe('attack-auto');
    expect(armableSlash('/reload')?.cmd.id).toBe('attack-reload');
    expect(armableSlash('/npc')).toBeNull();
    expect(armableSlash('/combat')?.cmd.id).toBe('combat');
    expect(armableSlash('/att')).toBeNull();
    expect(armableSlash('/l')).toBeNull();
    expect(armableSlash('attack')).toBeNull();
    expect(armableSlash('+attack')).toBeNull();
    expect(armableSlash('/look')?.cmd.id).toBe('look');
  });

  it('locks room NPCs by slug for the attack optic', () => {
    const listed = hostilesFromRoom({
      people: [],
      stuff: [{ label: 'Sprawl Cop', flag: 'NPC', sub: 'DS10/10 · cheap SMG', idle: '', id: '12' }],
    });
    expect(listed.map((row) => row.slug)).toEqual(['sprawl-cop']);
    expect(listed[0]?.ds).toBe(10);
  });
});
