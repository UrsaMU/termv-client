import { describe, expect, it } from 'vitest';
import {
  applyAttackToHostile,
  attackCmd,
  attackReady,
  attackRef,
  fireModeCmd,
  hostilesFromRoom,
  hostileFromRow,
  isHostileRow,
  attackKit,
  localAttackRoll,
  overlayHostiles,
  pickWielded,
  rangeAttackMod,
  rangeBandOf,
  rangeCmd,
  rangeMetres,
  rangeStanceOf,
  weaponRangeM,
  weaponLine,
} from './combat';
import { lookFromRoom, roomFromLook, type RoomView } from './look';
import type { WireMessage } from './frames';

const cop = {
  label: 'Sprawl Cop(#12)',
  role: 'NPC',
  sublabel: 'DS10/10 · badge and a cheap SMG',
  dbref: '12',
  action: { cmd: 'look #12' },
};

const horde = {
  label: 'street punks',
  role: 'HORDE',
  sublabel: 'DS8 · damage drops members 1:1',
};

const kess = {
  label: 'KESS',
  role: 'PLAYER',
  sublabel: 'a fixer with a holdout',
};

const room: RoomView = {
  name: 'Harbor Stairs',
  description: 'Salt air.',
  people: [
    {
      label: 'KESS',
      flag: 'PLAYER',
      sub: 'a fixer with a holdout',
      idle: '',
    },
    {
      label: 'Sprawl Cop(#12)',
      flag: 'NPC',
      sub: 'DS10/10 · badge and a cheap SMG',
      idle: '',
      id: '12',
    },
  ],
  stuff: [
    {
      label: 'street punks',
      flag: 'HORDE',
      sub: 'DS8 · damage drops members 1:1',
      idle: '',
    },
  ],
  exits: [{ name: 'east', cmd: 'e' }],
};

describe('combat e2e use-cases', () => {
  it('reads room NPCs and hordes as hostiles, not civilians', () => {
    const listed = hostilesFromRoom(room);
    expect(listed.map((row) => `${row.kind}:${row.slug}:${row.ds}`)).toEqual([
      'npc:sprawl-cop:10',
      'horde:street-punks:8',
    ]);
    expect(isHostileRow({ label: 'KESS', flag: 'PLAYER', sub: 'a fixer', idle: '' })).toBe(false);
    expect(hostileFromRow(room.people[1]!)?.id).toBe('12');
  });

  it('puts hostiles on HERE and leaves players/exits alone', () => {
    const look = lookFromRoom(room);
    expect(look.lists.map((row) => row.label)).toEqual(['HOSTILES', 'PLAYERS', 'EXITS']);
    expect(look.lists[0]?.items.map((row) => row.flag)).toEqual(['DS 10', 'DS 8']);
    expect(look.lists[1]?.items.map((row) => row.label)).toEqual(['KESS']);
  });

  it('parses a live look frame the same way', () => {
    const wire: WireMessage = {
      text: '',
      data: {
        ui: {
          type: 'layout',
          meta: { type: 'look', isRoom: true },
          components: [
            { type: 'header', title: 'Harbor Stairs' },
            {
              type: 'entity-list',
              title: 'Contents',
              items: [cop, horde],
            },
            { type: 'entity-list', title: 'Characters', items: [kess] },
          ],
        },
      },
    };
    const parsed = roomFromLook(wire)!;
    expect(hostilesFromRoom(parsed).map((row) => row.slug)).toEqual(['sprawl-cop', 'street-punks']);
  });

  it('maps the desk to book range, not fake 5/15/25 street bands', () => {
    const pkd = { kind: 'firearm', slug: 'pkd-45', name: 'PKD-45', rangeM: 50 };
    expect(weaponRangeM(pkd)).toBe(50);
    expect(rangeCmd('close', 50)).toBe('+range 1');
    expect(rangeCmd('street', 50)).toBe('+range 15');
    expect(rangeCmd('break', 50)).toBe('+range 51');
    expect(rangeStanceOf(1, 50)).toBe('close');
    expect(rangeStanceOf(15, 50)).toBe('street');
    expect(rangeStanceOf(51, 50)).toBe('break');
    expect(rangeBandOf(15, 50)).toBe('street');
    expect(rangeMetres('close')).toBe(1);
    expect(rangeAttackMod(1, pkd)).toMatchObject({ bonus: 3, glitch: 0, stance: 'close' });
    expect(rangeAttackMod(15, pkd)).toMatchObject({ bonus: 0, glitch: 0, stance: 'street' });
    expect(rangeAttackMod(51, pkd)).toMatchObject({ bonus: 0, glitch: 1, stance: 'break' });
    expect(attackCmd('eswat')).toBe('+attack eswat');
    expect(attackCmd('eswat', 'burst')).toBe('+attack/burst eswat');
    expect(fireModeCmd('auto', 'eswat')).toBe('+attack/auto eswat');
    expect(fireModeCmd('reload')).toBe('+reload');
    expect(fireModeCmd('aim')).toBe('');
  });

  it('needs a live target before the slab fires', () => {
    const live = hostilesFromRoom(room)[0]!;
    expect(attackReady(live)).toBe(true);
    expect(attackRef(live)).toBe('sprawl-cop');
    expect(attackReady({ ...live, ds: 0, dead: true })).toBe(false);
    expect(attackCmd('')).toBe('');
  });

  it('a hit drops DS and a miss leaves the body standing', () => {
    const live = hostilesFromRoom(room)[0]!;
    const hit = applyAttackToHostile(live, { success: true, damageToTarget: 4 });
    expect(hit).toMatchObject({ ds: 6, dead: false });
    const kill = applyAttackToHostile(hit, { success: true, damageToTarget: 6 });
    expect(kill).toMatchObject({ ds: 0, dead: true });
    expect(applyAttackToHostile(live, { success: false, damageToTarget: 0 }).ds).toBe(10);
  });

  it('wielded gun is the attack row; unarmed falls back to MOR', () => {
    const pkd = { name: 'PKD-45', slug: 'pkd-45', slot: 'wielded', load: 1, mods: '', use: false, kind: 'firearm', bonus: 2, mag: 6, magMax: 8, ammo: null, fittings: [] };
    const gun = pickWielded([
      pkd,
      { name: 'leathers', slug: 'leathers', slot: 'worn', load: 1, mods: '', use: false, kind: 'armor', ammo: null, fittings: [] },
    ]);
    expect(weaponLine(gun)).toEqual({ name: 'PKD-45', right: '+2 · 6 / 8 rds', bonus: 2 });
    expect(
      weaponLine({
        ...pkd,
        fittings: [{ slug: 'smart-link', name: 'Smart-link', effect: '', tags: [] }],
      }).sub,
    ).toBe('Smart-link');
    expect(weaponLine(null)).toEqual({ name: 'UNARMED', right: 'MOR', bonus: 0 });
  });

  it('solo preview attack is a real roll against that DS', () => {
    const live = hostilesFromRoom(room)[0]!;
    const roll = localAttackRoll(live, 2, 2, 'aim');
    expect(roll.line).toBe('+attack sprawl-cop');
    expect(roll.verb).toBe('attack');
    expect(roll.ds).toBe(10);
    expect(roll.total).toBe(15);
    expect(roll.success).toBe(true);
    expect(applyAttackToHostile(live, roll).ds).toBe(5);
    const pb = localAttackRoll(live, 2, 2, 'aim', rangeAttackMod(1, { kind: 'firearm', slug: 'pkd-45' }));
    expect(pb.bonuses).toBe(5);
    expect(pb.total).toBe(18);
    const oor = localAttackRoll(live, 2, 2, 'aim', rangeAttackMod(51, { kind: 'firearm', slug: 'pkd-45', rangeM: 50 }));
    expect(oor.needNerveCheck).toBe(true);
    expect(oor.total).toBe(13);
    const shown = overlayHostiles(room, applyAttackToHostile(live, roll));
    expect(shown[0]?.ds).toBe(5);
  });

  it('attack kit adds worn armor + wielded gun + matching mods', () => {
    const vest = {
      name: 'Kevlar',
      slug: 'heavy-kevlar',
      slot: 'worn',
      load: 1,
      mods: '',
      use: false,
      kind: 'armor',
      bonus: 1,
      ammo: null,
      fittings: [],
    };
    const spare = {
      name: 'Charon',
      slug: 'charon',
      slot: 'carried',
      load: 1,
      mods: '',
      use: false,
      kind: 'firearm',
      bonus: 2,
      mag: 8,
      magMax: 8,
      ammo: null,
      fittings: [],
    };
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
      fittings: [
        { slug: 'custom-grips', name: 'Custom grips', effect: '', bonus: 1, tags: ['shot'] },
        { slug: 'targeting-scope', name: 'Scope', effect: '', bonus: 1, tags: ['aim'] },
        { slug: 'smart-link', name: 'Smart-link', effect: '', bonus: 0, tags: ['upgrade-shot'] },
      ],
    };
    const loose = {
      name: 'Gyro',
      slug: 'gyro',
      slot: 'carried',
      load: 0,
      mods: '',
      use: false,
      kind: 'mod',
      bonus: 1,
      ammo: null,
      fittings: [],
    };
    const carriedVest = { ...vest, slot: 'carried' };
    expect(attackKit([carriedVest, gun, spare, loose], 'aim')).toEqual({
      total: 3,
      parts: ['PKD-45+2', 'Custom grips+1'],
    });
    expect(attackKit([vest, gun, spare, loose], 'aim').total).toBe(4);
    expect(attackKit([vest, gun], 'aim').parts).toEqual(['Kevlar+1', 'PKD-45+2', 'Custom grips+1']);
    expect(attackKit([vest, gun], 'burst').parts).toEqual(['Kevlar+1', 'PKD-45+2']);
    const roll = localAttackRoll(hostilesFromRoom(room)[0]!, 2, attackKit([vest, gun], 'aim').total);
    expect(roll.bonuses).toBe(4);
    expect(roll.total).toBe(17);
  });
});
