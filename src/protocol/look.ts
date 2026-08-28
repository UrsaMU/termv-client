import { stripTerminal } from './ansi';
import { overlayHostiles, isHostileRow, type Hostile } from './combat';
import { sprawlFromWire, uiMetaType, type WireMessage } from './frames';

export type ExitLink = { name: string; cmd: string; flag?: string; sub?: string; id?: string };
export type EntityRow = {
  label: string;
  flag: string;
  sub: string;
  idle: string;
  cmd?: string;
  id?: string;
};

export type RoomView = {
  name: string;
  description: string;
  mediaUrl?: string;
  people: EntityRow[];
  stuff: EntityRow[];
  exits: ExitLink[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function isLookUi(message: WireMessage): boolean {
  return uiMetaType(message) === 'look';
}

export function lookIsRoom(message: WireMessage): boolean {
  if (!isLookUi(message)) return false;
  const ui = asRecord(message.data.ui);
  const meta = asRecord(ui?.meta);
  return Boolean(meta && meta.isRoom === true);
}

export function isLoginUi(message: WireMessage): boolean {
  return uiMetaType(message) === 'login';
}

export function isCmdEcho(message: WireMessage): boolean {
  const ui = asRecord(message.data.ui);
  return ui?.type === 'cmd-echo';
}

export type LookList = {
  label: string;
  items: EntityRow[];
};

export type ExamineView = {
  name: string;
  description: string;
  mediaUrl?: string;
  lists: LookList[];
};

type LookParts = {
  name: string;
  description: string;
  mediaUrl?: string;
  lists: LookList[];
};

function entityFromItem(item: unknown): EntityRow | null {
  const rec = asRecord(item);
  if (!rec) return null;
  const action = asRecord(rec.action);
  const cmd = action ? String(action.cmd ?? '') : String(rec.cmd ?? '');
  const id = objectId(rec.dbref ?? rec.id);
  const label = formatLookName(String(rec.label ?? ''), id);
  if (!label) return null;
  return {
    label,
    flag: stripTerminal(String(rec.role ?? rec.badge ?? '')),
    sub: stripTerminal(
      String(rec.sublabel ?? rec.shortDesc ?? rec.shortdesc ?? rec['short-desc'] ?? ''),
    ),
    idle: stripTerminal(String(rec.meta ?? '')),
    cmd: cmd || undefined,
    id,
  };
}

function lookPartsFromUi(ui: Record<string, unknown>): LookParts | null {
  const components = ui.components;
  if (!Array.isArray(components)) return null;
  let name = '';
  let description = '';
  let mediaUrl: string | undefined;
  const lists: LookList[] = [];

  for (const raw of components) {
    const row = asRecord(raw);
    if (!row) continue;
    const kind = String(row.type ?? '');
    if (kind === 'header') name = formatLookName(String(row.title ?? ''));
    if (kind === 'media') {
      const url = String(row.url ?? row.src ?? '');
      if (url) mediaUrl = url;
    }
    if (kind === 'text' || kind === 'markdown') {
      const next = stripTerminal(String(row.content ?? ''));
      if (next) description = next;
    }
    if (kind === 'entity-list' || kind === 'actions') {
      const title = String(row.title ?? '').trim().toUpperCase() || 'LIST';
      const items: EntityRow[] = [];
      if (Array.isArray(row.items)) {
        for (const item of row.items) {
          const entity = entityFromItem(item);
          if (entity) items.push(entity);
        }
      }
      if (items.length) lists.push({ label: title, items });
    }
  }

  return { name, description, mediaUrl, lists };
}

/** Drop LOOK chrome, indent, and terminal wraps. Keep one paragraph. */
export function cleanLookProse(raw: string): string {
  const lines = stripTerminal(raw)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => {
      if (/^=+$/.test(line)) return false;
      if (/^=+.*LOOK/i.test(line)) return false;
      if (/^LOOK\b/i.test(line)) return false;
      if (/^SPRAWL\b/i.test(line)) return false;
      return true;
    });
  return lines.join(' ').replace(/\s+/g, ' ').trim();
}

export function examineFromLook(message: WireMessage): ExamineView | null {
  if (sprawlFromWire(message)?.kind === 'ping') return null;
  const ui = asRecord(message.data.ui);
  const meta = asRecord(ui?.meta);
  if (String(meta?.kind ?? '') === 'ping') return null;
  if (!isLookUi(message) || lookIsRoom(message)) return null;
  if (!ui) return null;
  const parts = lookPartsFromUi(ui);
  if (!parts) return null;
  if (!parts.name && !parts.description && !parts.mediaUrl && !parts.lists.length) return null;
  return {
    name: parts.name || 'LOOK',
    description: cleanLookProse(parts.description),
    mediaUrl: parts.mediaUrl,
    lists: parts.lists,
  };
}

export function roomFromLook(message: WireMessage): RoomView | null {
  if (!isLookUi(message) || !lookIsRoom(message)) return null;
  const ui = asRecord(message.data.ui);
  if (!ui) return null;
  const parts = lookPartsFromUi(ui);
  if (!parts) return null;

  const people: EntityRow[] = [];
  const stuff: EntityRow[] = [];
  const exits: ExitLink[] = [];
  for (const list of parts.lists) {
    if (list.label.includes('EXIT')) {
      for (const item of list.items) {
        exits.push({
          name: item.label,
          cmd: item.cmd || item.label.toLowerCase(),
          flag: item.flag,
          sub: item.sub,
          id: item.id,
        });
      }
    } else if (list.label.includes('CHAR') || list.label.includes('PLAYER')) {
      people.push(...list.items);
    } else {
      stuff.push(...list.items);
    }
  }

  const name = parts.name || 'ROOM';
  if (name === 'ROOM' && !parts.description && !exits.length && !people.length && !stuff.length) {
    return null;
  }

  return {
    name,
    description: parts.description,
    mediaUrl: parts.mediaUrl,
    people,
    stuff,
    exits,
  };
}

export function lookFromRoom(room: RoomView, overlay?: Hostile | null): ExamineView {
  const lists: LookList[] = [];
  const hostiles = overlayHostiles(room, overlay);
  const taken = new Set(hostiles.map((row) => row.id || row.name));
  const people = room.people.filter((row) => !taken.has(row.id || row.label) && !isHostileRow(row));
  const stuff = room.stuff.filter((row) => !taken.has(row.id || row.label) && !isHostileRow(row));
  if (hostiles.length) {
    lists.push({
      label: 'HOSTILES',
      items: hostiles.map((row) => ({
        label: row.name,
        flag: row.dead ? 'DOWN' : `DS ${row.ds}`,
        sub: row.note,
        idle: row.dead ? 'DOWN' : '',
        id: row.id,
      })),
    });
  }
  if (people.length) lists.push({ label: 'PLAYERS', items: people });
  if (stuff.length) lists.push({ label: 'THINGS', items: stuff });
  if (room.exits.length) {
    lists.push({
      label: 'EXITS',
      items: room.exits.map((exit) => ({
        label: exit.name,
        flag: exit.flag ?? '',
        sub: exit.sub ?? '',
        idle: '',
        cmd: exit.cmd,
        id: exit.id,
      })),
    });
  }
  return {
    name: room.name,
    description: room.description,
    mediaUrl: room.mediaUrl,
    lists,
  };
}

export function objectId(raw: unknown): string | undefined {
  const num = String(raw ?? '')
    .replace(/^#/, '')
    .replace(/[^\d].*$/, '');
  return /^\d+$/.test(num) ? num : undefined;
}

export function bareLookName(label: string): string {
  return formatLookName(label).replace(/\(#[0-9][0-9A-Za-z]*\)$/, '').trim();
}

export function lookCmdFor(item: Pick<EntityRow, 'label' | 'cmd' | 'id'>): string {
  const cmd = (item.cmd ?? '').trim();
  if (/^look\b/i.test(cmd)) return cmd;
  if (item.id) return `look #${item.id}`;
  const name = bareLookName(item.label);
  return name ? `look ${name}` : '';
}

export function formatLookName(raw: string, id?: unknown): string {
  let text = stripTerminal(raw)
    .replace(/\s+\((#[0-9][0-9A-Za-z]*)\)\s*$/, '($1)')
    .trim();
  if (!text) return '';
  if (/\(#[0-9][0-9A-Za-z]*\)\s*$/.test(text)) return text;
  const num = String(id ?? '')
    .replace(/^#/, '')
    .replace(/[^\d].*$/, '');
  if (/^\d+$/.test(num)) return `${text}(#${num})`;
  return text;
}

export function roomTitle(raw: string): string {
  return formatLookName(raw).toUpperCase();
}

export function exitChip(name: string, alias?: string): string {
  const label = name.trim();
  const alt = (alias ?? '').trim();
  if (!alt) return '';
  if (alt.toLowerCase() === label.toLowerCase()) return '';
  return alt;
}
