import { describe, expect, it } from 'vitest';
import {
  overflowEdges,
  rosterMoreMark,
  sceneFromSwipe,
  sceneHeadMark,
  sceneShouldOpen,
  sceneShouldShut,
} from './scene';

describe('sceneShouldOpen', () => {
  it('opens on a room look, not a target look', () => {
    expect(sceneShouldOpen('scene')).toBe(true);
    expect(sceneShouldOpen('target')).toBe(false);
  });
});

describe('sceneShouldShut', () => {
  it('shuts once the feed is scrolled down', () => {
    expect(sceneShouldShut(8, 0)).toBe(false);
    expect(sceneShouldShut(48, 12)).toBe(true);
    expect(sceneShouldShut(80, 90)).toBe(false);
  });
});

describe('sceneHeadMark', () => {
  it('flashes SYNC only while the scene is catching a look', () => {
    expect(sceneHeadMark(false)).toBe('SCENE');
    expect(sceneHeadMark(true)).toBe('SYNC');
  });
});

describe('sceneFromSwipe', () => {
  it('pulls the scene down, pushes it up', () => {
    expect(sceneFromSwipe(40)).toBe('open');
    expect(sceneFromSwipe(-40)).toBe('shut');
    expect(sceneFromSwipe(4)).toBe('tap');
  });
});

describe('overflowEdges', () => {
  it('flags more above and below without treating a flush list as overflow', () => {
    expect(overflowEdges({ scrollTop: 0, clientHeight: 200, scrollHeight: 200 })).toEqual({
      above: false,
      below: false,
    });
    expect(overflowEdges({ scrollTop: 0, clientHeight: 200, scrollHeight: 400 })).toEqual({
      above: false,
      below: true,
    });
    expect(overflowEdges({ scrollTop: 80, clientHeight: 200, scrollHeight: 400 })).toEqual({
      above: true,
      below: true,
    });
    expect(overflowEdges({ scrollTop: 200, clientHeight: 200, scrollHeight: 400 })).toEqual({
      above: true,
      below: false,
    });
  });
});

describe('rosterMoreMark', () => {
  it('reads as MORE while the here list still has things below', () => {
    expect(rosterMoreMark(false, true)).toBe('▾');
    expect(rosterMoreMark(true, true)).toBe('MORE ▾');
    expect(rosterMoreMark(true, false)).toBe('▴');
  });
});
