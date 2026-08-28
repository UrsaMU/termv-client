import { describe, expect, it } from 'vitest';
import type { SheetPayload } from './frames';
import {
  applyHeal,
  healActOf,
  healActs,
  healCmd,
  isHealVerb,
  isLazarusItem,
  packLazarus,
} from './heal';

const sheet = (partial: Partial<SheetPayload> = {}): SheetPayload => ({
  name: 'KESS',
  role: 'NODEJACKER',
  status: 'LIVE',
  stats: { morphology: 1, equilibrium: 1, reaction: 2, cognition: 1, affinity: 0 },
  resilience: 9,
  resilienceMax: 12,
  load: 2,
  loadMax: 10,
  cash: 400,
  ap: 0,
  apTotal: 0,
  level: 1,
  edge: '',
  background: '',
  quirks: [],
  affectations: [],
  note: '',
  augs: [],
  gear: [],
  critical: null,
  ...partial,
});

describe('heal commands', () => {
  it('maps acts onto the live plugin verbs', () => {
    expect(healCmd('aid')).toBe('+heal');
    expect(healCmd('rest')).toBe('+heal/rest');
    expect(healCmd('lazarus')).toBe('+lazarus');
    expect(healCmd('stabilize')).toBe('+stabilize');
    expect(healCmd('clinic')).toBe('+clinic');
    expect(healActOf('heal')).toBe('aid');
    expect(healActOf('heal-lazarus')).toBe('lazarus');
    expect(isHealVerb('lazarus')).toBe(true);
    expect(isHealVerb('attack')).toBe(false);
  });
});

describe('healActs', () => {
  it('offers field medicine when hurt, clinic when you can pay', () => {
    const ids = healActs(sheet(), [{ slug: 'lazarus-patches', name: 'Lazarus Patches' }]).filter((row) => row.ready).map((row) => row.id);
    expect(ids).toEqual(['aid', 'lazarus', 'rest', 'clinic']);
    expect(healActs(sheet({ resilience: 12 })).find((row) => row.id === 'aid')?.ready).toBe(false);
    expect(healActs(sheet({ critical: { location: 'torso', severity: 3, effect: 'bleed' } })).find((row) => row.id === 'aid')?.ready).toBe(false);
    expect(healActs(sheet({ critical: { location: 'torso', severity: 3, effect: 'bleed' } })).find((row) => row.id === 'stabilize')?.ready).toBe(true);
    expect(healActs(sheet({ cash: 20 })).find((row) => row.id === 'clinic')?.why).toMatch(/250/);
  });
});

describe('applyHeal', () => {
  const patch = {
    name: 'Lazarus Patches',
    slug: 'lazarus-patches',
    slot: 'carried',
    load: 1,
    mods: '',
    use: true,
    kind: 'consumable',
    ammo: null,
    fittings: [],
  };

  it('first aid rolls COG vs 10 and patches +2', () => {
    const hit = applyHeal('aid', sheet(), [], 1);
    expect(hit.roll?.success).toBe(true);
    expect(hit.sheet.resilience).toBe(11);
    expect(hit.fight.amount).toBe(2);
    const miss = applyHeal('aid', sheet(), [], -6);
    expect(miss.roll?.success).toBe(false);
    expect(miss.sheet.resilience).toBe(9);
    expect(applyHeal('aid', sheet({ critical: { location: 'torso', severity: 2, effect: 'bleed' } })).error).toMatch(/critical/i);
  });

  it('lazarus spends the book +3 when a blister is in the pack', () => {
    expect(isLazarusItem(patch)).toBe(true);
    expect(packLazarus([patch])).toHaveLength(1);
    expect(applyHeal('lazarus', sheet(), [patch]).sheet.resilience).toBe(12);
    expect(applyHeal('lazarus', sheet(), []).error).toMatch(/lazarus/i);
  });

  it('rest fills res, clinic pays 250 and clears a crit', () => {
    expect(applyHeal('rest', sheet()).sheet.resilience).toBe(12);
    const hurt = applyHeal('clinic', sheet({ critical: { location: 'torso', severity: 3, effect: 'bleed' }, resilience: 2 }));
    expect(hurt.sheet.resilience).toBe(12);
    expect(hurt.sheet.critical).toBeNull();
    expect(hurt.sheet.cash).toBe(150);
    expect(applyHeal('clinic', sheet({ cash: 10 })).error).toMatch(/250/);
  });
});
