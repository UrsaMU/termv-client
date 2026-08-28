import { describe, expect, it } from 'vitest';
import {
  applyGearAct,
  gearActions,
  gearCmd,
  gearItemRef,
  isLooseAmmo,
  isLooseMod,
  modAttachLine,
  packAmmo,
} from './gear';
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

describe('inventory wear / wield / mod e2e', () => {
  const vest = item({ name: 'Leathers', kind: 'armor' });
  const gun = item({ name: 'PKD-45', kind: 'firearm', mag: 6, magMax: 8 });
  const link = item({ name: 'Smart-link', slug: 'smart-link', kind: 'mod' });

  it('wear puts armor on, wield puts the gun in hand, stow returns it', () => {
    const pack = [vest, gun, link];
    const worn = applyGearAct(pack, 'wear', gearItemRef(vest, pack));
    expect(worn.find((row) => row.name === 'Leathers')?.slot).toBe('worn');
    const armed = applyGearAct(worn, 'wield', gearItemRef(gun, worn));
    expect(armed.find((row) => row.name === 'PKD-45')?.slot).toBe('wielded');
    const stowed = applyGearAct(armed, 'stow', '#2');
    expect(stowed.find((row) => row.name === 'PKD-45')?.slot).toBe('carried');
  });

  it('wielding a second gun holsters the first', () => {
    const other = item({ name: 'Charon', kind: 'firearm', magMax: 8 });
    const pack = applyGearAct([gun, other], 'wield', 'PKD-45');
    const next = applyGearAct(pack, 'wield', 'Charon');
    expect(next.find((row) => row.name === 'Charon')?.slot).toBe('wielded');
    expect(next.find((row) => row.name === 'PKD-45')?.slot).toBe('carried');
  });

  it('mod attaches a loose smart-link onto the host and pulls it from the pack', () => {
    expect(isLooseMod(link)).toBe(true);
    const pack = [gun, link];
    const line = modAttachLine(gearItemRef(gun, pack), link);
    expect(line).toBe('+gear/mod pkd-45=smart-link');
    const fitted = applyGearAct(pack, 'mod', '#1', 'smart-link');
    expect(fitted).toHaveLength(1);
    expect(fitted[0]?.fittings).toEqual([{ slug: 'smart-link', name: 'Smart-link', effect: '', tags: [] }]);
    const bare = applyGearAct(fitted, 'unmod', 'PKD-45', 'smart-link');
    expect(bare[0]?.fittings).toEqual([]);
  });

  it('item sheet offers wear / wield / mod in pack order', () => {
    expect(gearActions(vest).map((act) => act.id)).toEqual(['wear', 'drop', 'give']);
    expect(gearActions(gun, [link]).map((act) => act.id)).toEqual(['wield', 'load', 'mod', 'drop', 'give']);
    expect(gearCmd('wear', 'leathers')).toBe('+wear leathers');
    expect(gearCmd('wield', 'pkd-45')).toBe('+wield pkd-45');
  });

  it('load chambers specialty ammo onto the gun and pulls the box', () => {
    const box = item({ name: 'Hellfires', slug: 'hellfires', kind: 'ammo' });
    const ghost = item({ name: 'Hellfires', slug: 'hellfires', kind: 'gear' });
    expect(isLooseAmmo(box)).toBe(true);
    expect(isLooseAmmo(ghost)).toBe(true);
    expect(packAmmo([gun, ghost]).map((row) => row.slug)).toEqual(['hellfires']);
    expect(gearActions(gun).map((act) => act.id)).toContain('load');
    expect(gearCmd('load', 'pkd-45', 'hellfires')).toBe('+gear/load pkd-45=hellfires');
    const loaded = applyGearAct([gun, box], 'load', 'pkd-45', 'hellfires');
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.ammo).toEqual({ slug: 'hellfires', name: 'Hellfires' });
    expect(loaded[0]?.mag).toBe(8);
  });
});
