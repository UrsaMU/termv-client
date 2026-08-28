export function sceneShouldOpen(kind: 'scene' | 'target'): boolean {
  return kind === 'scene';
}

export function sceneShouldShut(scrollTop: number, lastTop: number, threshold = 40): boolean {
  return scrollTop > threshold && scrollTop > lastTop;
}

export const SCENE_SYNC_MS = 900;

export function sceneHeadMark(syncing: boolean): 'SYNC' | 'SCENE' {
  return syncing ? 'SYNC' : 'SCENE';
}

export function sceneFromSwipe(dy: number, slop = 28): 'open' | 'shut' | 'tap' {
  if (dy > slop) return 'open';
  if (dy < -slop) return 'shut';
  return 'tap';
}

export function overflowEdges(
  el: { scrollTop: number; clientHeight: number; scrollHeight: number },
  slop = 2,
): { above: boolean; below: boolean } {
  return {
    above: el.scrollTop > slop,
    below: el.scrollTop + el.clientHeight < el.scrollHeight - slop,
  };
}

export function rosterMoreMark(open: boolean, below: boolean): string {
  if (!open) return '▾';
  return below ? 'MORE ▾' : '▴';
}
