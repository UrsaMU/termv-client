export const INPUT_MIN_PX = 44;
export const INPUT_LINE_PX = 20;
export const INPUT_PAD_PX = 24;
export const INPUT_MAX_ROWS = 6;
export const CMD_HISTORY_CAP = 50;

export function growInputHeight(scrollHeight: number): number {
  const max = INPUT_PAD_PX + INPUT_LINE_PX * INPUT_MAX_ROWS;
  return Math.max(INPUT_MIN_PX, Math.min(max, scrollHeight));
}

export function rememberCmd(line: string, hist: string[]): string[] {
  const t = line.trim();
  if (!t) return hist;
  if (hist[0] === t) return hist;
  return [t, ...hist.filter((row) => row !== t)].slice(0, CMD_HISTORY_CAP);
}

/** -1 is the live draft. dir 1 (ArrowUp) is older. */
export function stepHistoryIndex(len: number, index: number, dir: 1 | -1): number {
  if (len <= 0) return -1;
  const next = index + dir;
  if (next < -1) return -1;
  if (next >= len) return len - 1;
  return next;
}

let remembered: string[] = [];

export function rememberedCmds(): string[] {
  return remembered;
}

export function pushRemembered(line: string): string[] {
  remembered = rememberCmd(line, remembered);
  return remembered;
}

export function resetRemembered(): void {
  remembered = [];
}

/** Tab with nothing focused should land in the street box, not the first button. */
export function tabTargetsStreet(active: object | null, body: object, root: object): boolean {
  if (!active) return true;
  return active === body || active === root;
}
