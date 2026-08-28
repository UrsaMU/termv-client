import { describe, expect, it } from 'vitest';
import { parseWikiList, parseWikiPage, wikiBodyText } from './wiki';

describe('wiki parse', () => {
  it('lists stubs', () => {
    const rows = parseWikiList([
      { path: 'home', title: 'Grid', tags: ['lore'] },
      { path: '' },
    ]);
    expect(rows).toEqual([{ path: 'home', title: 'Grid', tags: ['lore'] }]);
  });

  it('reads a page body', () => {
    const page = parseWikiPage({ path: 'lore/city', title: 'City', body: '# City\nNeon rain.' });
    expect(page?.title).toBe('City');
    expect(wikiBodyText(page?.body ?? '')).toBe('City\nNeon rain.');
  });
});
