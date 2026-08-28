import type { GearItem } from './frames';

export type GearAct = {
  id: 'wear' | 'wield' | 'stow' | 'use' | 'drop' | 'give' | 'load' | 'unload' | 'mod' | 'unmod';
  label: string;
};

const WEAR_KINDS = new Set(['armor', 'armour', 'drone', 'clothes', 'clothing']);
const WIELD_KINDS = new Set([
  'firearm',
  'firearms',
  'gun',
  'guns',
  'melee',
  'heavy',
  'weapon',
  'weapons',
]);

export function isGunKind(kind: string): boolean {
  const k = kind.trim().toLowerCase();
  return k === 'firearm' || k === 'firearms' || k === 'gun' || k === 'guns' || k === 'heavy' || k === 'weapon' || k === 'weapons';
}

export function isHostKind(kind: string): boolean {
  const k = kind.trim().toLowerCase();
  return isGunKind(k) || k === 'melee';
}

export function isLooseAmmo(item: {
  kind: string;
  slug?: string;
  name?: string;
  magMax?: number;
}): boolean {
  if (isGunKind(item.kind) || item.magMax != null) return false;
  const k = item.kind.trim().toLowerCase();
  if (k === 'mod' || k === 'weapon-mod' || k === 'armor' || k === 'armour' || k === 'melee') return false;
  if (k === 'ammo' || k === 'ammunition' || k === 'consumable') return true;
  const blob = `${item.slug ?? ''} ${item.name ?? ''} ${k}`.toLowerCase();
  return /(hellfires?|shredders?|ln2s?|splinters?|jelly.?rounds?|depleted.?uranium|moisture-he|high-explosive|hollow.?points?|\bammo\b)/.test(
    blob,
  );
}

export function isAmmoHost(item: { kind: string; magMax?: number; ammo?: unknown }): boolean {
  return isGunKind(item.kind) || item.magMax != null || item.ammo != null;
}

export function packAmmo<T extends { kind: string; slug?: string; name?: string; magMax?: number }>(items: T[]): T[] {
  return items.filter((item) => isLooseAmmo(item));
}

export function packGuns<T extends { kind: string; magMax?: number; ammo?: unknown }>(items: T[]): T[] {
  return items.filter((item) => isAmmoHost(item));
}

export function isLooseMod(item: { kind: string; slug?: string; name?: string }): boolean {
  const k = item.kind.trim().toLowerCase();
  if (k === 'mod' || k === 'weapon-mod') return true;
  const blob = `${item.slug ?? ''} ${item.name ?? ''}`.toLowerCase();
  return /(smart-?link|smart.?target|targeting.?scope|silencer|suppressor|extended.?mag|custom.?grip|gyro|bio-lock|laser.?sight)/.test(
    blob,
  );
}

export function packMods<T extends { kind: string; slug?: string; name?: string }>(items: T[]): T[] {
  return items.filter((item) => isLooseMod(item));
}



function takesMods(item: {
  kind: string;
  fittings?: unknown[];
  magMax?: number;
  slug?: string;
  name?: string;
  slot?: string;
}): boolean {
  if (item.fittings?.length) return true;
  if (isHostKind(item.kind)) return true;
  return gearActFor(item.kind, item) === 'wield';
}

export function gearActFor(
  kind: string,
  hint: { magMax?: number; slug?: string; name?: string; slot?: string } = {},
): 'wear' | 'wield' | 'use' {
  const k = kind.trim().toLowerCase();
  const blob = [k, hint.slug, hint.name].filter(Boolean).join(' ').toLowerCase();
  if (WEAR_KINDS.has(k) || /(armou?r|vest|leathers?|jacket|clothes|clothing|helmet|duster|coat)/.test(blob)) {
    return 'wear';
  }
  if (
    WIELD_KINDS.has(k) ||
    hint.magMax != null ||
    /(firearm|pistol|rifle|shotgun|smg|gun|melee|blade|knife|sword|katana|weapon|holdout)/.test(blob)
  ) {
    return 'wield';
  }
  const slot = hint.slot?.trim().toLowerCase();
  if (slot === 'wielded') return 'wield';
  if (slot === 'worn') return 'wear';
  return 'use';
}

export function gearActions(
  item: {
    kind: string;
    slot: string;
    use: boolean;
    magMax?: number;
    slug?: string;
    name?: string;
    ammo?: { slug: string; name: string } | null;
    fittings?: Array<{ slug: string }>;
  },
  _pack: Array<{ kind: string; slug?: string; name?: string }> = [],
): GearAct[] {
  const acts: GearAct[] = [];
  const verb = gearActFor(item.kind, item);
  const slot = item.slot.trim().toLowerCase();
  if (verb === 'wield') {
    if (slot !== 'wielded') acts.push({ id: 'wield', label: 'WIELD' });
    if (slot === 'wielded') acts.push({ id: 'stow', label: 'STOW' });
  } else if (verb === 'wear') {
    if (slot !== 'worn') acts.push({ id: 'wear', label: 'WEAR' });
    if (slot === 'worn') acts.push({ id: 'stow', label: 'STOW' });
  }
  if (item.use || verb === 'use') acts.push({ id: 'use', label: 'USE' });
  if (isAmmoHost(item)) {
    if (item.ammo) acts.push({ id: 'unload', label: 'UNLOAD' });
    acts.push({ id: 'load', label: 'LOAD' });
  } else if (isLooseAmmo(item)) {
    acts.push({ id: 'load', label: 'LOAD ONTO' });
  }
  if (takesMods(item)) {
    acts.push({ id: 'mod', label: 'MOD' });
    if (item.fittings?.length) acts.push({ id: 'unmod', label: 'UNMOD' });
  }
  acts.push({ id: 'drop', label: 'DROP' });
  acts.push({ id: 'give', label: 'GIVE' });
  return acts;
}

/** Prefer inv #n (same order as the gear frame), then name, then slug. */
export function gearItemRef(
  item: { name?: string; slug?: string },
  pack: Array<{ name?: string; slug?: string }> = [],
): string {
  const slug = (item.slug ?? '').trim();
  const name = (item.name ?? '').trim();
  const idx = pack.findIndex((row) => {
    const rowSlug = (row.slug ?? '').trim();
    const rowName = (row.name ?? '').trim();
    if (slug && rowSlug && slug === rowSlug) return true;
    if (name && rowName && name === rowName) return true;
    return false;
  });
  if (slug) return slug;
  if (idx >= 0) return `#${idx + 1}`;
  return name;
}

export function gearCmd(act: GearAct['id'], name: string, extra = ''): string {
  const item = name.trim();
  if (!item) return '';
  if (act === 'wear') return `+wear ${item}`;
  if (act === 'wield') return `+wield ${item}`;
  if (act === 'stow') return `+stow ${item}`;
  if (act === 'use') return `use ${item}`;
  if (act === 'drop') return `drop ${item}`;
  if (act === 'unload') return `+gear/unload ${item}`;
  if (act === 'load') {
    const ammo = extra.trim();
    return ammo ? `+gear/load ${item}=${ammo}` : '';
  }
  if (act === 'mod') {
    const fit = extra.trim();
    return fit ? `+gear/mod ${item}=${fit}` : '';
  }
  if (act === 'unmod') {
    const fit = extra.trim();
    return fit ? `+gear/unmod ${item}=${fit}` : '';
  }
  const who = extra.trim();
  return who ? `give ${item}=${who}` : '';
}

export function matchGearItem<T extends { name?: string; slug?: string }>(
  items: T[],
  ref: string,
): T | null {
  const q = ref.trim();
  if (!q) return null;
  const hash = /^#(\d+)$/.exec(q);
  if (hash) return items[Number(hash[1]) - 1] ?? null;
  const lc = q.toLowerCase();
  return (
    items.find((row) => (row.slug ?? '').toLowerCase() === lc || (row.name ?? '').toLowerCase() === lc) ??
    items.find((row) => (row.name ?? '').toLowerCase().includes(lc) || (row.slug ?? '').toLowerCase().includes(lc)) ??
    null
  );
}

export function applyGearAct(items: GearItem[], act: GearAct['id'], ref: string, extra = ''): GearItem[] {
  const target = matchGearItem(items, ref);
  if (!target) return items;
  if (act === 'wield') {
    return items.map((row) => {
      if (row === target) return { ...row, slot: 'wielded' };
      if (row.slot === 'wielded' && gearActFor(row.kind, row) === 'wield') return { ...row, slot: 'carried' };
      return row;
    });
  }
  if (act === 'wear') {
    return items.map((row) => (row === target ? { ...row, slot: 'worn' } : row));
  }
  if (act === 'stow') {
    return items.map((row) => (row === target ? { ...row, slot: 'carried' } : row));
  }
  if (act === 'drop') return items.filter((row) => row !== target);
  if (act === 'mod') {
    const piece = matchGearItem(items, extra);
    if (!piece || piece === target) return items;
    const fit = {
      slug: piece.slug || piece.name,
      name: piece.name,
      effect: '',
      tags: [] as string[],
    };
    return items
      .filter((row) => row !== piece)
      .map((row) => (row === target ? { ...row, fittings: [...row.fittings, fit] } : row));
  }
  if (act === 'unmod') {
    const key = extra.trim().toLowerCase();
    return items.map((row) =>
      row === target
        ? { ...row, fittings: row.fittings.filter((fit) => fit.slug.toLowerCase() !== key && fit.name.toLowerCase() !== key) }
        : row,
    );
  }
  if (act === 'load') {
    const ammo = matchGearItem(items, extra);
    if (!ammo) return items;
    return items
      .filter((row) => row !== ammo)
      .map((row) =>
        row === target
          ? { ...row, ammo: { slug: ammo.slug || ammo.name, name: ammo.name }, mag: row.magMax ?? row.mag }
          : row,
      );
  }
  if (act === 'unload') {
    return items.map((row) => (row === target ? { ...row, ammo: null } : row));
  }
  return items;
}

export function modAttachLine(
  host: string,
  mod: { slug?: string; name?: string },
): string {
  return gearCmd('mod', host, (mod.slug || mod.name || '').trim());
}

export function gearSub(item: {
  kind: string;
  mods: string;
  ammo?: { name: string } | null;
  fittings?: Array<{ name: string }>;
  mag?: number;
  magMax?: number;
}): string {
  const bits: string[] = [];
  if (item.magMax != null) bits.push(`${item.mag ?? 0}/${item.magMax}`);
  if (item.ammo?.name) bits.push(item.ammo.name);
  if (item.fittings?.length) bits.push(item.fittings.map((fit) => fit.name).join(', '));
  if (item.mods) bits.push(item.mods);
  if (!bits.length && item.kind) bits.push(item.kind.toUpperCase());
  return bits.join(' · ');
}
