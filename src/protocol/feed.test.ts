import { describe, expect, it, beforeEach } from 'vitest';
import { examineEntry, pingEntry, resetFeedIds, rollEntry, rollEntryFromWire, speechFromWire } from './feed';

beforeEach(() => resetFeedIds());

describe('speechFromWire', () => {
  it('keeps poses as speaker + prose', () => {
    const entry = speechFromWire({
      text: '',
      data: { ui: { type: 'chat', kind: 'pose', name: 'GLITCH.EXE', text: 'leans on the rail.' } },
    });
    expect(entry).toMatchObject({
      kind: 'pose',
      speaker: 'GLITCH.EXE',
      body: 'leans on the rail.',
    });
  });

  it('keeps multi-line pose bodies', () => {
    const entry = speechFromWire({
      text: '',
      data: {
        ui: {
          type: 'chat',
          kind: 'pose',
          name: 'KESS',
          text: 'leans.%rchecks the mag.',
        },
      },
    });
    expect(entry?.body).toBe('leans.\nchecks the mag.');
  });

  it('ignores channel traffic', () => {
    expect(
      speechFromWire({
        text: '',
        data: { ui: { type: 'chat', kind: 'channel', name: 'KESS', text: 'copy' } },
      }),
    ).toBeNull();
  });
});

describe('pingEntry', () => {
  it('drops a ping card into the street feed', () => {
    const entry = pingEntry({
      id: '7',
      name: 'KESS',
      connected: true,
      staff: false,
      idle: 'now',
      image: '/avatars/7.jpg',
      fields: [{ key: 'pronouns', label: 'Pronouns', value: 'they/them' }],
    });
    expect(entry.kind).toBe('ping');
    expect(entry.ping?.image).toBe('/avatars/7.jpg');
    expect(entry.mediaUrl).toBe('/avatars/7.jpg');
  });
});

describe('examineEntry', () => {
  it('carries the full look card into the feed', () => {
    const entry = examineEntry({
      name: 'KESS',
      description: 'a fixer with a holdout',
      lists: [{ label: 'CARRYING', items: [{ label: 'Holdout', flag: '', sub: '', idle: '', cmd: 'look holdout' }] }],
    });
    expect(entry.kind).toBe('examine');
    expect(entry.look?.lists[0]?.label).toBe('CARRYING');
    expect(entry.body).toBe('a fixer with a holdout');
    expect(entry.acts).toBeUndefined();
  });

  it('hangs attack options under an NPC look', () => {
    const entry = examineEntry(
      { name: 'Sprawl Cop', description: 'badge and a cheap SMG', lists: [] },
      [{ label: 'AIM', right: 'REA +2', mode: 'aim', target: 'sprawl-cop' }],
    );
    expect(entry.acts).toEqual([
      { label: 'AIM', right: 'REA +2', mode: 'aim', target: 'sprawl-cop' },
    ]);
  });

  it('appends an attack roll as a normal feed line', () => {
    const look = examineEntry(
      { name: 'Sprawl Cop', description: 'badge and a cheap SMG', lists: [] },
      [{ label: 'AIM', right: 'REA +2', mode: 'aim', target: 'sprawl-cop' }],
    );
    const tape = rollEntry({
      verb: 'attack',
      title: 'ATTACK',
      stat: 'reaction',
      statShort: 'REA',
      statValue: 2,
      bonuses: 2,
      total: 15,
      ds: 10,
      success: true,
      margin: 5,
      damageToTarget: 5,
      damageToSelf: 0,
      needNerveCheck: false,
      mode: 'aim',
      dice: [6, 5],
      kept: [6, 5],
      explodeBonus: 0,
      doubleSix: false,
      doubleOne: false,
      parts: [],
      flavor: 'the shot walks the rail',
      target: 'Sprawl Cop',
    });
    expect(tape.kind).toBe('roll');
    expect([...[look], tape]).toHaveLength(2);
    expect(tape.roll?.total).toBe(15);
  });
});

describe('rollEntryFromWire', () => {
  it('turns a roll frame into a single feed line', () => {
    const entry = rollEntryFromWire({
      text: '',
      data: {
        ui: {
          meta: {
            type: 'sprawl',
            kind: 'roll',
            data: {
              statShort: 'REA',
              statValue: 2,
              bonuses: 2,
              total: 18,
              ds: 11,
              success: true,
            },
          },
        },
      },
    });
    expect(entry?.kind).toBe('roll');
    expect(entry?.body).toContain('REA 2 +2 vs DS 11 → 18');
    expect(entry?.roll?.total).toBe(18);
  });
});
