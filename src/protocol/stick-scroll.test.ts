import { describe, expect, it } from 'vitest';
import { nearBottom, pinToTail } from './stick-scroll';

describe('nearBottom', () => {
  it('is stuck when the pane cannot scroll', () => {
    expect(nearBottom(0, 200, 400)).toBe(true);
  });

  it('is stuck at the tail and loose once you scroll up', () => {
    expect(nearBottom(760, 1000, 240)).toBe(true);
    expect(nearBottom(752, 1000, 240)).toBe(true);
    expect(nearBottom(200, 1000, 240)).toBe(false);
    expect(nearBottom(0, 1000, 240)).toBe(false);
  });
});

describe('pinToTail', () => {
  it('street and input logs always follow new output', () => {
    expect(pinToTail(true, 0, 1000, 240)).toBe(true);
    expect(pinToTail(true, 200, 1000, 240)).toBe(true);
    expect(pinToTail(true, 0, 200, 400)).toBe(true);
  });

  it('a thing look (down NPC) is more street output — still pinned', () => {
    expect(pinToTail(true, 0, 1800, 240)).toBe(true);
  });

  it('browse panes still unstick once you scroll up', () => {
    expect(pinToTail(false, 760, 1000, 240)).toBe(true);
    expect(pinToTail(false, 200, 1000, 240)).toBe(false);
  });
});
