export type MarketCat = {
  id: string;
  label: string;
  aliases: string[];
};

export const MARKET_CATS: MarketCat[] = [
  { id: 'all', label: 'ALL', aliases: [] },
  { id: 'firearm', label: 'GUNS', aliases: ['guns', 'gun', 'firearms'] },
  { id: 'melee', label: 'MELEE', aliases: ['melee-weapons'] },
  { id: 'armor', label: 'ARMOR', aliases: ['armour'] },
  { id: 'heavy', label: 'HEAVY', aliases: ['heavy-weapons'] },
  { id: 'ammo', label: 'AMMO', aliases: ['ammunition'] },
  { id: 'mod', label: 'MODS', aliases: ['mods', 'weapon-mods'] },
  { id: 'augmentation', label: 'CHROME', aliases: ['augs', 'aug', 'chrome', 'cyber'] },
  { id: 'shardware', label: 'SHARDS', aliases: ['shards', 'shard'] },
  { id: 'general', label: 'GEAR', aliases: ['stuff', 'misc', 'tools'] },
  { id: 'console', label: 'DECKS', aliases: ['consoles', 'deck', 'decks', 'net'] },
  { id: 'software', label: 'SOFT', aliases: ['soft', 'programs', 'apps', 'ware'] },
  { id: 'net-hw', label: 'NET HW', aliases: ['net-hardware', 'hardware', 'dongle'] },
];

export function marketCatOf(raw: string): MarketCat {
  const q = raw.trim().toLowerCase();
  if (!q) return MARKET_CATS[0]!;
  const hit = MARKET_CATS.find(
    (cat) =>
      cat.id === q ||
      cat.label.toLowerCase() === q ||
      cat.aliases.includes(q) ||
      cat.id.startsWith(q) ||
      cat.aliases.some((alias) => alias.startsWith(q)),
  );
  return hit ?? MARKET_CATS[0]!;
}

export function marketCatForItem(category: string): MarketCat {
  return marketCatOf(category);
}

export const MARKET_TABS = ['GUNS', 'MELEE', 'ARMOR', 'CHROME', 'DECKS', 'CHEM'] as const;

export type MarketTab = (typeof MARKET_TABS)[number];

export function marketTabOf(category: string): MarketTab {
  const id = marketCatOf(category).id;
  if (id === 'melee') return 'MELEE';
  if (id === 'armor') return 'ARMOR';
  if (id === 'augmentation' || id === 'shardware') return 'CHROME';
  if (id === 'console' || id === 'software' || id === 'net-hw') return 'DECKS';
  if (id === 'general') return 'CHEM';
  return 'GUNS';
}

export function marketKindLabel(item: { category: string; kind?: string }): string {
  const cat = marketCatOf(item.category || item.kind || '');
  if (cat.id !== 'all') return cat.label;
  const kind = String(item.kind || item.category || 'GEAR').trim();
  return kind ? kind.toUpperCase() : 'GEAR';
}

export function filterMarket<T extends { name: string; slug: string; category: string }>(
  items: T[],
  cat: string,
  query = '',
): T[] {
  const tab = (MARKET_TABS as readonly string[]).includes(cat.toUpperCase())
    ? (cat.toUpperCase() as MarketTab)
    : null;
  const id = tab ? null : marketCatOf(cat).id;
  const q = query.trim().toLowerCase();
  return items.filter((item) => {
    if (tab && marketTabOf(item.category) !== tab) return false;
    if (!tab && id !== 'all' && marketCatForItem(item.category).id !== id) return false;
    if (!q) return true;
    return `${item.name} ${item.slug} ${item.category}`.toLowerCase().includes(q);
  });
}

export function marketListLine(cat = ''): string {
  const id = marketCatOf(cat).id;
  return id === 'all' ? '+market' : `+market ${id}`;
}

export function marketBuyLine(slug: string, qty = 1): string {
  const key = slug.trim();
  if (!key) return '';
  return qty > 1 ? `+market/buy ${key}=${qty}` : `+market/buy ${key}`;
}

export function marketInfoLine(slug: string): string {
  const key = slug.trim();
  return key ? `+market/info ${key}` : '+market/info';
}

export function canAfford(cash: number, price: number, qty = 1): boolean {
  return cash >= price * Math.max(1, qty);
}

export function marketStockOk(stock: string): boolean {
  return !stock || stock === 'ok';
}

export function marketDescribe(row: {
  name?: string;
  category?: string;
  kind?: string;
  blurb?: string;
  notes?: string;
  effect?: string;
  bonus?: number | string;
  rangeM?: number | string;
  ram?: number | string;
  slots?: number | string;
}): string {
  const catalog = String(row.blurb ?? row.notes ?? row.effect ?? '').trim();
  if (catalog) return catalog;
  const name = String(row.name ?? 'This piece').replace(/®/g, '').replace(/\s+/g, ' ').trim();
  const cat = String(row.category ?? row.kind ?? '').toLowerCase();
  const kind = String(row.kind ?? '').toLowerCase();
  const bonus = row.bonus != null && String(row.bonus) !== '' ? ` · +${row.bonus}` : '';
  const range = row.rangeM != null && String(row.rangeM) !== '' ? ` · ${row.rangeM} m` : '';
  const ram = row.ram != null && String(row.ram) !== '' ? ` · RAM ${row.ram}` : '';
  const slots = row.slots != null && String(row.slots) !== '' ? ` · ${row.slots} slots` : '';
  if (cat === 'firearm' || cat === 'handgun' || cat === 'smg') {
    return `${name}. Street iron${bonus}${range}.`;
  }
  if (cat === 'melee') return `${name}. Close work${bonus}.`;
  if (cat === 'armor' || cat === 'armour') return `${name}. Wear it when the street bites${bonus}.`;
  if (cat === 'heavy') return `${name}. Crew-served trouble${bonus}.`;
  if (cat === 'ammo') return `${name}. Feed the gun.`;
  if (cat === 'mod') return `${name}. Bolt it onto a host weapon.`;
  if (cat === 'augmentation') return `${name}. Chrome you keep.`;
  if (cat === 'shardware') return `${name}. Jack it if you have the port.`;
  if (cat === 'console') return `${name}. Hull for the net${ram}${slots}.`;
  if (cat === 'software') return `${name}. Load it into a free slot.`;
  if (cat === 'net-hw') return `${name}. Nodejacker hardware.`;
  if (kind === 'drug') return `${name}. A dose for the night.`;
  if (kind === 'consumable') return `${name}. Use it and it's gone.`;
  return `${name}. Street kit. Keep it stowed.`;
}
