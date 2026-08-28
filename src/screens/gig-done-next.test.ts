import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));

describe('GigDone session director', () => {
  it('offers MARKET HAUNTS MAP NEXT GIG after payout', () => {
    const src = readFileSync(join(dir, 'GigDone.tsx'), 'utf8');
    expect(src).toMatch(/id: 'market'/);
    expect(src).toMatch(/id: 'haunts'/);
    expect(src).toMatch(/id: 'map'/);
    expect(src).toMatch(/id: 'gig'/);
    expect(src).toMatch(/NEXT GIG/);
    expect(src).toMatch(/nav\('\/market'\)/);
    expect(src).toMatch(/nav\('\/haunts'\)/);
    expect(src).toMatch(/nav\('\/haunts'\)/);
    expect(src).toMatch(/nav\('\/map'\)/);
    expect(src).toMatch(/nav\('\/gig'\)/);
    expect(src).toMatch(/nextHint/);
  });
});
