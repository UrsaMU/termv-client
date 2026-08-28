import { describe, expect, it } from 'vitest';
import { INPUT_MODES, isCommand, routeInput } from './speech';

describe('INPUT_MODES', () => {
  it('is pose / say / emote plus bare WIRE', () => {
    expect([...INPUT_MODES]).toEqual(['pose', 'say', 'emote', 'raw']);
  });
});

describe('routeInput', () => {
  it('prefixes pose / say / emote and leaves WIRE bare', () => {
    expect(routeInput('leans on the rail', 'pose')).toBe('pose leans on the rail');
    expect(routeInput('keep walking', 'say')).toBe('say keep walking');
    expect(routeInput('checks the mag', 'emote')).toBe(':checks the mag');
    expect(routeInput(':already colon', 'emote')).toBe(':already colon');
    expect(routeInput('north', 'raw')).toBe('north');
    expect(routeInput('look kess', 'raw')).toBe('look kess');
    expect(routeInput('leans.\nchecks the mag.', 'pose')).toBe('pose leans.\nchecks the mag.');
    expect(routeInput('line one\nline two', 'say')).toBe('say line one\nline two');
    expect(routeInput('checks\nthe mag', 'emote')).toBe(':checks\nthe mag');
  });

  it('sends LOOK for look /look /l l with an optional target', () => {
    expect(routeInput('look', 'pose')).toBe('look');
    expect(routeInput('/look', 'say')).toBe('look');
    expect(routeInput('/l', 'emote')).toBe('look');
    expect(routeInput('l', 'pose')).toBe('look');
    expect(routeInput('look kess', 'pose')).toBe('look kess');
    expect(routeInput('/look rusty locker', 'raw')).toBe('look rusty locker');
    expect(routeInput('/chargen', 'pose')).toBe('+chargen');
    expect(routeInput('/stat COG=2', 'pose')).toBe('+chargen/stat COG=2');
    expect(routeInput('/cash', 'say')).toBe('+chargen/cash');
    expect(routeInput('/quit', 'pose')).toBe('quit');
    expect(routeInput('quit', 'say')).toBe('quit');
    expect(routeInput('/exit', 'emote')).toBe('quit');
  });

  it('poses typed verbs that are not slash LOOK', () => {
    expect(routeInput('looks around', 'pose')).toBe('pose looks around');
    expect(routeInput('who is that', 'pose')).toBe('pose who is that');
    expect(routeInput('e', 'pose')).toBe('pose e');
    expect(routeInput('help', 'pose')).toBe('pose help');
  });

  it('passes explicit + / @ / & prefixes and leftover raw mode', () => {
    expect(routeInput('+sheet', 'pose')).toBe('+sheet');
    expect(routeInput('@wall hi', 'say')).toBe('@wall hi');
    expect(routeInput('&short-desc me=wet coat', 'pose')).toBe('&short-desc me=wet coat');
    expect(routeInput('&va me=1', 'raw')).toBe('&va me=1');
    expect(routeInput('+attack kess', 'raw')).toBe('+attack kess');
  });

  it('drops empty input', () => {
    expect(routeInput('   ', 'pose')).toBe('');
  });
});

describe('isCommand', () => {
  it('only treats prefixed lines as commands', () => {
    expect(isCommand('+hack door')).toBe(true);
    expect(isCommand('@emit flash')).toBe(true);
    expect(isCommand('&short-desc me=wet coat')).toBe(true);
    expect(isCommand('"hello"')).toBe(true);
    expect(isCommand('north')).toBe(false);
    expect(isCommand('look')).toBe(false);
    expect(isCommand('leans on the rail')).toBe(false);
  });
});

