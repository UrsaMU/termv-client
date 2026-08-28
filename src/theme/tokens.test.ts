import { describe, expect, it } from 'vitest';
import { goon, PALETTE, palettes, termv } from './tokens';

describe('palettes', () => {
  it('termv and goon share the same token keys', () => {
    expect(Object.keys(termv)).toEqual(Object.keys(goon));
  });

  it('active palette is a known pack', () => {
    expect(palettes[PALETTE]).toBeDefined();
  });
});
