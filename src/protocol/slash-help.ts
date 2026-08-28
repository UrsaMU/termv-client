import type { ExamineView } from './look';
import { SLASH_COMMANDS, type SlashCmd, type SlashLock } from './slash';

const CHIP_EXTRA = new Set(['heal', 'hack', 'lock', 'npc-spawn', 'npc-clear', 'staff']);

const GROUPS: Array<{ label: string; test: (cmd: SlashCmd) => boolean }> = [
  {
    label: 'SCENE',
    test: (cmd) =>
      cmd.id === 'look' ||
      cmd.id === 'street' ||
      cmd.id === 'combat' ||
      cmd.id === 'npc' ||
      cmd.id === 'gig' ||
      cmd.id.startsWith('gig-') ||
      cmd.id.startsWith('attack'),
  },
  { label: 'DICE', test: (cmd) => cmd.id === 'roll' || cmd.id.startsWith('roll-') },
  { label: 'HEAL', test: (cmd) => cmd.id === 'heal' || cmd.id.startsWith('heal-') },
  { label: 'PACK', test: (cmd) => cmd.id === 'inventory' || cmd.id.startsWith('gear-') },
  { label: 'MARKET', test: (cmd) => cmd.id === 'market' || cmd.id.startsWith('market-') },
  { label: 'NET', test: (cmd) => cmd.id === 'hack' || cmd.id === 'lock' || cmd.id === 'deck' },
  { label: 'COMMS', test: (cmd) => cmd.id === 'comms' || cmd.id === 'jobs' || cmd.id.startsWith('jobs-') },
  { label: 'SHEET', test: (cmd) => cmd.id === 'sheet' || cmd.id.startsWith('chargen') || cmd.id === 'ping' || cmd.id.startsWith('ping-') },
  { label: 'STAFF', test: (cmd) => Boolean(cmd.staff) },
  { label: 'GRID', test: (cmd) => cmd.id === 'map' || cmd.id === 'console' || cmd.id === 'wiki' || cmd.id === 'quit' },
];

export function slashVisible(cmd: SlashCmd, staff: boolean): boolean {
  if (cmd.id === 'help') return false;
  return !cmd.staff || staff;
}

function catalog(staff: boolean): SlashCmd[] {
  return SLASH_COMMANDS.filter((cmd) => slashVisible(cmd, staff));
}

function aliasKey(alias: string): string {
  return alias.replace(/^[+/]/, '').toLowerCase();
}

export function findHelpCmd(query: string, staff: boolean): SlashCmd | null {
  const q = query.trim().replace(/^[+/]/, '').toLowerCase();
  if (!q) return null;
  const cmds = catalog(staff);
  return (
    cmds.find((cmd) => cmd.id === q) ??
    cmds.find((cmd) => cmd.label.toLowerCase() === q) ??
    cmds.find((cmd) => cmd.aliases.some((alias) => aliasKey(alias) === q)) ??
    null
  );
}

export function helpReady(insert: string, staff: boolean): boolean {
  return Boolean(findHelpCmd(insert, staff));
}

export function slashHelpLocks(staff: boolean): SlashLock[] {
  return catalog(staff)
    .filter((cmd) => cmd.listed || CHIP_EXTRA.has(cmd.id))
    .map((cmd) => ({ label: cmd.label, insert: cmd.label.toLowerCase() }));
}

function rowOf(cmd: SlashCmd) {
  const keys = cmd.aliases.filter((alias) => alias.startsWith('/')).join(' · ');
  return {
    label: `/${cmd.label}`,
    flag: cmd.hint,
    sub: cmd.help,
    idle: keys,
  };
}

function helpGroups(cmds: SlashCmd[]): ExamineView['lists'] {
  const used = new Set<string>();
  const lists: ExamineView['lists'] = [];
  for (const group of GROUPS) {
    const items = cmds.filter((cmd) => !used.has(cmd.id) && group.test(cmd));
    if (!items.length) continue;
    for (const cmd of items) used.add(cmd.id);
    lists.push({ label: group.label, items: items.map(rowOf) });
  }
  const rest = cmds.filter((cmd) => !used.has(cmd.id));
  if (rest.length) lists.push({ label: 'MORE', items: rest.map(rowOf) });
  return lists;
}

export function slashHelpLook(query: string, staff: boolean): ExamineView {
  const cmds = catalog(staff);
  const hit = findHelpCmd(query, staff);
  if (!query.trim()) {
    return {
      name: 'SLASH',
      description: 'Field manual. Slash you can fire. /help <cmd> for one.',
      lists: helpGroups(cmds),
    };
  }
  if (!hit) {
    return {
      name: 'SLASH',
      description: `No slash matching "${query.trim()}".`,
      lists: helpGroups(cmds),
    };
  }
  const keys = hit.aliases.join(' · ');
  const lines = [hit.help];
  if (hit.placeholder) lines.push(`ARG · ${hit.placeholder}`);
  if (keys) lines.push(`KEYS · ${keys}`);
  if (hit.staff) lines.push('STAFF');
  return {
    name: `/${hit.label}`,
    description: lines.join('\n'),
    lists: [],
  };
}
