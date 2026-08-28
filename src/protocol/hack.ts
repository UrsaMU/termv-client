import type { EntityRow, RoomView } from './look';

export type HackLockRow = {
  id?: string;
  name: string;
  slug: string;
  ds: number;
  locked: boolean;
};

const DS_RE = /\bDS\s*(\d+)/i;

function dsFromBlob(blob: string): number | null {
  const hit = blob.match(DS_RE);
  if (!hit) return null;
  const n = Number(hit[1]);
  return Number.isFinite(n) && n >= 1 ? n : null;
}

function isLockBlob(blob: string): boolean {
  return /\block/i.test(blob);
}

function rowToLock(row: EntityRow): HackLockRow | null {
  const blob = `${row.flag} ${row.sub} ${row.idle} ${row.label}`;
  if (!isLockBlob(blob) && !DS_RE.test(row.flag) && !DS_RE.test(row.sub)) return null;
  if (!isLockBlob(blob)) return null;
  const ds = dsFromBlob(blob) ?? 10;
  const name = row.label.replace(/\(#[0-9][0-9A-Za-z]*\)$/, '').trim();
  return {
    id: row.id,
    name,
    slug: row.id ? `#${row.id}` : name,
    ds,
    locked: !/\bopen\b/i.test(blob),
  };
}

export function hackLocksFromRoom(room: Pick<RoomView, 'stuff' | 'exits'>): HackLockRow[] {
  const out: HackLockRow[] = [];
  const seen = new Set<string>();
  const stuff = room.stuff ?? [];
  for (const row of stuff) {
    const lock = rowToLock(row);
    if (!lock) continue;
    const key = lock.id || lock.slug;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(lock);
  }
  for (const exit of room.exits ?? []) {
    const row: EntityRow = {
      label: exit.name,
      flag: exit.flag ?? '',
      sub: exit.sub ?? '',
      idle: '',
      cmd: exit.cmd,
      id: exit.id,
    };
    const lock = rowToLock(row);
    if (!lock) continue;
    const key = lock.id || lock.slug;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(lock);
  }
  return out;
}

export function lockCmd(ref: string, ds?: number): string {
  const who = ref.trim();
  if (!who) return '';
  if (ds != null && Number.isFinite(ds)) return `+lock ${who}=ds/${Math.floor(ds)}`;
  return `+lock ${who}`;
}

function dsArg(raw: string): number | undefined {
  const hit = raw.trim().match(/^(?:ds\/)?(\d+)$/i);
  if (!hit) return undefined;
  const n = Number(hit[1]);
  return Number.isFinite(n) && n >= 1 ? n : undefined;
}

/** `/lock north` relocks; `/lock north=ds/12` or `/lock north 12` sets DS. */
export function lockLine(arg: string): string {
  const extra = arg.trim();
  if (!extra) return '';
  const eq = extra.indexOf('=');
  if (eq > 0) {
    return lockCmd(extra.slice(0, eq).trim(), dsArg(extra.slice(eq + 1)));
  }
  const parts = extra.split(/\s+/);
  if (parts.length >= 2) {
    const ds = dsArg(parts.slice(1).join(' '));
    if (ds != null) return lockCmd(parts[0] ?? '', ds);
  }
  return lockCmd(extra);
}
