import { describe, expect, it } from 'vitest';
import { parseLootLine, parsePayoutText, payoutFromData, payoutNotice } from './reward';

describe('payout parse', () => {
  it('reads a kill LOOT line', () => {
    expect(parseLootLine('LOOT +120 b¥ · +5 AP (Cop)')).toEqual({
      kind: 'kill',
      label: 'Cop',
      bityuan: 120,
      ap: 5,
    });
  });

  it('reads gig cash+AP', () => {
    expect(parsePayoutText('+250 b¥ · +6 AP', 'gig')).toMatchObject({
      kind: 'gig',
      bityuan: 250,
      ap: 6,
    });
  });

  it('builds a notice', () => {
    const n = payoutNotice({ kind: 'kill', label: 'Cop', bityuan: 40, ap: 2 });
    expect(n.title).toBe('COP');
    expect(n.body).toContain('40');
  });

  it('reads a payout frame', () => {
    expect(payoutFromData({ kind: 'gig', label: 'Job', bityuan: 100, ap: 4 })).toEqual({
      kind: 'gig',
      label: 'Job',
      bityuan: 100,
      ap: 4,
    });
  });
});
