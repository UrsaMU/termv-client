import { describe, expect, it } from 'vitest';
import { runWiredCmd, wiredCommands } from './cmds';

const UNWIRED = [
  '+help',
  'help',
  '+sheet',
  '+gear',
  '+hack',
  '+market',
  '+flow',
  'who',
  'inventory',
  'score',
  '+chargen',
  'addcom',
  'raw',
];

describe('wiredCommands', () => {
  it('listed slash catalog — look, chargen, jobs, market, console, nothing unwired', () => {
    const cmds = wiredCommands();
    expect(cmds[0]).toMatchObject({ id: 'look', wantsTarget: true });
    expect(cmds.map((c) => c.id)).toEqual([
      'look',
      'help',
      'chargen',
      'roll',
      'attack',
      'npc',
      'gig',
      'jobs',
      'market',
      'console',
      'quit',
    ]);
    expect(cmds.find((c) => c.id === 'console')).toMatchObject({
      to: '/console',
      wantsTarget: false,
      hint: 'TTY',
    });
    expect(cmds.find((c) => c.id === 'quit')).toMatchObject({
      send: 'quit',
      to: '/',
      action: 'quit',
      wantsTarget: false,
      hint: 'JACK OUT',
    });
    const sends = cmds.map((c) => c.send).filter(Boolean);
    for (const banned of UNWIRED) {
      expect(sends.some((s) => s?.toLowerCase() === banned || s?.startsWith(`${banned} `))).toBe(
        false,
      );
    }
  });
});

describe('runWiredCmd', () => {
  it('sends the verb and refreshes look after gig', () => {
    const sent: string[] = [];
    const gone: string[] = [];
    runWiredCmd(
      { id: 'gig', label: 'PULL GIG', hint: 'CONTRACT', send: '+gig' },
      { send: (line) => sent.push(line), go: (to) => gone.push(to) },
    );
    expect(sent).toEqual(['+gig', 'look']);
    expect(gone).toEqual([]);
  });

  it('sends a wired roll without leaving the street', () => {
    const sent: string[] = [];
    const gone: string[] = [];
    runWiredCmd(
      { id: 'roll-mor', label: 'ROLL MOR', hint: 'DICE', send: '+roll MOR' },
      { send: (line) => sent.push(line), go: (to) => gone.push(to) },
    );
    expect(sent).toEqual(['+roll MOR']);
    expect(gone).toEqual([]);
  });

  it('sends quit and returns to boot', () => {
    const sent: string[] = [];
    const gone: string[] = [];
    runWiredCmd(
      { id: 'quit', label: 'QUIT', hint: 'JACK OUT', send: 'quit', to: '/', action: 'quit' },
      { send: (line) => sent.push(line), go: (to) => gone.push(to) },
    );
    expect(sent).toEqual(['quit']);
    expect(gone).toEqual(['/']);
  });

  it('opens the tty without sending a line', () => {
    const sent: string[] = [];
    const gone: string[] = [];
    runWiredCmd(
      { id: 'console', label: 'CONSOLE', hint: 'TTY', to: '/console' },
      { send: (line) => sent.push(line), go: (to) => gone.push(to) },
    );
    expect(sent).toEqual([]);
    expect(gone).toEqual(['/console']);
  });

  it('navigates when the command is a route', () => {
    const sent: string[] = [];
    const gone: string[] = [];
    runWiredCmd(
      { id: 'sheet', label: 'SHEET', hint: 'DOSSIER', to: '/sheet' },
      { send: (line) => sent.push(line), go: (to) => gone.push(to) },
    );
    expect(sent).toEqual([]);
    expect(gone).toEqual(['/sheet']);
  });
});
