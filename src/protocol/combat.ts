import type { EntityRow, ExamineView, RoomView } from './look';
import type { GearItem, RollPayload } from './frames';

export type RangeStance = 'close' | 'street' | 'break';
export type RangeBand = RangeStance;
export type FireMode = 'aim' | 'burst' | 'auto' | 'reload';
export type HostileKind = 'npc' | 'horde' | 'pc';

export type Hostile = {
  id?: string;
  name: string;
  slug: string;
  ds: number;
  dsMax: number;
  note: string;
  dead: boolean;
  horde: boolean;
  kind: HostileKind;
};

export const PB_M = 1;
export const STREET_M = 15;
export const RANGE_M = { close: PB_M, street: STREET_M, break: 51 } as const;

const DS_SUB = /\bDS\s*(\d+)(?:\s*\/\s*(\d+))?/i;

export function weaponRangeM(
  item: { kind?: string; slug?: string; name?: string; rangeM?: number } | null | undefined,
): number | null {
  if (!item) return null;
  if (item.rangeM != null && Number.isFinite(item.rangeM)) return item.rangeM;
  const blob = `${item.kind ?? ''} ${item.slug ?? ''} ${item.name ?? ''}`.toLowerCase();
  if (!/firearm|heavy|gun|pistol|rifle|smg|shotgun|sniper/.test(blob)) return null;
  if (/sniper|haunt|barrett|heavy|lmg|rpg/.test(blob)) return 1000;
  if (/rifle|assault|kr-16|g40/.test(blob)) return 300;
  if (/smg|leong|incinerator/.test(blob)) return 100;
  if (/handgun|pistol|revolver|shotgun|pkd|charon|12g/.test(blob)) return 50;
  if (/firearm|heavy|gun/.test(blob)) return 100;
  return null;
}

export function rangeMetres(
  stance: RangeStance,
  weaponMax: number | null = null,
): number {
  if (stance === 'close') return PB_M;
  if (stance === 'break') return Math.max((weaponMax ?? 50) + 1, 51);
  return STREET_M;
}

export function rangeStanceOf(
  metres: number | null | undefined,
  weaponMax: number | null = null,
): RangeStance {
  const m = Number(metres);
  if (!Number.isFinite(m) || m <= 5) return 'close';
  if (weaponMax != null && m > weaponMax) return 'break';
  if (m > 25 && weaponMax == null) return 'break';
  return 'street';
}

export function rangeBandOf(
  metres: number | null | undefined,
  weaponMax: number | null = null,
): RangeStance {
  return rangeStanceOf(metres, weaponMax);
}

export function rangeCmd(
  stance: RangeStance | 'back' | 'cover',
  weaponMax: number | null = null,
): string {
  const id: RangeStance = stance === 'back' ? 'break' : stance === 'cover' ? 'street' : stance;
  return `+range ${rangeMetres(id, weaponMax)}`;
}

export function rangeRulerPct(stance: RangeStance): number {
  if (stance === 'close') return 18;
  if (stance === 'street') return 52;
  return 88;
}

export type RangeMod = {
  stance: RangeStance;
  bonus: number;
  glitch: number;
  parts: string[];
};

export function rangeAttackMod(
  metres: number | null | undefined,
  weapon: { kind?: string; slug?: string; name?: string; rangeM?: number } | null | undefined,
): RangeMod {
  const max = weaponRangeM(weapon);
  const m = Number(metres);
  const engage = Number.isFinite(m) ? m : STREET_M;
  const stance = rangeStanceOf(engage, max);
  const parts = [`range ${engage}m`];
  let bonus = 0;
  let glitch = 0;
  if (stance === 'close') {
    bonus = 3;
    parts.push('pb+3');
  } else if (stance === 'break') {
    glitch = 1;
    parts.push('OOR glitch');
  }
  return { stance, bonus, glitch, parts };
}

export function fireModeCmd(mode: FireMode, target = ''): string {
  if (mode === 'reload') return '+reload';
  const who = target.trim();
  if (!who) return '';
  return `+attack/${mode} ${who}`;
}

export function attackCmd(target: string, mode: Exclude<FireMode, 'reload'> = 'aim'): string {
  const who = target.trim();
  if (!who) return '';
  return mode === 'aim' ? `+attack ${who}` : `+attack/${mode} ${who}`;
}

export function attackRef(hostile: Pick<Hostile, 'slug' | 'name' | 'id'>): string {
  return hostile.slug || hostile.name || (hostile.id ? `#${hostile.id}` : '');
}

export function attackReady(target: Hostile | null | undefined): boolean {
  return Boolean(target && !target.dead && target.ds > 0 && attackRef(target));
}

export function slugFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\(#[0-9][0-9A-Za-z]*\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function parseDsBlob(raw: string): { ds: number; dsMax: number; dead: boolean } | null {
  const text = raw.trim();
  if (!text) return null;
  const down = /\b(down|dead|ds0)\b/i.test(text);
  const hit = text.match(DS_SUB);
  if (!hit && !down) return null;
  const ds = hit ? Number(hit[1]) : 0;
  const dsMax = hit && hit[2] ? Number(hit[2]) : ds || 0;
  if (!Number.isFinite(ds)) return null;
  return { ds: down ? 0 : ds, dsMax: dsMax || ds, dead: down || ds <= 0 };
}

export function isHostileRow(row: Pick<EntityRow, 'flag' | 'sub' | 'label' | 'idle'>): boolean {
  const blob = `${row.flag} ${row.sub} ${row.idle} ${row.label}`;
  if (/\b(npc|hostile|antagonist|horde)\b/i.test(blob)) return true;
  return Boolean(parseDsBlob(blob));
}

export function hostileFromRow(row: EntityRow): Hostile | null {
  if (!isHostileRow(row)) return null;
  const parsed =
    parseDsBlob(`${row.flag} ${row.sub} ${row.idle}`) ??
    (/\bnpc\b/i.test(row.flag) ? { ds: 10, dsMax: 10, dead: false } : { ds: 0, dsMax: 0, dead: false });
  const name = row.label.replace(/\(#[0-9][0-9A-Za-z]*\)$/, '').trim();
  const horde = /\bhorde\b/i.test(`${row.label} ${row.sub} ${row.flag}`);
  return {
    id: row.id,
    name: name || row.label,
    slug: slugFromName(name || row.label),
    ds: parsed.ds,
    dsMax: parsed.dsMax || parsed.ds,
    note: row.sub || (horde ? 'damage drops members 1:1' : ''),
    dead: parsed.dead,
    horde,
    kind: horde ? 'horde' : /npc/i.test(row.flag) || parsed.dsMax > 0 ? 'npc' : 'pc',
  };
}

export function hostilesFromRoom(room: Pick<RoomView, 'people' | 'stuff'>): Hostile[] {
  const seen = new Set<string>();
  const out: Hostile[] = [];
  for (const row of [...room.people, ...room.stuff]) {
    const hostile = hostileFromRow(row);
    if (!hostile) continue;
    const key = hostile.id || hostile.slug || hostile.name;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(hostile);
  }
  return out;
}

export function overlayHostiles(room: Pick<RoomView, 'people' | 'stuff'>, target: Hostile | null | undefined): Hostile[] {
  const listed = hostilesFromRoom(room);
  if (!target) return listed;
  const hit = matchHostile(listed, target);
  if (!hit) return [target, ...listed];
  return listed.map((row) => (row === hit ? { ...row, ...target } : row));
}

export function matchHostile(list: Hostile[], ref: string | Hostile): Hostile | null {
  if (typeof ref !== 'string') {
    return (
      list.find((row) => row.id && ref.id && row.id === ref.id) ??
      list.find((row) => row.slug && ref.slug && row.slug === ref.slug) ??
      list.find((row) => row.name.toLowerCase() === ref.name.toLowerCase()) ??
      null
    );
  }
  const q = ref.trim().toLowerCase().replace(/^#/, '');
  if (!q) return null;
  return (
    list.find((row) => row.id === q) ??
    list.find((row) => row.slug === q) ??
    list.find((row) => row.name.toLowerCase() === q) ??
    list.find((row) => row.name.toLowerCase().includes(q) || row.slug.includes(q)) ??
    null
  );
}

export function applyAttackToHostile(target: Hostile, roll: Pick<RollPayload, 'success' | 'damageToTarget'>): Hostile {
  if (!roll.success || roll.damageToTarget <= 0) return target;
  const ds = Math.max(0, target.ds - roll.damageToTarget);
  return { ...target, ds, dead: ds <= 0, note: ds <= 0 ? 'DS0 DOWN' : target.note };
}

export function pickWielded(items: GearItem[]): GearItem | null {
  return (
    items.find((item) => item.slot === 'wielded') ??
    items.find((item) => /firearm|heavy|melee|weapon|gun/i.test(item.kind)) ??
    null
  );
}

export function weaponBonus(item: GearItem | null | undefined): number {
  return hostItemBonus(item);
}

function isWeaponItem(item: Pick<GearItem, 'kind' | 'magMax'>): boolean {
  return /firearm|heavy|melee|weapon|gun/i.test(item.kind) || item.magMax != null;
}

function isArmorItem(item: Pick<GearItem, 'kind' | 'name' | 'slug'>): boolean {
  return /armou?r|clothes|vest|leather/i.test(`${item.kind} ${item.name} ${item.slug}`);
}

export function attackTags(mode: FireMode | string): string[] {
  const m = String(mode ?? '').toLowerCase();
  if (m === 'aim') return ['aim'];
  if (m === 'burst') return ['burst'];
  if (m === 'auto') return ['auto'];
  return ['shot'];
}

/** Desk AIM still sends bare +attack, which the server tags as shot. */
export function kitTags(mode: FireMode | string): string[] {
  return mode === 'aim' ? ['shot'] : attackTags(mode);
}

export function hostItemBonus(item: GearItem | null | undefined): number {
  if (!item) return 0;
  const weapon = isWeaponItem(item);
  if (item.bonus != null && Number.isFinite(item.bonus)) {
    if (item.bonus === 0 && weapon) return 1;
    return Math.max(0, item.bonus);
  }
  return weapon ? 1 : 0;
}

export function fittingCounts(fit: { bonus?: number; tags?: string[] }, tags: string[]): boolean {
  const bonus = fit.bonus ?? 0;
  if (bonus <= 0) return false;
  const have = (fit.tags ?? []).map((tag) => tag.toLowerCase());
  if (!have.length) return true;
  return have.some((tag) => tags.includes(tag));
}

export function attackKit(
  items: GearItem[],
  mode: FireMode | string = 'aim',
): { total: number; parts: string[] } {
  const tags = kitTags(mode);
  const gun =
    items.find((item) => item.slot === 'wielded' && isWeaponItem(item)) ??
    items.find((item) => isWeaponItem(item)) ??
    null;
  const parts: string[] = [];
  let total = 0;
  for (const item of items) {
    const weapon = isWeaponItem(item);
    const armor = isArmorItem(item);
    if (weapon && gun && item !== gun) continue;
    if (armor && item.slot !== 'worn') continue;
    if (!weapon && !armor) continue;
    const host = hostItemBonus(item);
    if (host > 0) {
      total += host;
      parts.push(`${item.name}+${host}`);
    }
    if (!weapon) continue;
    for (const fit of item.fittings) {
      if (!fittingCounts(fit, tags)) continue;
      total += fit.bonus ?? 0;
      parts.push(`${fit.name}+${fit.bonus}`);
    }
  }
  return { total, parts };
}

export function weaponLine(item: GearItem | null | undefined): { name: string; right: string; sub?: string; bonus: number } {
  if (!item) return { name: 'UNARMED', right: 'MOR', bonus: 0 };
  const bonus = weaponBonus(item);
  const bits: string[] = [];
  if (bonus) bits.push(`${bonus > 0 ? '+' : ''}${bonus}`);
  if (item.magMax != null) bits.push(`${item.mag ?? 0} / ${item.magMax} rds`);
  else if (item.kind) bits.push(item.kind.toUpperCase());
  const fitted = (item.fittings ?? []).map((fit) => fit.name).filter(Boolean);
  return {
    name: item.name,
    right: bits.join(' · ') || item.kind.toUpperCase(),
    sub: fitted.length ? fitted.join(' · ') : undefined,
    bonus,
  };
}

export function hostileNote(target: Hostile): string {
  if (target.dead) return 'DS0 DOWN';
  if (target.horde) return target.note || 'damage drops members 1:1';
  return target.note || 'margin drops DS 1:1';
}

export type AttackAct = {
  label: string;
  right: string;
  mode: FireMode;
  target: string;
};

export function attackActs(target: Hostile, kitTotal = 0): AttackAct[] {
  if (!attackReady(target)) return [];
  const who = attackRef(target);
  const kit = kitTotal ? `REA +${kitTotal}` : 'REA';
  return [
    { label: 'AIM', right: kit, mode: 'aim', target: who },
    { label: 'BURST', right: '', mode: 'burst', target: who },
    { label: 'AUTO', right: '', mode: 'auto', target: who },
    { label: 'RELOAD', right: '', mode: 'reload', target: who },
  ];
}

export function examineFromHostile(target: Hostile): ExamineView {
  return {
    name: target.name,
    description: hostileNote(target),
    lists: [],
  };
}

export function hostileForLook(
  room: Pick<RoomView, 'people' | 'stuff'>,
  view: { name: string },
  overlay?: Hostile | null,
): Hostile | null {
  const listed = overlayHostiles(room, overlay);
  const name = view.name.replace(/\(#[0-9][0-9A-Za-z]*\)$/, '').trim();
  return matchHostile(listed, name) ?? matchHostile(listed, view.name);
}

export function localAttackRoll(
  target: Hostile,
  stat: number,
  bonus: number,
  mode: Exclude<FireMode, 'reload'> = 'aim',
  range: RangeMod | null = null,
): RollPayload {
  const dice = [6, 5];
  const rangeBonus = range?.bonus ?? 0;
  const oor = range?.glitch ? 2 : 0;
  const kit = bonus + rangeBonus - oor;
  const total = stat + kit + dice[0]! + dice[1]!;
  const success = total >= target.ds;
  const margin = total - target.ds;
  return {
    verb: 'attack',
    title: 'ATTACK',
    stat: 'reaction',
    statShort: 'REA',
    statValue: stat,
    bonuses: bonus + rangeBonus,
    total,
    ds: target.ds,
    success,
    margin,
    damageToTarget: success ? Math.max(0, margin) : 0,
    damageToSelf: success ? 0 : Math.max(1, -margin),
    needNerveCheck: Boolean(range?.glitch),
    mode,
    dice,
    kept: dice,
    explodeBonus: 0,
    doubleSix: false,
    doubleOne: false,
    parts: [`stat ${stat}`, bonus ? `kit +${bonus}` : '', ...(range?.parts ?? [])].filter(Boolean),
    flavor: range?.glitch
      ? 'the shot stretches and dies in the gap'
      : success
        ? 'the shot walks the rail'
        : 'the return fire finds bone',
    target: target.name,
    line: attackCmd(attackRef(target), mode),
  };
}
