export type DockItem = { to: string; label: string; hint: string; action?: 'quit' };

export function dockActive(path: string, to: string): boolean {
  if (to === '/') return path === '/';
  if (to === '/play') {
    return ['/play', '/roll', '/combat'].some((prefix) => path.startsWith(prefix));
  }
  if (to === '/gig') {
    return path === '/gig' || path.startsWith('/gig/');
  }
  if (to === '/sheet') {
    return path.startsWith('/sheet');
  }
  if (to === '/inventory') {
    return path.startsWith('/inventory') || path.startsWith('/gear');
  }
  if (to === '/market') {
    return path.startsWith('/market');
  }
  if (to === '/chargen') {
    return path.startsWith('/chargen');
  }
  if (to === '/deck') {
    return path.startsWith('/deck') || path.startsWith('/hack');
  }
  if (to === '/wiki') return path.startsWith('/wiki');
  return path === to || path.startsWith(`${to}/`);
}

export function operativeTabs(opts: {
  streetLabel?: string;
  staff?: boolean;
  chargen?: boolean;
} = {}): DockItem[] {
  const dossier: DockItem = opts.chargen
    ? { to: '/chargen', label: 'CHARGEN', hint: 'DRAFT' }
    : { to: '/sheet', label: 'SHEET', hint: 'DOSSIER' };
  const items: DockItem[] = [
    { to: '/play', label: opts.streetLabel ?? 'STREET', hint: 'SCENE' },
    { to: '/gig', label: 'GIG', hint: 'JOB' },
    { to: '/console', label: 'CONSOLE', hint: 'TTY' },
    dossier,
    { to: '/inventory', label: 'INVENTORY', hint: 'PACK' },
    { to: '/market', label: 'MARKET', hint: 'b¥' },
    { to: '/deck', label: 'DECK', hint: 'RIG' },
    { to: '/map', label: 'MAP', hint: 'FLOW' },
    { to: '/haunts', label: 'HAUNTS', hint: 'DIVES' },
    { to: '/comms', label: 'COMMS', hint: 'CHAN / MAIL' },
    { to: '/wiki', label: 'WIKI', hint: 'LORE' },
  ];
  if (opts.staff) items.push({ to: '/staff', label: 'STAFF', hint: 'JOBS' });
  items.push({ to: '/', label: 'QUIT', hint: 'JACK OUT', action: 'quit' });
  return items;
}

export function dossierPath(chargen: boolean): '/chargen' | '/sheet' {
  return chargen ? '/chargen' : '/sheet';
}

export type DeskBackLink = {
  label: string;
  to?: string;
  onClick?: () => void;
};

/** Parent desk for screens that have no StreetInput. Nested desks pass their own. */
export function deskBackOf(path: string): DeskBackLink | null {
  const p = path.replace(/\/+$/, '') || '/';
  if (p === '/hack' || p.startsWith('/hack/')) return { label: 'DECK', to: '/deck' };
  if (
    p === '/sheet' ||
    p === '/market' ||
    p === '/map' ||
    p === '/haunts' ||
    p === '/staff' ||
    p === '/deck' ||
    p === '/comms' ||
    p === '/wiki' ||
    p === '/dossier' ||
    p === '/gig/done' ||
    p.startsWith('/sheet/') ||
    p.startsWith('/market/') ||
    p.startsWith('/map/') ||
    p.startsWith('/staff/') ||
    p.startsWith('/deck/') ||
    p.startsWith('/wiki/') ||
    p.startsWith('/dossier/') ||
    p.startsWith('/gig/')
  ) {
    return { label: 'STREET', to: '/play' };
  }
  return null;
}
