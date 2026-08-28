import type { GigPayload } from './frames';

export type GigBeat = 'pull' | 'enter' | 'run' | 'advance' | 'turnin' | 'done';

export type GigSlab = {
  label: string;
  send: string;
};

/** Street never grows a pull slab. `/gig` opens the desk. */
export function gigBeat(gig: GigPayload | null | undefined): GigBeat {
  if (!gig) return 'pull';
  if (gig.status === 'complete') return 'done';
  if (gig.token || gig.status === 'token') return 'turnin';
  if (gig.status === 'left' || !gig.onSite) return 'enter';
  // Mid-run: room clear → player must push / take Deeper
  if (gig.canAdvance === true || (gig.nodeCleared && !isFinalNode(gig))) {
    return 'advance';
  }
  return 'run';
}

function isFinalNode(gig: GigPayload): boolean {
  return (gig.node || 1) >= (gig.nodesMax || 1);
}

export function gigSlab(_beat: GigBeat): GigSlab | null {
  return null;
}

export function gigDeskActs(beat: GigBeat): Array<{ label: string; send: string; sub?: string }> {
  if (beat === 'pull') return [{ label: 'PULL CONTRACT', send: '+gig', sub: 'ROLL A STREET JOB' }];
  if (beat === 'enter') {
    return [
      { label: 'DROP IN', send: '+gig/enter', sub: 'PRIVATE SITE' },
      { label: 'ABANDON', send: '+gig/abandon', sub: 'NO PAY' },
    ];
  }
  if (beat === 'advance') {
    return [
      { label: 'GO DEEPER ▸', send: '+gig/push', sub: 'NEXT NODE' },
      { label: 'LEAVE SITE', send: '+gig/leave' },
      { label: 'ABANDON', send: '+gig/abandon', sub: 'NO PAY' },
    ];
  }
  if (beat === 'turnin') {
    return [
      { label: 'TURN IN ▸ CASH OUT', send: '+gig/turnin' },
      { label: 'LEAVE SITE', send: '+gig/leave' },
      { label: 'ABANDON', send: '+gig/abandon', sub: 'NO PAY' },
    ];
  }
  if (beat === 'run') {
    return [
      { label: 'LEAVE SITE', send: '+gig/leave' },
      { label: 'ABANDON', send: '+gig/abandon', sub: 'NO PAY' },
    ];
  }
  return [];
}

export function gigBarCopy(gig: GigPayload): { title: string; sub: string } {
  const node = `${gig.node}/${gig.nodesMax}`;
  const room = gig.roomName || gig.venueName || 'SITE';
  const beat = gigBeat(gig);
  if (beat === 'turnin') {
    return {
      title: gig.title || 'CONTRACT',
      sub: `TARGET SECURED · ${gig.targetName || 'token'} · ${node}`,
    };
  }
  if (beat === 'advance') {
    return {
      title: gig.title || 'CONTRACT',
      sub: gig.nextHint || `NODE CLEAR · GO DEEPER · ${node}`,
    };
  }
  if (gig.nextHint && beat === 'run') {
    return {
      title: gig.title || 'CONTRACT',
      sub: `${gig.nextHint} · ${node}`,
    };
  }
  return {
    title: gig.title || 'CONTRACT',
    sub: `${room} · ${node}${gig.objective ? ` · ${gig.objective}` : ''}`,
  };
}
