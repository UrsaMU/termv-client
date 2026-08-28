import { describe, expect, it } from 'vitest';
import { healActOf, healCmd } from './heal';
import { isHealSlash, parseSlashLine, SLASH_COMMANDS } from './slash';

describe('heal slash e2e', () => {
  it('wires /heal /lazarus /rest /clinic /stabilize onto plugin verbs', () => {
    expect(parseSlashLine('/heal')?.cmd.id).toBe('heal');
    expect(parseSlashLine('/aid')?.cmd.id).toBe('heal');
    expect(parseSlashLine('/lazarus')?.cmd.id).toBe('heal-lazarus');
    expect(parseSlashLine('/patch')?.cmd.id).toBe('heal-lazarus');
    expect(parseSlashLine('/rest')?.cmd.id).toBe('heal-rest');
    expect(parseSlashLine('/clinic')?.cmd.id).toBe('heal-clinic');
    expect(parseSlashLine('/stabilize')?.cmd.id).toBe('heal-stabilize');
    for (const id of ['heal', 'heal-lazarus', 'heal-rest', 'heal-clinic', 'heal-stabilize']) {
      const cmd = SLASH_COMMANDS.find((row) => row.id === id)!;
      expect(isHealSlash(cmd)).toBe(true);
      expect(healCmd(healActOf(id)!)).toBeTruthy();
    }
  });
});
