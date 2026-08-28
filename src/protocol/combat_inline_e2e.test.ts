import { describe, expect, it } from 'vitest';
import {
  attackActs,
  attackCmd,
  attackKit,
  attackReady,
  examineFromHostile,
  hostilesFromRoom,
  localAttackRoll,
  rangeAttackMod,
} from './combat';
import { operativeTabs } from './dock';
import { formatRollLine } from './frames';
import { panelPathFor, parseSlashLine, planCombatSlash, SLASH_COMMANDS } from './slash';

describe('inline street attack', () => {
  it('never routes attack onto a combat desk', () => {
    const attack = SLASH_COMMANDS.find((cmd) => cmd.id === 'attack')!;
    const burst = SLASH_COMMANDS.find((cmd) => cmd.id === 'attack-burst')!;
    expect(operativeTabs().map((row) => row.label)).not.toContain('COMBAT');
    expect(operativeTabs().some((row) => row.to === '/combat')).toBe(false);
    expect(panelPathFor(attack)).toBe('/play');
    expect(panelPathFor(burst)).toBe('/play');
    expect(planCombatSlash(attack, 'cop')?.path).toBe('/play');
    expect(planCombatSlash(attack, 'cop')?.fire).toBe(true);
  });

  it('builds plugin +attack lines and a street roll tape', () => {
    const cop = hostilesFromRoom({
      people: [],
      stuff: [{ label: 'Sprawl Cop', flag: 'NPC', sub: 'DS10/10', idle: '', id: '12' }],
    })[0]!;
    expect(attackReady(cop)).toBe(true);
    expect(attackCmd(cop.slug)).toBe('+attack sprawl-cop');
    expect(parseSlashLine('/attack sprawl-cop')).toEqual({
      cmd: expect.objectContaining({ id: 'attack' }),
      target: 'sprawl-cop',
    });
    const gun = {
      name: 'PKD-45',
      slug: 'pkd-45',
      slot: 'wielded',
      load: 1,
      mods: '',
      use: false,
      kind: 'firearm',
      bonus: 2,
      mag: 6,
      magMax: 8,
      ammo: null,
      fittings: [],
    };
    const kit = attackKit([gun], 'aim');
    const roll = localAttackRoll(cop, 2, kit.total, 'aim', rangeAttackMod(15, gun));
    expect(roll.verb).toBe('attack');
    expect(roll.line).toBe('+attack sprawl-cop');
    expect(formatRollLine(roll)).toMatch(/REA/);
  });

  it('puts AIM/BURST/AUTO under an NPC look, not a street slab', () => {
    const cop = hostilesFromRoom({
      people: [],
      stuff: [{ label: 'Sprawl Cop', flag: 'NPC', sub: 'DS10/10 · cheap SMG', idle: '', id: '12' }],
    })[0]!;
    expect(examineFromHostile(cop)).toMatchObject({
      name: 'Sprawl Cop',
      description: 'DS10/10 · cheap SMG',
    });
    expect(attackActs(cop, 2).map((act) => `${act.label}:${act.mode}:${act.target}`)).toEqual([
      'AIM:aim:sprawl-cop',
      'BURST:burst:sprawl-cop',
      'AUTO:auto:sprawl-cop',
      'RELOAD:reload:sprawl-cop',
    ]);
    expect(attackActs({ ...cop, ds: 0, dead: true })).toEqual([]);
  });
});
