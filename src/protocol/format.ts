export function formatCash(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0;
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    return `${sign}${trimDec(abs / 1_000_000)}m b¥`;
  }
  if (abs >= 1_000) {
    return `${sign}${trimDec(abs / 1_000)}k b¥`;
  }
  return `${sign}${abs} b¥`;
}

function trimDec(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function formatHeat(heat: number): string {
  return `HEAT ${Math.max(0, Math.round(heat))}`;
}

export function clockStamp(now = new Date()): string {
  return now.toTimeString().slice(0, 5);
}

export function nowrap(value: string, max = 18): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(1, max - 1))}…`;
}
