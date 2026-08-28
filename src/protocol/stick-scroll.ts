export const STICK_SLOP_PX = 48;

export function nearBottom(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
  slop = STICK_SLOP_PX,
): boolean {
  if (scrollHeight <= clientHeight) return true;
  return scrollHeight - scrollTop - clientHeight <= slop;
}

export function pinToTail(
  tail: boolean,
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
  slop = STICK_SLOP_PX,
): boolean {
  if (tail) return true;
  return nearBottom(scrollTop, scrollHeight, clientHeight, slop);
}
