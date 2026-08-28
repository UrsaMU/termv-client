import { describe, expect, it } from 'vitest';
import { gearActFor, gearActions, gearCmd, gearItemRef, gearSub, isLooseAmmo, isLooseMod, modAttachLine, packAmmo, packMods } from './gear';

describe('gearActFor', () => {
  it('routes armor to wear, weapons to wield, things to use', () => {
    expect(gearActFor('armor')).toBe('wear');
    expect(gearActFor('firearm')).toBe('wield');
    expect(gearActFor('melee')).toBe('wield');
    expect(gearActFor('toolkit')).toBe('use');
  });

  it('infers from blank kind, mag, name, and current slot', () => {
    expect(gearActFor('', { magMax: 8 })).toBe('wield');
    expect(gearActFor('gear', { name: 'Charon pistol' })).toBe('wield');
    expect(gearActFor('gear', { name: 'Leathers' })).toBe('wear');
    expect(gearActFor('', { slot: 'wielded' })).toBe('wield');
    expect(gearActFor('', { slot: 'worn' })).toBe('wear');
    expect(gearActFor('firearms')).toBe('wield');
  });
});

describe('gearActions', () => {
  it('offers wield/stow on guns and use/drop/give on things', () => {
    expect(gearActions({ kind: 'firearm', slot: 'carried', use: false }).map((a) => a.id)).toEqual([
      'wield',
      'load',
      'mod',
      'drop',
      'give',
    ]);
    expect(
      gearActions(
        {
          kind: 'firearm',
          slot: 'wielded',
          use: false,
          ammo: { slug: 'hellfires', name: 'Hellfires' },
          fittings: [{ slug: 'smart-link' }],
        },
        [{ kind: 'ammo' }, { kind: 'mod' }],
      ).map((a) => a.id),
    ).toEqual(['stow', 'unload', 'load', 'mod', 'unmod', 'drop', 'give']);
    expect(gearActions({ kind: 'firearm', slot: 'wielded', use: false }).map((a) => a.id)).toEqual([
      'stow',
      'load',
      'mod',
      'drop',
      'give',
    ]);
    expect(gearActions({ kind: 'armor', slot: 'carried', use: false }).map((a) => a.id)).toEqual([
      'wear',
      'drop',
      'give',
    ]);
    expect(gearActions({ kind: 'general', slot: 'carried', use: false }).map((a) => a.id)).toEqual([
      'use',
      'drop',
      'give',
    ]);
    expect(gearActions({ kind: 'melee', slot: 'carried', use: true }).map((a) => a.id)).toEqual([
      'wield',
      'use',
      'mod',
      'drop',
      'give',
    ]);
    expect(
      gearActions(
        { kind: 'gear', slot: 'wielded', use: false, magMax: 8, ammo: { slug: 'hellfires', name: 'Hellfires' } },
        [{ kind: 'ammo' }],
      ).map((a) => a.id),
    ).toEqual(['stow', 'unload', 'load', 'mod', 'drop', 'give']);
    expect(
      gearActions({ kind: '', slot: 'carried', use: false, name: 'PKD-45', magMax: 8 }).map((a) => a.id),
    ).toEqual(['wield', 'load', 'mod', 'drop', 'give']);
    expect(
      gearActions({ kind: 'gear', slot: 'carried', use: false, name: 'Armour vest' }).map((a) => a.id),
    ).toEqual(['wear', 'drop', 'give']);
    expect(
      gearActions(
        { kind: 'gear', slot: 'carried', use: false, name: 'PKD-45', magMax: 8 },
        [{ kind: 'gear', slug: 'smart-link', name: 'Smart-link' }],
      ).map((a) => a.id),
    ).toEqual(['wield', 'load', 'mod', 'drop', 'give']);
    expect(
      gearActions({ kind: 'ammo', slot: 'carried', use: false, name: 'Hellfires', slug: 'hellfires' }).map(
        (a) => a.id,
      ),
    ).toEqual(['use', 'load', 'drop', 'give']);
    expect(
      gearActions({ kind: 'ammo', slot: 'carried', use: false, name: 'Hellfires' }).find((a) => a.id === 'load')
        ?.label,
    ).toBe('LOAD ONTO');
  });
});

describe('pack filters', () => {
  it('pulls loose ammo and mods out of the pack', () => {
    const pack = [
      { kind: 'firearm' },
      { kind: 'ammo' },
      { kind: 'mod' },
      { kind: 'armor' },
    ];
    expect(packAmmo(pack)).toEqual([{ kind: 'ammo' }]);
    expect(packMods(pack)).toEqual([{ kind: 'mod' }]);
    expect(isLooseAmmo({ kind: 'gear', slug: 'hellfires', name: 'Hellfires' })).toBe(true);
    expect(isLooseAmmo({ kind: 'firearm', name: 'PKD-45', magMax: 8 })).toBe(false);
    expect(packAmmo([{ kind: 'gear', slug: 'hellfires', name: 'Hellfires' }])).toHaveLength(1);
    expect(isLooseMod({ kind: 'gear', slug: 'smart-link', name: 'Smart-link' })).toBe(true);
    expect(isLooseMod({ kind: 'gear', slug: 'smart-targeting', name: 'Smart targeting' })).toBe(true);
    expect(isLooseMod({ kind: 'gear', slug: 'toolkit', name: 'Toolkit' })).toBe(false);
  });
});

describe('gearSub', () => {
  it('lists mag, chambered ammo, and fitted mods', () => {
    expect(
      gearSub({
        kind: 'firearm',
        mods: '+1',
        mag: 5,
        magMax: 8,
        ammo: { name: 'Hellfires' },
        fittings: [{ name: 'Smart targeting system' }],
      }),
    ).toBe('5/8 · Hellfires · Smart targeting system · +1');
  });
});

describe('gearItemRef', () => {
  it('uses 1-based pack index so wear/wield hit the same thing as inv', () => {
    const pack = [
      { name: 'Leathers', slug: 'leathers' },
      { name: 'PKD-45', slug: 'pkd-45' },
    ];
    expect(gearItemRef(pack[1], pack)).toBe('pkd-45');
    expect(gearItemRef(pack[0], pack)).toBe('leathers');
    expect(gearItemRef({ name: 'PKD-45', slug: 'pkd-45' })).toBe('pkd-45');
    expect(gearItemRef({ slug: 'pkd-45' })).toBe('pkd-45');
    expect(gearItemRef({ name: 'PKD-45' })).toBe('PKD-45');
  });
});

describe('gearCmd', () => {
  it('builds wear/wield/use/drop/give lines', () => {
    expect(gearCmd('wield', 'PKD-45')).toBe('+wield PKD-45');
    expect(gearCmd('wear', 'vest')).toBe('+wear vest');
    expect(gearCmd('stow', 'vest')).toBe('+stow vest');
    expect(gearCmd('use', 'toolkit')).toBe('use toolkit');
    expect(gearCmd('drop', 'katana')).toBe('drop katana');
    expect(gearCmd('give', 'katana', 'Alice')).toBe('give katana=Alice');
    expect(gearCmd('give', 'katana', '')).toBe('');
    expect(gearCmd('use', '')).toBe('');
    expect(gearCmd('load', 'PKD-45', 'hellfires')).toBe('+gear/load PKD-45=hellfires');
    expect(gearCmd('unload', 'PKD-45')).toBe('+gear/unload PKD-45');
    expect(gearCmd('mod', 'PKD-45', 'smart-link')).toBe('+gear/mod PKD-45=smart-link');
    expect(modAttachLine('PKD-45', { slug: 'smart-targeting', name: 'Smart-link' })).toBe(
      '+gear/mod PKD-45=smart-targeting',
    );
    expect(gearCmd('unmod', 'PKD-45', 'smart-link')).toBe('+gear/unmod PKD-45=smart-link');
  });
});
