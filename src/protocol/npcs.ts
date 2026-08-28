import catalog from '../data/antagonists.json';
import type { EntityRow } from './look';

export type NpcTemplate = {
  slug: string;
  name: string;
  ds: number;
  loadout: string;
  shortDesc: string;
};

type RawNpc = {
  slug: string;
  name: string;
  ds: number;
  loadout?: string;
  'short-desc'?: string;
};

export const NPC_CATALOG: NpcTemplate[] = (catalog as RawNpc[]).map((row) => ({
  slug: row.slug,
  name: row.name,
  ds: Number(row.ds) || 10,
  loadout: String(row.loadout ?? ''),
  shortDesc: String(row['short-desc'] ?? ''),
}));

export function findNpc(q: string): NpcTemplate | null {
  const raw = q.trim();
  if (!raw) return null;
  const lc = raw.toLowerCase().replace(/^#/, '');
  const asDs = Number(lc);
  if (Number.isFinite(asDs) && asDs >= 1 && asDs <= 30 && String(asDs) === lc) {
    return {
      slug: `ds-${asDs}`,
      name: `DS${asDs} foe`,
      ds: asDs,
      loadout: '',
      shortDesc: `A DS${asDs} body on the street.`,
    };
  }
  return (
    NPC_CATALOG.find((row) => row.slug === lc) ??
    NPC_CATALOG.find((row) => row.name.toLowerCase() === lc) ??
    NPC_CATALOG.find((row) => row.slug.includes(lc) || row.name.toLowerCase().includes(lc)) ??
    null
  );
}

export function spawnCmd(ref: string, name = ''): string {
  const arg = ref.trim();
  if (!arg) return '';
  const who = name.trim();
  return who ? `+npc/spawn ${arg}=${who}` : `+npc/spawn ${arg}`;
}

export function clearNpcCmd(ref = ''): string {
  const arg = ref.trim();
  return arg ? `+npc/clear ${arg}` : '+npc/clear';
}

export function npcClearNotice(removed: number, ref = ''): {
  kind: 'system';
  title: 'NPC';
  body: string;
} {
  if (removed <= 0) return { kind: 'system', title: 'NPC', body: 'NOTHING HERE' };
  const who = ref.trim();
  return {
    kind: 'system',
    title: 'NPC',
    body: who ? `CLEARED ${who.toUpperCase()}` : `CLEARED ${String(removed).padStart(2, '0')}`,
  };
}

export function spawnReady(insert: string): boolean {
  return Boolean(findNpc(insert));
}

export const NPC_LOCKS = NPC_CATALOG.map((row) => ({
  label: `${row.name.toUpperCase()}`,
  insert: row.slug,
  hint: `DS${row.ds}`,
}));

export function npcRow(template: NpcTemplate, id: string): EntityRow {
  const note = template.shortDesc || template.loadout || 'on the street';
  return {
    label: template.name,
    flag: 'NPC',
    sub: `DS${template.ds}/${template.ds} · ${note}`,
    idle: '',
    id,
  };
}

export function nextNpcId(rows: Array<{ id?: string }>): string {
  const used = rows.map((row) => Number(row.id)).filter((n) => Number.isFinite(n));
  return String((used.length ? Math.max(...used) : 20) + 1);
}
