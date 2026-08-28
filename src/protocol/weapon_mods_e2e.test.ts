import { describe, expect, it } from 'vitest';
import { applyGearAct, gearSub, isLooseMod, modAttachLine } from './gear';
import { attackKit, weaponLine } from './combat';
import { gearFromData } from './frames';
import type { GearItem } from './frames';

function item(partial: Partial<GearItem> & Pick<GearItem, 'name'>): GearItem {
  return {
    slug: partial.slug ?? partial.name.toLowerCase().replace(/\s+/g, '-'),
    slot: 'carried',
    load: 1,
    mods: '',
    use: false,
    kind: 'gear',
    ammo: null,
    fittings: [],
    ...partial,
  };
}

const gun = item({ name: 'PKD-45', kind: 'firearm', slot: 'wielded', bonus: 2, mag: 6, magMax: 8 });
const grips = item({
  name: 'Custom grips',
  slug: 'custom-grips',
  kind: 'mod',
  bonus: 1,
});
const link = item({ name: 'Smart-link', slug: 'smart-link', kind: 'mod' });

describe('weapon mods e2e', () => {
  it('attaches a loose mod onto the gun and drops it from the pack', () => {
    expect(isLooseMod(link)).toBe(true);
    expect(modAttachLine('pkd-45', link)).toBe('+gear/mod pkd-45=smart-link');
    const fitted = applyGearAct([gun, link, grips], 'mod', 'pkd-45', 'smart-link');
    expect(fitted.map((row) => row.slug)).toEqual(['pkd-45', 'custom-grips']);
    expect(fitted[0]?.fittings.map((fit) => fit.slug)).toEqual(['smart-link']);
  });

  it('shows fittings on the pack row and the combat gun row', () => {
    const fitted = applyGearAct([gun, link], 'mod', 'pkd-45', 'smart-link');
    const host = fitted[0]!;
    expect(gearSub(host)).toContain('Smart-link');
    expect(weaponLine(host).sub).toBe('Smart-link');
    expect(weaponLine(gun).sub).toBeUndefined();
  });

  it('parses fittings from a live gear frame, including a mods[] fallback', () => {
    const fromFit = gearFromData({
      items: [
        {
          name: 'PKD-45',
          slug: 'pkd-45',
          kind: 'firearm',
          slot: 'wielded',
          fittings: [{ slug: 'smart-link', name: 'Smart-link', bonus: 1, tags: ['shot'] }],
        },
      ],
    })?.items[0];
    expect(fromFit?.fittings).toEqual([
      { slug: 'smart-link', name: 'Smart-link', effect: '', bonus: 1, tags: ['shot'] },
    ]);
    const fromMods = gearFromData({
      items: [
        {
          name: 'PKD-45',
          slug: 'pkd-45',
          kind: 'firearm',
          mods: [{ slug: 'custom-grips', name: 'Custom grips', bonus: 1, tags: ['shot'] }],
        },
      ],
    })?.items[0];
    expect(fromMods?.fittings[0]?.slug).toBe('custom-grips');
    expect(weaponLine(fromFit).sub).toBe('Smart-link');
  });

  it('attack kit uses attached shot mods and ignores a loose leftover', () => {
    const fitted = applyGearAct(
      [
        {
          ...gun,
          fittings: [{ slug: 'custom-grips', name: 'Custom grips', effect: '', bonus: 1, tags: ['shot'] }],
        },
        grips,
      ],
      'mod',
      'pkd-45',
      'smart-link',
    );
    const kit = attackKit(fitted, 'aim');
    expect(kit.parts).toEqual(['PKD-45+2', 'Custom grips+1']);
    expect(kit.total).toBe(3);
    expect(attackKit(fitted, 'burst').parts).toEqual(['PKD-45+2']);
  });
});
