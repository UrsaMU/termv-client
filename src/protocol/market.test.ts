import { describe, expect, it } from 'vitest';
import {
  canAfford,
  filterMarket,
  marketBuyLine,
  marketCatOf,
  marketInfoLine,
  marketKindLabel,
  marketTabOf,
  marketListLine,
  marketDescribe,
  marketStockOk,
} from './market';

const stock = [
  { slug: 'pkd', name: 'PKD-45', category: 'firearm' },
  { slug: 'katana', name: 'Carbon Steel Katana', category: 'melee' },
  { slug: 'vest', name: 'Synth vest', category: 'armor' },
  { slug: 'hyperion', name: 'Hyperion', category: 'console' },
];

describe('marketCatOf', () => {
  it('maps street names onto catalog keys', () => {
    expect(marketCatOf('guns').id).toBe('firearm');
    expect(marketCatOf('CHROME').id).toBe('augmentation');
    expect(marketCatOf('decks').id).toBe('console');
    expect(marketCatOf('')).toEqual(expect.objectContaining({ id: 'all' }));
    expect(marketCatOf('nope').id).toBe('all');
  });
});

describe('filterMarket', () => {
  it('filters by category, street tab, and search', () => {
    expect(marketTabOf('firearm')).toBe('GUNS');
    expect(marketTabOf('melee')).toBe('MELEE');
    expect(marketTabOf('console')).toBe('DECKS');
    expect(marketKindLabel({ category: 'melee', kind: 'melee' })).toBe('MELEE');
    expect(marketKindLabel({ category: 'firearm', kind: 'firearm' })).toBe('GUNS');
    expect(filterMarket(stock, 'firearm').map((row) => row.slug)).toEqual(['pkd']);
    expect(filterMarket(stock, 'GUNS').map((row) => row.slug)).toEqual(['pkd']);
    expect(filterMarket(stock, 'MELEE').map((row) => row.slug)).toEqual(['katana']);
    expect(filterMarket(stock, 'DECKS').map((row) => row.slug)).toEqual(['hyperion']);
    expect(filterMarket(stock, 'all', 'hyper').map((row) => row.slug)).toEqual(['hyperion']);
    expect(filterMarket(stock, 'armor', 'pkd')).toEqual([]);
  });
});

describe('command lines', () => {
  it('builds +market browse / info / buy', () => {
    expect(marketListLine('')).toBe('+market');
    expect(marketListLine('guns')).toBe('+market firearm');
    expect(marketBuyLine('pkd')).toBe('+market/buy pkd');
    expect(marketBuyLine('pkd', 3)).toBe('+market/buy pkd=3');
    expect(marketBuyLine('')).toBe('');
    expect(marketInfoLine('vest')).toBe('+market/info vest');
  });
});

describe('marketDescribe', () => {
  it('keeps catalog copy and invents a line when the row is mute', () => {
    expect(marketDescribe({ name: 'PKD-45', blurb: 'Police special.' })).toBe('Police special.');
    expect(marketDescribe({ name: 'Charon® PKD-45', category: 'firearm', bonus: 1, rangeM: 50 })).toBe(
      'Charon PKD-45. Street iron · +1 · 50 m.',
    );
    expect(marketDescribe({ name: 'Toolkit', category: 'general' })).toBe(
      'Toolkit. Street kit. Keep it stowed.',
    );
    expect(marketDescribe({ name: 'Hyperdex', kind: 'drug' })).toBe('Hyperdex. A dose for the night.');
  });
});

describe('canAfford', () => {
  it('needs cash for the full stack and treats blank stock as on the shelf', () => {
    expect(canAfford(400, 200, 2)).toBe(true);
    expect(canAfford(300, 200, 2)).toBe(false);
    expect(marketStockOk('ok')).toBe(true);
    expect(marketStockOk('')).toBe(true);
    expect(marketStockOk('hold')).toBe(false);
  });
});
