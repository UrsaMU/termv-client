import { describe, expect, it } from 'vitest';
import {
  activityHint,
  activityKeyFor,
  activityTotal,
  awayActivity,
  clearActivity,
  emptyActivity,
  markIfAway,
  tabActivity,
} from './activity';

describe('activityKeyFor', () => {
  it('maps routes onto menu slots', () => {
    expect(activityKeyFor('/play')).toBe('street');
    expect(activityKeyFor('/combat')).toBe('street');
    expect(activityKeyFor('/console')).toBe('console');
    expect(activityKeyFor('/comms')).toBe('comms');
    expect(activityKeyFor('/staff')).toBe('staff');
    expect(activityKeyFor('/deck')).toBe('deck');
    expect(activityKeyFor('/sheet')).toBe('sheet');
    expect(activityKeyFor('/inventory')).toBe('inventory');
    expect(activityKeyFor('/market')).toBe('market');
    expect(activityKeyFor('/chargen')).toBeNull();
  });
});

describe('markIfAway', () => {
  it('counts only when that screen is not open', () => {
    const idle = emptyActivity();
    expect(markIfAway(idle, 'comms', '/play').comms).toBe(1);
    expect(markIfAway(idle, 'comms', '/comms')).toBe(idle);
    const marked = markIfAway(idle, 'street', '/market');
    expect(tabActivity('/play', marked)).toBe(1);
    expect(activityHint('SCENE', 1)).toBe('1');
    expect(activityHint('SCENE', 12)).toBe('9+');
    expect(activityTotal(clearActivity(marked, 'street'))).toBe(0);
  });

  it('ignores the open screen when lighting the dock', () => {
    const marked = markIfAway(emptyActivity(), 'inventory', '/play');
    expect(awayActivity(marked, '/play')).toBe(1);
    expect(awayActivity(marked, '/inventory')).toBe(0);
  });
});
