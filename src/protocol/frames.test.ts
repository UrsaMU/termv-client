import { describe, expect, it } from 'vitest';
import {
  droppedDice,
  formatRollLine,
  formatRollMath,
  formatRollTag,
  descFromData,
  gearFromData,
  gigFromData,
  marketFromData,
  netFromData,
  rollFromData,
  sheetFromData,
  sheetIsLive,
  sprawlFromWire,
  type WireMessage,
} from './frames';

const rollData = {
  verb: 'roll',
  title: 'REACTION',
  stat: 'reaction',
  statShort: 'REA',
  statValue: 2,
  bonuses: 2,
  total: 18,
  ds: 11,
  success: true,
  margin: 7,
  damageToTarget: 7,
  damageToSelf: 0,
  needNerveCheck: false,
  mode: 'normal',
  dice: [6, 6, 4],
  kept: [6, 6],
  explodeBonus: 3,
  doubleSix: true,
  doubleOne: false,
  parts: ['stat 2', 'weapon +2'],
  flavor: 'the shot walks the rail',
  target: 'KESS',
  line: '+roll REA/11',
};

function layout(kind: string, data: Record<string, unknown>): WireMessage {
  return {
    text: '',
    data: {
      ui: {
        type: 'layout',
        meta: { type: 'sprawl', kind, data },
      },
    },
  };
}

describe('sprawlFromWire', () => {
  it('reads meta.type sprawl frames', () => {
    const frame = sprawlFromWire(layout('roll', rollData));
    expect(frame?.kind).toBe('roll');
    expect(frame?.data.total).toBe(18);
  });

  it('ignores look and chat', () => {
    expect(
      sprawlFromWire({
        text: '',
        data: { ui: { type: 'layout', meta: { type: 'look' } } },
      }),
    ).toBeNull();
  });
});

describe('rollFromData', () => {
  it('maps RollPayload fields used by 6d', () => {
    const roll = rollFromData(rollData);
    expect(roll?.kept).toEqual([6, 6]);
    expect(roll?.explodeBonus).toBe(3);
    expect(roll?.doubleSix).toBe(true);
    expect(formatRollLine(roll!)).toBe('ROLL · REA 2 +2 vs DS 11 → 18 ✓');
    expect(formatRollTag(roll!)).toBe('>> ROLL · REA · KESS');
    expect(formatRollMath(roll!)).toBe('6+6 + REA 2 +2 +3 = 18');
    expect(roll?.line).toBe('+roll REA/11');
  });

  it('keeps a miss equation tight', () => {
    const roll = rollFromData({
      ...rollData,
      success: false,
      target: '',
      kept: [1, 2],
      bonuses: -1,
      explodeBonus: 0,
      total: 3,
    });
    expect(formatRollTag(roll!)).toBe('>> ROLL · REA');
    expect(formatRollMath(roll!)).toBe('1+2 + REA 2 -1 = 3');
  });

  it('rejects empty payloads', () => {
    expect(rollFromData({})).toBeNull();
  });

  it('drops only the unused copies', () => {
    expect(droppedDice([6, 4, 6], [6, 6])).toEqual([4]);
    expect(droppedDice([6, 6, 4], [6, 6])).toEqual([4]);
  });
});

describe('sheetFromData', () => {
  it('requires a name and stats', () => {
    expect(sheetFromData({ name: 'GLITCH.EXE' })).toBeNull();
    const sheet = sheetFromData({
      name: '<#FFDC00>G<#E3DA00>L<#C6D800>I<#AAD500>T<#8ED300>C<#71D100>H.EXE',
      role: 'nodejacker',
      status: 'live',
      stats: { morphology: 1, equilibrium: 1, reaction: 2, cognition: 3, affinity: 1 },
      resilience: 9,
      resilienceMax: 12,
      load: 7,
      loadMax: 10,
      cash: 2140,
      ap: 40,
      level: 2,
      edge: 'Jack Point',
      background: 'Nodejacker',
      quirks: ['Hunted'],
      affectations: ['chrome nails'],
      note: 'ran the docks before the jack',
      augs: [{ slug: 'datajack', name: 'Datajack' }],
      gear: [{ name: 'PKD-45', load: 1, slot: 'wielded' }],
      critical: { location: 'torso', severity: 3, effect: 'bleed' },
    });
    expect(sheet?.name).toBe('GLITCH.EXE');
    expect(sheet?.role).toBe('NODEJACKER');
    expect(sheet?.status).toBe('LIVE');
    expect(sheet?.stats.cognition).toBe(3);
    expect(sheet?.cash).toBe(2140);
    expect(sheet?.quirks).toEqual(['Hunted']);
    expect(sheet?.affectations).toEqual(['chrome nails']);
    expect(sheet?.note).toBe('ran the docks before the jack');
    expect(sheet?.critical?.severity).toBe(3);
  });

  it('keeps a submitted sheet and does not drop a nameless stats frame', () => {
    const sheet = sheetFromData({
      status: 'submitted',
      stats: { morphology: 2, equilibrium: 0, reaction: 1, cognition: 1, affinity: 0 },
      notes: 'who I was',
      cash: 600,
    });
    expect(sheet?.status).toBe('SUBMITTED');
    expect(sheet?.note).toBe('who I was');
    expect(sheet?.stats.morphology).toBe(2);
    expect(sheet?.name).toBe('GOON');
    expect(sheetIsLive('SUBMITTED')).toBe(false);
    expect(sheetIsLive('LIVE')).toBe(true);
  });

  it('reads MOR/REA abbreviations the same as full names', () => {
    const sheet = sheetFromData({
      name: 'KESS',
      stats: { MOR: 1, EQU: 0, REA: 2, COG: 1, AFF: 0 },
    });
    expect(sheet?.stats.morphology).toBe(1);
    expect(sheet?.stats.reaction).toBe(2);
    expect(sheet?.stats.cognition).toBe(1);
    expect(sheet?.stats.affinity).toBe(0);
  });

  it('keeps full-name scores when an abbr key is also present as 0', () => {
    const sheet = sheetFromData({
      name: 'KESS',
      stats: { morphology: 1, reaction: 2, cognition: 1, affinity: 0, REA: 0, COG: 0 },
    });
    expect(sheet?.stats.reaction).toBe(2);
    expect(sheet?.stats.cognition).toBe(1);
  });

  it('maps cog/hack and aff/talk aliases onto cognition and affinity', () => {
    const sheet = sheetFromData({
      name: 'RUST',
      stats: { cog: 3, aff: 2, rea: 1 },
    });
    expect(sheet?.stats.cognition).toBe(3);
    expect(sheet?.stats.affinity).toBe(2);
    expect(sheet?.stats.reaction).toBe(1);
  });
});

describe('live frames', () => {
  it('parses gear, net, and gig payloads', () => {
    expect(
      gearFromData({
        load: 2,
        loadMax: 10,
        items: [
          {
            name: 'PKD-45',
            slug: 'pkd',
            slot: 'wielded',
            load: 1,
            mods: '+2',
            use: false,
            kind: 'firearm',
            mag: 5,
            magMax: 8,
            ammo: { slug: 'hellfires', name: 'Hellfires' },
            fittings: [{ slug: 'smart-link', name: 'Smart-link', effect: 'aim +1', tags: ['aim'] }],
          },
        ],
      })?.items[0],
    ).toMatchObject({
      slot: 'wielded',
      kind: 'firearm',
      ammo: { slug: 'hellfires', name: 'Hellfires' },
      fittings: [expect.objectContaining({ slug: 'smart-link', name: 'Smart-link' })],
    });
    expect(netFromData({ hull: 'HYPERION', ram: 3, ramMax: 4 })?.hull).toBe('HYPERION');
    expect(gigFromData({ id: 'g1', title: 'LIFT', node: 2, nodesMax: 4 })?.title).toBe('LIFT');
    expect(descFromData({ name: 'NEON', text: 'Rain on chrome.' })).toEqual({
      name: 'NEON',
      text: 'Rain on chrome.',
    });
  });

  it('reads fittings from a mods array when fittings is omitted', () => {
    expect(
      gearFromData({
        load: 1,
        items: [
          {
            name: 'PKD-45',
            slug: 'pkd-45',
            kind: 'firearm',
            mods: [{ slug: 'smart-link', name: 'Smart-link', bonus: 1, tags: ['shot'] }],
          },
        ],
      })?.items[0]?.fittings,
    ).toEqual([
      { slug: 'smart-link', name: 'Smart-link', effect: '', bonus: 1, tags: ['shot'] },
    ]);
  });

  it('reads ammoSlug and string fittings when the structured fields are missing', () => {
    expect(
      gearFromData({
        load: 1,
        loadMax: 10,
        items: [
          {
            name: 'PKD-45',
            slug: 'pkd-45',
            kind: 'firearm',
            ammoSlug: 'hellfires',
            ammoName: 'Hellfires',
            fittings: ['smart-targeting'],
          },
        ],
      })?.items[0],
    ).toMatchObject({
      ammo: { slug: 'hellfires', name: 'Hellfires' },
      fittings: [{ slug: 'smart-targeting', name: 'smart-targeting' }],
    });
  });

  it('keeps market card fields for the stall popup', () => {
    const market = marketFromData({
      cash: 400,
      items: [
        {
          slug: 'pkd-45',
          name: 'PKD-45',
          price: 500,
          spec: 'handgun · +1',
          category: 'firearm',
          stock: 'ok',
          image: '/art/pkd.png',
          blurb: 'Police special.',
          kind: 'firearm',
          book: 'p.39',
          tags: ['firearm', 'ss'],
          stats: [{ label: 'BONUS', value: '+1' }],
        },
      ],
    });
    expect(market?.items[0]).toMatchObject({
      slug: 'pkd-45',
      blurb: 'Police special.',
      image: '/art/pkd.png',
      tags: ['firearm', 'ss'],
      stats: [{ label: 'BONUS', value: '+1' }],
    });
  });
});
