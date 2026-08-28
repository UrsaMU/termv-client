import { describe, expect, it } from 'vitest';
import { deskBackOf, dockActive, dossierPath, operativeTabs } from './dock';

describe('operativeTabs', () => {
  it('keeps the full street set and parks chargen in the sheet slot', () => {
    expect(operativeTabs().map((item) => item.label)).toEqual([
      'STREET',
      'GIG',
      'CONSOLE',
      'SHEET',
      'INVENTORY',
      'MARKET',
      'DECK',
      'MAP',
      'HAUNTS',
      'COMMS',
      'WIKI',
      'QUIT',
    ]);
    expect(operativeTabs({ chargen: true }).map((item) => `${item.label}:${item.to}`)).toEqual([
      'STREET:/play',
      'GIG:/gig',
      'CONSOLE:/console',
      'CHARGEN:/chargen',
      'INVENTORY:/inventory',
      'MARKET:/market',
      'DECK:/deck',
      'MAP:/map',
      'HAUNTS:/haunts',
      'COMMS:/comms',
      'WIKI:/wiki',
      'QUIT:/',
    ]);
    expect(operativeTabs({ chargen: true, staff: true }).map((item) => item.label)).toEqual([
      'STREET',
      'GIG',
      'CONSOLE',
      'CHARGEN',
      'INVENTORY',
      'MARKET',
      'DECK',
      'MAP',
      'HAUNTS',
      'COMMS',
      'WIKI',
      'STAFF',
      'QUIT',
    ]);
    expect(operativeTabs().at(-1)).toMatchObject({
      label: 'QUIT',
      hint: 'JACK OUT',
      action: 'quit',
    });
  });
});

describe('dossierPath', () => {
  it('parks a live restart back on the chargen slot', () => {
    expect(dossierPath(true)).toBe('/chargen');
    expect(dossierPath(false)).toBe('/sheet');
  });
});

describe('dockActive', () => {
  it('lights the dossier slot for chargen or sheet families', () => {
    expect(dockActive('/chargen', '/chargen')).toBe(true);
    expect(dockActive('/sheet', '/sheet')).toBe(true);
    expect(dockActive('/gear', '/sheet')).toBe(false);
    expect(dockActive('/inventory', '/sheet')).toBe(false);
    expect(dockActive('/inventory', '/inventory')).toBe(true);
    expect(dockActive('/gear', '/inventory')).toBe(true);
    expect(dockActive('/market', '/sheet')).toBe(false);
    expect(dockActive('/market', '/market')).toBe(true);
    expect(dockActive('/combat', '/play')).toBe(true);
    expect(dockActive('/gig', '/play')).toBe(false);
    expect(dockActive('/gig', '/gig')).toBe(true);
    expect(dockActive('/gig/done', '/gig')).toBe(true);
    expect(dockActive('/play', '/play')).toBe(true);
    expect(dockActive('/play', '/chargen')).toBe(false);
    expect(dockActive('/chargen', '/sheet')).toBe(false);
    expect(dockActive('/play', '/')).toBe(false);
    expect(dockActive('/', '/')).toBe(true);
  });
});

describe('deskBackOf', () => {
  it('puts a back row on desks that have no street input', () => {
    expect(deskBackOf('/sheet')).toEqual({ label: 'STREET', to: '/play' });
    expect(deskBackOf('/market')).toEqual({ label: 'STREET', to: '/play' });
    expect(deskBackOf('/map')).toEqual({ label: 'STREET', to: '/play' });
    expect(deskBackOf('/staff')).toEqual({ label: 'STREET', to: '/play' });
    expect(deskBackOf('/deck')).toEqual({ label: 'STREET', to: '/play' });
    expect(deskBackOf('/comms')).toEqual({ label: 'STREET', to: '/play' });
    expect(deskBackOf('/wiki')).toEqual({ label: 'STREET', to: '/play' });
    expect(deskBackOf('/dossier')).toEqual({ label: 'STREET', to: '/play' });
    expect(deskBackOf('/gig/done')).toEqual({ label: 'STREET', to: '/play' });
    expect(deskBackOf('/hack')).toEqual({ label: 'DECK', to: '/deck' });
  });

  it('skips screens that already have a command input', () => {
    expect(deskBackOf('/play')).toBeNull();
    expect(deskBackOf('/console')).toBeNull();
    expect(deskBackOf('/chargen')).toBeNull();
    expect(deskBackOf('/inventory')).toBeNull();
    expect(deskBackOf('/')).toBeNull();
  });
});
