import { describe, expect, it } from 'vitest';
import { findHelpCmd, helpReady, slashHelpLocks, slashHelpLook, slashVisible } from './slash-help';
import { SLASH_COMMANDS } from './slash';

describe('slashVisible', () => {
  it('hides staff-only verbs from players', () => {
    const spawn = SLASH_COMMANDS.find((cmd) => cmd.id === 'npc-spawn')!;
    const look = SLASH_COMMANDS.find((cmd) => cmd.id === 'look')!;
    expect(slashVisible(look, false)).toBe(true);
    expect(slashVisible(spawn, false)).toBe(false);
    expect(slashVisible(spawn, true)).toBe(true);
    expect(slashVisible(SLASH_COMMANDS.find((cmd) => cmd.id === 'help')!, true)).toBe(false);
  });
});

describe('slashHelpLook', () => {
  it('lists only commands the actor can fire', () => {
    const player = slashHelpLook('', false);
    const staff = slashHelpLook('', true);
    const labels = (view: typeof player) => view.lists.flatMap((list) => list.items.map((row) => row.label));
    expect(player.name).toBe('SLASH');
    expect(labels(player)).toContain('/LOOK');
    expect(labels(player)).toContain('/HACK');
    expect(labels(player)).toContain('/LOCK');
    expect(labels(player)).not.toContain('/SPAWN');
    expect(labels(player)).not.toContain('/STAFF');
    expect(labels(staff)).toContain('/SPAWN');
    expect(labels(staff)).toContain('/CLEAR');
    expect(labels(staff)).toContain('/APPROVE');
    expect(slashHelpLocks(false).map((lock) => lock.label)).toContain('LOOK');
    expect(slashHelpLocks(false).map((lock) => lock.label)).not.toContain('SPAWN');
    expect(slashHelpLocks(true).map((lock) => lock.label)).toContain('SPAWN');
  });

  it('opens one command from a name or alias', () => {
    expect(findHelpCmd('look', false)?.id).toBe('look');
    expect(findHelpCmd('/atk', false)?.id).toBe('attack');
    expect(helpReady('lock', false)).toBe(true);
    expect(helpReady('spawn', false)).toBe(false);
    expect(helpReady('spawn', true)).toBe(true);
    const page = slashHelpLook('lock', false);
    expect(page.name).toBe('/LOCK');
    expect(page.description).toMatch(/RELOCK/);
    expect(page.description).toMatch(/\/lock/);
    expect(slashHelpLook('nope', false).description).toMatch(/No slash matching/);
  });
});
