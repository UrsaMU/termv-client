import { stripTerminal } from './ansi';

export const SPRAWL_UI = 'sprawl';

export type SprawlKind =
  | 'sheet'
  | 'roll'
  | 'fight'
  | 'notice'
  | 'gear'
  | 'net'
  | 'gig'
  | 'market'
  | 'flow'
  | 'desc'
  | 'ping'
  | 'payout';

export type SheetPayload = {
  name: string;
  role: string;
  status: string;
  stats: {
    morphology: number;
    equilibrium: number;
    reaction: number;
    cognition: number;
    affinity: number;
  };
  resilience: number;
  resilienceMax: number;
  load: number;
  loadMax: number;
  cash: number;
  ap: number;
  apTotal: number;
  level: number;
  edge: string;
  background: string;
  quirks: string[];
  affectations: string[];
  note: string;
  augs: Array<{ slug: string; name: string }>;
  gear: Array<{ name: string; load: number; slot: string }>;
  critical: { location: string; severity: number; effect: string } | null;
};

export type RollPayload = {
  verb: string;
  title: string;
  stat: string;
  statShort: string;
  statValue: number;
  bonuses: number;
  total: number;
  ds: number;
  success: boolean;
  margin: number;
  damageToTarget: number;
  damageToSelf: number;
  needNerveCheck: boolean;
  mode: string;
  dice: number[];
  kept: number[];
  explodeBonus: number;
  doubleSix: boolean;
  doubleOne: boolean;
  parts: string[];
  flavor: string;
  target: string;
  line?: string;
};

export type DescPayload = {
  name: string;
  text: string;
};

export type GearFit = {
  slug: string;
  name: string;
  effect: string;
  bonus?: number;
  tags: string[];
};

export type GearAmmo = {
  slug: string;
  name: string;
};

export type GearItem = {
  name: string;
  slug: string;
  slot: string;
  load: number;
  mods: string;
  use: boolean;
  kind: string;
  mag?: number;
  magMax?: number;
  bonus?: number;
  rangeM?: number;
  ammo: GearAmmo | null;
  fittings: GearFit[];
};

export type GearPayload = {
  load: number;
  loadMax: number;
  items: GearItem[];
};

export type NetPayload = {
  hull: string;
  firewall: number;
  aiCog: number;
  ram: number;
  ramMax: number;
  slots: number;
  slotsMax: number;
  software: Array<{ name: string; slug: string; effect: string; obsolete: boolean }>;
  exploits: Array<{ name: string; slug: string; note: string }>;
  penalties: Array<{ name: string; note: string }>;
  heat: number;
};

export type PingField = {
  key: string;
  label: string;
  value: string;
};

export type PingPayload = {
  id: string;
  name: string;
  connected: boolean;
  staff: boolean;
  idle: string;
  image?: string;
  fields: PingField[];
};

export type GigPayload = {
  id: string;
  title: string;
  blurb: string;
  tier: string;
  objective: string;
  venueName: string;
  bossName: string;
  bossDs: number;
  targetName: string;
  node: number;
  nodesMax: number;
  roomName: string;
  roomDesc: string;
  payoutMult: number;
  returnRoomId: string;
  nodeCleared: boolean;
  status: string;
  token: boolean;
  onSite: boolean;
  payoutBy: number;
  payoutAp: number;
  /** Mid-run: node clear — desk shows GO DEEPER. */
  canAdvance?: boolean;
  /** One-line next beat. */
  nextHint?: string;
};

export type MarketStat = {
  label: string;
  value: string;
};

export type MarketItem = {
  slug: string;
  name: string;
  price: number;
  spec: string;
  category: string;
  stock: string;
  image: string;
  blurb: string;
  kind: string;
  book: string;
  tags: string[];
  stats: MarketStat[];
};

export type MarketPayload = {
  cash: number;
  items: MarketItem[];
};

export type FlowDistrict = {
  slug: string;
  name: string;
  grid: string;
  blurb: string;
  image?: string;
  roomId?: string;
  /** Staff linked a room — jack-in allowed. */
  open?: boolean;
};

export type HauntPlace = {
  slug: string;
  name: string;
  kind: string;
  blurb: string;
  image?: string;
  roomId?: string;
  open?: boolean;
};

export type FightPayload = {
  verb: string;
  ok: boolean;
  who: string;
  resilience: number;
  resilienceMax: number;
  amount: number;
  note: string;
  critical: { location: string; severity: number; effect: string } | null;
};

export type SprawlFrame = {
  kind: string;
  data: Record<string, unknown>;
};

export type WireMessage = {
  text: string;
  data: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function num(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

const STAT_ALIASES: Record<string, keyof SheetPayload['stats']> = {
  morphology: 'morphology',
  mor: 'morphology',
  morph: 'morphology',
  melee: 'morphology',
  equilibrium: 'equilibrium',
  equ: 'equilibrium',
  eq: 'equilibrium',
  nerve: 'equilibrium',
  reaction: 'reaction',
  rea: 'reaction',
  react: 'reaction',
  shooting: 'reaction',
  aim: 'reaction',
  sneak: 'reaction',
  drive: 'reaction',
  dodge: 'reaction',
  cognition: 'cognition',
  cog: 'cognition',
  perception: 'cognition',
  hack: 'cognition',
  search: 'cognition',
  affinity: 'affinity',
  aff: 'affinity',
  talk: 'affinity',
  con: 'affinity',
  persuade: 'affinity',
};

function readSheetStats(raw: Record<string, unknown>): SheetPayload['stats'] {
  const next = {
    morphology: 0,
    equilibrium: 0,
    reaction: 0,
    cognition: 0,
    affinity: 0,
  };
  const canon = ['morphology', 'equilibrium', 'reaction', 'cognition', 'affinity'] as const;
  for (const key of canon) {
    if (raw[key] != null) next[key] = num(raw[key]);
  }
  for (const [key, value] of Object.entries(raw)) {
    const stat = STAT_ALIASES[key.trim().toLowerCase()];
    if (!stat) continue;
    if (raw[stat] != null) continue;
    next[stat] = num(value);
  }
  return next;
}

function str(value: unknown, fallback = ''): string {
  return value == null ? fallback : String(value);
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter((item) => item.length > 0);
}

function ints(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => num(item));
}

export function uiMetaType(message: WireMessage): string | null {
  const ui = asRecord(message.data.ui);
  if (!ui) return null;
  const meta = asRecord(ui.meta);
  const type = meta ? meta.type : ui.type;
  return type == null ? null : String(type);
}

export function sprawlFromWire(message: WireMessage): SprawlFrame | null {
  const ui = asRecord(message.data.ui);
  if (!ui) return null;
  const meta = asRecord(ui.meta);
  const type = meta ? meta.type : ui.type;
  if (String(type) !== SPRAWL_UI) return null;
  const kind = String(meta?.kind ?? ui.kind ?? '');
  if (!kind) return null;
  const raw = asRecord(meta?.data) ?? asRecord(ui.data) ?? {};
  return { kind, data: raw };
}

export function sheetIsLive(status: string): boolean {
  const value = status.trim().toUpperCase();
  return value === 'LIVE' || value === 'APPROVED';
}

export function sheetFromData(data: Record<string, unknown>): SheetPayload | null {
  const stats = asRecord(data.stats);
  if (!stats) return null;
  const name = stripTerminal(str(data.name)) || 'GOON';
  const crit = asRecord(data.critical);
  return {
    name,
    role: str(data.role, 'GOON').toUpperCase(),
    status: str(data.status, 'DRAFT').toUpperCase(),
    stats: readSheetStats(stats),
    resilience: num(data.resilience),
    resilienceMax: num(data.resilienceMax),
    load: num(data.load),
    loadMax: num(data.loadMax),
    cash: num(data.cash),
    ap: num(data.ap),
    apTotal: num(data.apTotal),
    level: num(data.level),
    edge: str(data.edge),
    background: str(data.background),
    quirks: strings(data.quirks),
    affectations: strings(data.affectations),
    note: stripTerminal(str(data.note || data.notes)),
    augs: Array.isArray(data.augs)
      ? data.augs.flatMap((item) => {
          const row = asRecord(item);
          if (!row) return [];
          const next = { slug: str(row.slug), name: str(row.name) };
          return next.slug || next.name ? [next] : [];
        })
      : [],
    gear: Array.isArray(data.gear)
      ? data.gear.flatMap((item) => {
          const row = asRecord(item);
          if (!row) return [];
          const next = {
            name: str(row.name),
            load: num(row.load),
            slot: str(row.slot, 'carried'),
          };
          return next.name ? [next] : [];
        })
      : [],
    critical: crit
      ? {
          location: str(crit.location),
          severity: num(crit.severity),
          effect: str(crit.effect),
        }
      : null,
  };
}

export function rollFromData(data: Record<string, unknown>): RollPayload | null {
  if (data.statShort == null && data.stat == null) return null;
  return {
    verb: str(data.verb, 'roll'),
    title: str(data.title, 'ACTION ROLL'),
    stat: str(data.stat),
    statShort: str(data.statShort || data.stat, '???').toUpperCase(),
    statValue: num(data.statValue),
    bonuses: num(data.bonuses),
    total: num(data.total),
    ds: num(data.ds),
    success: data.success === true,
    margin: num(data.margin),
    damageToTarget: num(data.damageToTarget),
    damageToSelf: num(data.damageToSelf),
    needNerveCheck: data.needNerveCheck === true,
    mode: str(data.mode, 'normal'),
    dice: ints(data.dice),
    kept: ints(data.kept),
    explodeBonus: num(data.explodeBonus),
    doubleSix: data.doubleSix === true,
    doubleOne: data.doubleOne === true,
    parts: strings(data.parts),
    flavor: str(data.flavor),
    target: str(data.target),
    line: data.line ? str(data.line) : undefined,
  };
}

export function fightFromData(data: Record<string, unknown>): FightPayload | null {
  if (data.who == null && data.resilience == null) return null;
  const crit = asRecord(data.critical);
  return {
    verb: str(data.verb, 'fight'),
    ok: data.ok !== false,
    who: str(data.who),
    resilience: num(data.resilience),
    resilienceMax: num(data.resilienceMax),
    amount: num(data.amount),
    note: str(data.note),
    critical: crit
      ? {
          location: str(crit.location),
          severity: num(crit.severity),
          effect: str(crit.effect),
        }
      : null,
  };
}

export function droppedDice(dice: number[], kept: number[]): number[] {
  const remaining = [...kept];
  const dropped: number[] = [];
  for (const die of dice) {
    const idx = remaining.indexOf(die);
    if (idx >= 0) remaining.splice(idx, 1);
    else dropped.push(die);
  }
  return dropped;
}

export function formatRollLine(roll: RollPayload): string {
  const bonus = roll.bonuses === 0 ? '' : `${roll.bonuses > 0 ? '+' : ''}${roll.bonuses} `;
  const mark = roll.success ? '✓' : '✗';
  return `ROLL · ${roll.statShort} ${roll.statValue} ${bonus}vs DS ${roll.ds} → ${roll.total} ${mark}`;
}

export function formatRollTag(roll: RollPayload): string {
  const verb = (roll.verb || 'roll').toUpperCase();
  const who = roll.target ? ` · ${roll.target.toUpperCase()}` : '';
  return `>> ${verb} · ${roll.statShort}${who}`;
}

export function formatRollMath(roll: RollPayload): string {
  const dice = roll.kept.length ? roll.kept.join('+') : '0';
  const bits = [dice, `+ ${roll.statShort} ${roll.statValue}`];
  if (roll.bonuses) bits.push(`${roll.bonuses > 0 ? '+' : ''}${roll.bonuses}`);
  if (roll.explodeBonus) bits.push(`+${roll.explodeBonus}`);
  return `${bits.join(' ')} = ${roll.total}`;
}

export const emptyNet = (): NetPayload => ({
  hull: 'NONE',
  firewall: 0,
  aiCog: 0,
  ram: 0,
  ramMax: 0,
  slots: 0,
  slotsMax: 0,
  software: [],
  exploits: [],
  penalties: [],
  heat: 0,
});

function ammoFromData(raw: unknown): GearAmmo | null {
  const row = asRecord(raw);
  if (!row) return null;
  const slug = str(row.slug);
  if (!slug) return null;
  return { slug, name: str(row.name, slug) };
}

function fittingsFromData(raw: unknown): GearFit[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry): GearFit[] => {
    if (typeof entry === 'string') {
      const slug = entry.trim();
      return slug ? [{ slug, name: slug, effect: '', tags: [] }] : [];
    }
    const row = asRecord(entry);
    if (!row) return [];
    const slug = str(row.slug);
    const name = str(row.name, slug);
    if (!slug && !name) return [];
    return [
      {
        slug: slug || name,
        name: name || slug,
        effect: str(row.effect),
        bonus: row.bonus == null ? undefined : num(row.bonus),
        tags: strings(row.tags),
      },
    ];
  });
}

export function descFromData(data: Record<string, unknown>): DescPayload | null {
  const text = stripTerminal(str(data.text || data.body || data.desc));
  const name = stripTerminal(str(data.name));
  if (!text && !name) return null;
  return { name, text };
}

export function gearFromData(data: Record<string, unknown>): GearPayload | null {
  if (!Array.isArray(data.items) && data.load == null) return null;
  const items: GearItem[] = Array.isArray(data.items)
    ? data.items.flatMap((raw) => {
        const row = asRecord(raw);
        if (!row) return [];
        const name = str(row.name);
        if (!name) return [];
        return [
          {
            name,
            slug: str(row.slug),
            slot: str(row.slot, 'carried'),
            load: num(row.load),
            mods: str(row.mods),
            use: row.use === true,
            kind: str(row.kind),
            mag: row.mag == null ? undefined : num(row.mag),
            magMax: row.magMax == null ? undefined : num(row.magMax),
            bonus: row.bonus == null ? undefined : num(row.bonus),
            rangeM: row.rangeM == null ? undefined : num(row.rangeM),
            ammo: ammoFromData(row.ammo) ??
              (str(row.ammoSlug)
                ? { slug: str(row.ammoSlug), name: str(row.ammoName || row.ammoSlug) }
                : null),
            fittings: fittingsFromData(
              row.fittings ??
                row.attached ??
                (Array.isArray(row.mods) ? row.mods : null),
            ),
          },
        ];
      })
    : [];
  return { load: num(data.load), loadMax: num(data.loadMax), items };
}

export function netFromData(data: Record<string, unknown>): NetPayload | null {
  if (data.hull == null && data.ram == null) return null;
  return {
    hull: str(data.hull, 'NONE'),
    firewall: num(data.firewall),
    aiCog: num(data.aiCog),
    ram: num(data.ram),
    ramMax: num(data.ramMax),
    slots: num(data.slots),
    slotsMax: num(data.slotsMax),
    software: Array.isArray(data.software)
      ? data.software.flatMap((raw) => {
          const row = asRecord(raw);
          if (!row) return [];
          return [
            {
              name: str(row.name),
              slug: str(row.slug),
              effect: str(row.effect),
              obsolete: row.obsolete === true,
            },
          ];
        })
      : [],
    exploits: Array.isArray(data.exploits)
      ? data.exploits.flatMap((raw) => {
          const row = asRecord(raw);
          if (!row) return [];
          return [{ name: str(row.name), slug: str(row.slug), note: str(row.note) }];
        })
      : [],
    penalties: Array.isArray(data.penalties)
      ? data.penalties.flatMap((raw) => {
          const row = asRecord(raw);
          if (!row) return [];
          return [{ name: str(row.name), note: str(row.note) }];
        })
      : [],
    heat: num(data.heat),
  };
}

export function gigFromData(data: Record<string, unknown>): GigPayload | null {
  if (!str(data.id) && !str(data.title)) return null;
  return {
    id: str(data.id),
    title: str(data.title),
    blurb: str(data.blurb),
    tier: str(data.tier, 'mod'),
    objective: str(data.objective),
    venueName: str(data.venueName),
    bossName: str(data.bossName),
    bossDs: num(data.bossDs),
    node: num(data.node) || 1,
    nodesMax: num(data.nodesMax) || 1,
    roomName: str(data.roomName),
    roomDesc: str(data.roomDesc),
    payoutMult: num(data.payoutMult) || 1,
    returnRoomId: str(data.returnRoomId),
    nodeCleared: data.nodeCleared === true,
    status: str(data.status, 'active'),
    targetName: str(data.targetName),
    token: data.token === true || str(data.status) === 'token',
    onSite: data.onSite === true,
    payoutBy: num(data.payoutBy),
    payoutAp: num(data.payoutAp),
    canAdvance: data.canAdvance === true,
    nextHint: str(data.nextHint) || undefined,
  };
}

export function pingFromData(data: Record<string, unknown>): PingPayload | null {
  const name = str(data.name);
  if (!name && !str(data.id)) return null;
  const fields = Array.isArray(data.fields)
    ? data.fields.flatMap((raw) => {
        const row = asRecord(raw);
        if (!row) return [];
        const key = str(row.key);
        if (!key) return [];
        const value = str(row.value, '-');
        return [{ key, label: str(row.label, key), value: value || '-' }];
      })
    : [];
  const image = str(data.image);
  return {
    id: str(data.id),
    name: name || 'UNKNOWN',
    connected: data.connected === true,
    staff: data.staff === true,
    idle: str(data.idle, 'Offline'),
    ...(image ? { image } : {}),
    fields,
  };
}

export function marketFromData(data: Record<string, unknown>): MarketPayload | null {
  if (!Array.isArray(data.items)) return null;
  return {
    cash: num(data.cash),
    items: data.items.flatMap((raw) => {
      const row = asRecord(raw);
      if (!row) return [];
      const slug = str(row.slug);
      if (!slug) return [];
      return [
        {
          slug,
          name: str(row.name, slug),
          price: num(row.price),
          spec: str(row.spec),
          category: str(row.category, 'general'),
          stock: str(row.stock, 'ok'),
          image: str(row.image || row.media || row.img),
          blurb: str(row.blurb || row.notes || row.effect),
          kind: str(row.kind || row.category),
          book: str(row.book),
          tags: strings(row.tags),
          stats: Array.isArray(row.stats)
            ? row.stats.flatMap((entry) => {
                const stat = asRecord(entry);
                if (!stat) return [];
                const label = str(stat.label);
                const value = str(stat.value);
                return label && value ? [{ label, value }] : [];
              })
            : [],
        },
      ];
    }),
  };
}

export function flowFromData(data: Record<string, unknown>): FlowDistrict[] | null {
  if (!Array.isArray(data.districts)) return null;
  return data.districts.flatMap((raw) => {
    const row = asRecord(raw);
    if (!row) return [];
    const slug = str(row.slug);
    if (!slug) return [];
    const image = str(row.image);
    const roomId = str(row.roomId ?? row.room_id);
    const open = row.open === true || row.open === 'true' || Boolean(roomId);
    return [
      {
        slug,
        name: str(row.name, slug),
        grid: str(row.grid),
        blurb: str(row.blurb),
        open,
        ...(image ? { image } : {}),
        ...(roomId ? { roomId } : {}),
      },
    ];
  });
}

export function hauntFromData(data: Record<string, unknown>): HauntPlace[] | null {
  const list = data.hangouts ?? data.haunts;
  if (!Array.isArray(list)) return null;
  return list.flatMap((raw) => {
    const row = asRecord(raw);
    if (!row) return [];
    const slug = str(row.slug);
    if (!slug) return [];
    const image = str(row.image);
    const roomId = str(row.roomId ?? row.room_id);
    const open = row.open === true || row.open === 'true' || Boolean(roomId);
    return [
      {
        slug,
        name: str(row.name, slug),
        kind: str(row.kind, 'haunt'),
        blurb: str(row.blurb),
        open,
        ...(image ? { image } : {}),
        ...(roomId ? { roomId } : {}),
      },
    ];
  });
}
