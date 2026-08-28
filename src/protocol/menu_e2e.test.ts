import { describe, expect, it } from 'vitest';
import { wiredCommands } from './cmds';
import { INPUT_MODES, routeInput } from './speech';
import { matchSlash, panelPathFor, parseSlashLine, SLASH_COMMANDS } from './slash';

describe('menu e2e use-cases', () => {
  it('POSE sheet is speech only', () => {
    expect([...INPUT_MODES]).toEqual(['pose', 'say', 'emote', 'raw']);
    expect(routeInput('leans on the rail', 'pose')).toBe('pose leans on the rail');
    expect(routeInput('copy', 'say')).toBe('say copy');
  });

  it('listed slash catalog is the optic plus quit', () => {
    expect(wiredCommands().map((cmd) => cmd.id)).toEqual([
      'look',
      'help',
      'chargen',
      'short-desc',
      'roll',
      'attack',
      'npc',
      'gig',
      'jobs',
      'market',
      'ping',
      'console',
      'quit',
    ]);
    expect(SLASH_COMMANDS.filter((cmd) => cmd.listed).map((cmd) => cmd.id)).toEqual(
      wiredCommands().map((cmd) => cmd.id),
    );
  });

  it('/ opens the optic; + and +attack do not dump the catalog', () => {
    expect(matchSlash('/').map((cmd) => cmd.id)).toEqual([
      'look',
      'help',
      'chargen',
      'short-desc',
      'roll',
      'attack',
      'npc',
      'gig',
      'jobs',
      'market',
      'ping',
      'console',
      'quit',
    ]);
    expect(matchSlash('+')).toEqual([]);
    expect(matchSlash('+attack')).toEqual([]);
    expect(matchSlash('+roll').map((cmd) => cmd.id)).toEqual(['roll']);
    expect(routeInput('+attack sprawl-cop', 'pose')).toBe('+attack sprawl-cop');
  });

  it('arming LOOK / STREET / SHEET from a typed line stays a desk move', () => {
    expect(parseSlashLine('/look kess')?.cmd.id).toBe('look');
    expect(panelPathFor(SLASH_COMMANDS.find((cmd) => cmd.id === 'street')!)).toBe('/play');
    expect(panelPathFor(SLASH_COMMANDS.find((cmd) => cmd.id === 'sheet')!)).toBe('/sheet');
    expect(panelPathFor(SLASH_COMMANDS.find((cmd) => cmd.id === 'console')!)).toBe('/console');
    expect(routeInput('/look kess', 'pose')).toBe('look kess');
  });
});
