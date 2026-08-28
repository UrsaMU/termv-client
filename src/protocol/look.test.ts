import { describe, expect, it } from 'vitest';
import {
  bareLookName,
  cleanLookProse,
  examineFromLook,
  exitChip,
  formatLookName,
  lookCmdFor,
  lookFromRoom,
  lookIsRoom,
  roomFromLook,
} from './look';
import type { WireMessage } from './frames';

const look: WireMessage = {
  text: '',
  data: {
    ui: {
      type: 'layout',
      meta: { type: 'look', isRoom: true },
      components: [
        { type: 'header', title: 'Harbor Stairs (#42)' },
        { type: 'media', url: 'https://example.test/room.png' },
        { type: 'text', content: 'Salt air. Neon in the puddles.' },
        {
          type: 'entity-list',
          title: 'Exits',
          items: [
            { label: 'east', action: { cmd: 'e' } },
            { label: 'north', cmd: 'n' },
          ],
        },
        {
          type: 'entity-list',
          title: 'Characters',
          items: [
            {
              label: 'KESS',
              role: 'NPC',
              sublabel: 'a fixer with a holdout and no patience',
              action: { cmd: 'look kess' },
            },
          ],
        },
      ],
    },
  },
};

describe('roomFromLook', () => {
  it('parses name, art, exits, and people', () => {
    const room = roomFromLook(look);
    expect(room?.name).toBe('Harbor Stairs(#42)');
    expect(room?.mediaUrl).toContain('room.png');
    expect(room?.exits.map((e) => e.cmd)).toEqual(['e', 'n']);
    expect(room?.people[0]?.label).toBe('KESS');
    expect(room?.people[0]?.sub).toBe('a fixer with a holdout and no patience');
    expect(room?.people[0]?.flag).toBe('NPC');
  });

  it('puts look and contents on one in-line view', () => {
    const room = roomFromLook(look);
    expect(room).toBeTruthy();
    const view = lookFromRoom(room!);
    expect(view.lists.map((list) => list.label)).toEqual(['HOSTILES', 'EXITS']);
    expect(view.lists[0]?.items[0]?.label).toBe('KESS');
    expect(view.lists[1]?.items.map((item) => item.cmd)).toEqual(['e', 'n']);
  });
});

describe('examineFromLook', () => {
  it('does not treat a ping card as a look', () => {
    const msg: WireMessage = {
      text: '',
      data: {
        ui: {
          type: 'layout',
          meta: {
            type: 'sprawl',
            kind: 'ping',
            data: { id: '7', name: 'KESS', fields: [] },
          },
          components: [
            { type: 'header', title: 'KESS' },
            { type: 'media', url: '/avatars/7.jpg' },
            { type: 'text', content: 'Pronouns: they/them' },
          ],
        },
      },
    };
    expect(examineFromLook(msg)).toBeNull();
    expect(roomFromLook(msg)).toBeNull();
  });

  it('does not replace a room, and keeps image plus desc', () => {
    const msg: WireMessage = {
      text: '',
      data: {
        ui: {
          type: 'layout',
          meta: { type: 'look', isRoom: false },
          components: [
            { type: 'header', title: '<#FFDC00>G<#E3DA00>LITCH' },
            { type: 'media', url: 'https://example.test/glitch.png' },
            { type: 'text', content: 'Chrome at the temple.' },
          ],
        },
      },
    };
    expect(roomFromLook(msg)).toBeNull();
    expect(examineFromLook(msg)).toEqual({
      name: 'GLITCH',
      description: 'Chrome at the temple.',
      mediaUrl: 'https://example.test/glitch.png',
      lists: [],
    });
  });

  it('strips LOOK chrome and joins wrapped terminal lines', () => {
    expect(
      cleanLookProse(
        [
          '============================= LOOK · GLITCH.EXE ==============================',
          '  gL17.ch cuts through the rain like zone wars veteran who already spent',
          '  the night. gL17.ch wears a drab mil-surplus combats and camo layers.',
          '==============================================================================',
        ].join('\n'),
      ),
    ).toBe(
      'gL17.ch cuts through the rain like zone wars veteran who already spent the night. gL17.ch wears a drab mil-surplus combats and camo layers.',
    );
  });

  it('keeps contents / players / exits on a thing look', () => {
    const msg: WireMessage = {
      text: '',
      data: {
        ui: {
          type: 'layout',
          meta: { type: 'look', isRoom: false },
          components: [
            { type: 'header', title: 'Wrecked Courier Van (#88)' },
            { type: 'text', content: 'Rust, tape, and a stolen plate.' },
            {
              type: 'entity-list',
              title: 'Players',
              items: [{ label: 'KESS', id: '7', action: { cmd: 'look kess' } }],
            },
            {
              type: 'entity-list',
              title: 'Carrying',
              items: [{ label: 'Crowbar', id: '19', action: { cmd: 'look crowbar' } }],
            },
            {
              type: 'actions',
              title: 'Exits',
              items: [{ label: 'out', action: { cmd: 'out' } }],
            },
          ],
        },
      },
    };
    expect(roomFromLook(msg)).toBeNull();
    const view = examineFromLook(msg);
    expect(view?.name).toBe('Wrecked Courier Van(#88)');
    expect(view?.description).toBe('Rust, tape, and a stolen plate.');
    expect(view?.mediaUrl).toBeUndefined();
    expect(view?.lists.map((list) => list.label)).toEqual(['PLAYERS', 'CARRYING', 'EXITS']);
    expect(view?.lists[0]?.items[0]?.label).toBe('KESS(#7)');
    expect(view?.lists[1]?.items[0]?.label).toBe('Crowbar(#19)');
    expect(view?.lists[2]?.items[0]).toMatchObject({ label: 'out', cmd: 'out' });
  });
});

describe('lookFromRoom', () => {
  it('uses the same /LOOK card shape as an examine', () => {
    const room = roomFromLook(look);
    expect(room).toBeTruthy();
    const card = lookFromRoom(room!);
    expect(card.name).toBe('Harbor Stairs(#42)');
    expect(card.description).toBe('Salt air. Neon in the puddles.');
    expect(card.lists.map((list) => list.label)).toEqual(['HOSTILES', 'EXITS']);
    expect(card.lists[0]?.items[0]).toMatchObject({ label: 'KESS', flag: 'DS 10' });
    expect(card.lists[1]?.items[0]).toMatchObject({ label: 'east', cmd: 'e' });
  });

  it('lists vehicles as THINGS and keeps hostiles off that list', () => {
    const card = lookFromRoom({
      name: 'Alley',
      description: 'Wet brick.',
      people: [{ label: 'KESS', flag: 'PLAYER', sub: 'a fixer', idle: '' }],
      stuff: [
        { label: 'Sprawl Cop', flag: 'NPC', sub: 'DS10/10 · badge and a cheap SMG', idle: '', id: '12' },
        { label: 'Courier Van', flag: 'VEHICLE', sub: 'rust, tape, and a stolen plate', idle: '', id: '88' },
      ],
      exits: [{ name: 'east', cmd: 'e' }],
    });
    expect(card.lists.map((list) => list.label)).toEqual(['HOSTILES', 'PLAYERS', 'THINGS', 'EXITS']);
    expect(card.lists.find((list) => list.label === 'THINGS')?.items.map((row) => row.label)).toEqual([
      'Courier Van',
    ]);
    expect(card.lists.find((list) => list.label === 'HOSTILES')?.items[0]).toMatchObject({
      label: 'Sprawl Cop',
      flag: 'DS 10',
    });
  });
});

describe('lookIsRoom', () => {
  it('does not treat a container thing as the scene', () => {
    const thing: WireMessage = {
      text: '',
      data: {
        ui: {
          type: 'layout',
          meta: { type: 'look', isRoom: false },
          components: [
            { type: 'header', title: 'Locker (#9)' },
            { type: 'entity-list', title: 'Contents', items: [{ label: 'Crowbar', id: '3' }] },
          ],
        },
      },
    };
    expect(lookIsRoom(thing)).toBe(false);
    expect(roomFromLook(thing)).toBeNull();
    expect(examineFromLook(thing)?.name).toBe('Locker(#9)');
  });
});

describe('lookCmdFor', () => {
  it('looks by #id or bare name, never displayname(#id)', () => {
    expect(lookCmdFor({ label: 'KESS(#7)', cmd: 'look kess', id: '7' })).toBe('look kess');
    expect(lookCmdFor({ label: 'Crowbar(#19)', id: '19' })).toBe('look #19');
    expect(lookCmdFor({ label: 'KESS(#7)' })).toBe('look KESS');
    expect(bareLookName('KESS(#7)')).toBe('KESS');
  });
});

describe('formatLookName', () => {
  it('keeps displayname(#123) and fills id when missing', () => {
    expect(formatLookName('Kess (#12)')).toBe('Kess(#12)');
    expect(formatLookName('Crowbar', '19')).toBe('Crowbar(#19)');
    expect(formatLookName('Crowbar', '#19ed')).toBe('Crowbar(#19)');
    expect(formatLookName('out')).toBe('out');
  });
});

describe('exitChip', () => {
  it('shows a distinct alias and skips a repeated name', () => {
    expect(exitChip('east', 'e')).toBe('e');
    expect(exitChip('Harbor Service Stairs', 'hss')).toBe('hss');
    expect(exitChip('east')).toBe('');
    expect(exitChip('Harbor Service Stairs')).toBe('');
    expect(exitChip('out', 'out')).toBe('');
  });
});
