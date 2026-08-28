import { describe, expect, it } from 'vitest';
import { clockStamp, formatCash, formatHeat, nowrap } from './format';

describe('formatCash', () => {
  it('keeps small amounts whole', () => {
    expect(formatCash(180)).toBe('180 b¥');
    expect(formatCash(0)).toBe('0 b¥');
  });

  it('shortens thousands the way the status bar does', () => {
    expect(formatCash(2140)).toBe('2.1k b¥');
    expect(formatCash(1000)).toBe('1k b¥');
    expect(formatCash(1960)).toBe('2k b¥');
  });

  it('handles millions and negatives', () => {
    expect(formatCash(2_400_000)).toBe('2.4m b¥');
    expect(formatCash(-2140)).toBe('-2.1k b¥');
  });
});

describe('formatHeat', () => {
  it('never goes below zero', () => {
    expect(formatHeat(-3)).toBe('HEAT 0');
    expect(formatHeat(4.6)).toBe('HEAT 5');
  });
});

describe('clockStamp', () => {
  it('is HH:MM', () => {
    expect(clockStamp(new Date('2026-08-24T13:07:09'))).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe('nowrap', () => {
  it('shortens instead of wrapping', () => {
    expect(nowrap('HALOGEN HEIGHTS SKYBRIDGE', 12)).toBe('HALOGEN HEI…');
    expect(nowrap('APEX', 12)).toBe('APEX');
  });
});
