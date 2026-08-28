import { describe, expect, it, beforeEach } from 'vitest';
import {
  appendConsole,
  bangError,
  CONSOLE_CAP,
  consoleEcho,
  consoleTone,
  isConsoleError,
  lookToConsole,
  resetConsoleIds,
  speechToConsole,
} from './console';

beforeEach(() => resetConsoleIds());

describe('appendConsole', () => {
  it('keeps leftover lines and drops blanks', () => {
    expect(appendConsole([], ['Left the site.', '  ', 'Type +gig/enter.'])).toEqual([
      { id: 'c1', body: 'Left the site.' },
      { id: 'c2', body: 'Type +gig/enter.' },
    ]);
  });

  it('caps the buffer', () => {
    const filled = appendConsole(
      [],
      Array.from({ length: CONSOLE_CAP + 5 }, (_, i) => `line ${i}`),
    );
    expect(filled).toHaveLength(CONSOLE_CAP);
    expect(filled[0]?.body).toBe('line 5');
  });
});

describe('!! errors', () => {
  it('flags leftover plugin ERR lines and leaves echoes alone', () => {
    expect(isConsoleError('!! Staff only.')).toBe(true);
    expect(isConsoleError('!!')).toBe(true);
    expect(isConsoleError('  !! No room.')).toBe(true);
    expect(isConsoleError('Removed 2 NPC(s) from room.')).toBe(false);
    expect(isConsoleError('> +npc/clear')).toBe(false);
    expect(consoleTone('!! Unknown antagonist.')).toBe('err');
    expect(consoleTone('> look')).toBe('echo');
    expect(consoleTone('Salt air.')).toBe('plain');
  });

  it('formats login and desk errors as !! lines', () => {
    expect(bangError('Invalid username or password')).toBe('!! Invalid username or password');
    expect(bangError('!! already')).toBe('!! already');
    expect(bangError('  no ')).toBe('!! no');
    expect(bangError('')).toBe('!!');
  });
});

describe('tty lines', () => {
  it('echoes a sent command and flattens look plus speech', () => {
    expect(consoleEcho('look kess')).toBe('> look kess');
    expect(
      lookToConsole({
        name: 'Harbor Stairs(#42)',
        description: 'Salt air.',
        lists: [
          { label: 'PLAYERS', items: [{ label: 'KESS' }] },
          { label: 'EXITS', items: [{ label: 'east' }, { label: 'north' }] },
        ],
      }),
    ).toEqual(['Harbor Stairs(#42)', 'Salt air.', 'PLAYERS: KESS', 'EXITS: east, north']);
    expect(speechToConsole({ speaker: 'KESS', body: 'leans on the rail' })).toBe(
      'KESS leans on the rail',
    );
    expect(speechToConsole({ speaker: 'KESS', body: 'KESS lights a smoke' })).toBe(
      'KESS lights a smoke',
    );
  });
});
