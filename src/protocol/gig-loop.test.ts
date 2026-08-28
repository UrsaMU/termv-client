import { describe, expect, it } from 'vitest';
import { gigBarCopy, gigBeat, gigDeskActs, gigSlab } from './gig-loop';
import type { GigPayload } from './frames';

function gig(partial: Partial<GigPayload> = {}): GigPayload {
  return {
    id: 'g1',
    title: 'CRADLE LIFT',
    blurb: '',
    tier: 'mod',
    objective: 'recover',
    venueName: 'Harbor Keys',
    bossName: 'Foreman',
    bossDs: 12,
    targetName: 'crate',
    node: 1,
    nodesMax: 3,
    roomName: 'BAY',
    roomDesc: '',
    payoutMult: 1,
    returnRoomId: '1',
    nodeCleared: false,
    status: 'active',
    token: false,
    onSite: false,
    payoutBy: 0,
    payoutAp: 0,
    ...partial,
  };
}

describe('gigBeat', () => {
  it('is pull → enter → run → advance → turnin → done', () => {
    expect(gigBeat(null)).toBe('pull');
    expect(gigSlab('pull')).toBeNull();
    expect(gigDeskActs('pull').map((row) => row.send)).toEqual(['+gig']);
    expect(gigBeat(gig())).toBe('enter');
    expect(gigBeat(gig({ onSite: true }))).toBe('run');
    expect(gigBeat(gig({ onSite: true, nodeCleared: true, canAdvance: true }))).toBe(
      'advance',
    );
    expect(gigDeskActs('advance').map((row) => row.send)).toEqual([
      '+gig/push',
      '+gig/leave',
      '+gig/abandon',
    ]);
    expect(gigBeat(gig({ onSite: true, token: true }))).toBe('turnin');
    expect(gigBeat(gig({ status: 'complete', payoutBy: 250, payoutAp: 6 }))).toBe(
      'done',
    );
  });

  it('does not advance on final node just because cleared', () => {
    expect(
      gigBeat(
        gig({
          onSite: true,
          node: 3,
          nodesMax: 3,
          nodeCleared: true,
          canAdvance: false,
        }),
      ),
    ).toBe('run');
  });
});

describe('gigBarCopy', () => {
  it('names the contract and the current room', () => {
    expect(gigBarCopy(gig({ onSite: true }))).toEqual({
      title: 'CRADLE LIFT',
      sub: 'BAY · 1/3 · recover',
    });
  });

  it('flags node clear on the bar', () => {
    const bar = gigBarCopy(
      gig({
        onSite: true,
        nodeCleared: true,
        canAdvance: true,
        nextHint: 'NODE CLEAR — GO DEEPER (+gig/push)',
      }),
    );
    expect(bar.sub).toMatch(/NODE CLEAR|GO DEEPER/i);
  });
});
