import { describe, expect, it } from 'vitest';
import { parsePingSet, pingAttrLine, pingLookLine, pingSetLine } from './ping';

describe('ping slash helpers', () => {
  it('builds look and set lines', () => {
    expect(pingLookLine()).toBe('+ping');
    expect(pingLookLine('Kess')).toBe('+ping Kess');
    expect(pingSetLine('pronouns', 'they/them')).toBe('+ping/set pronouns=they/them');
    expect(pingSetLine('quote', '')).toBe('+ping/set quote=');
    expect(pingAttrLine('favorite-gun', 'PKD-45')).toBe('&ping-favorite-gun me=PKD-45');
  });

  it('parses /ping/set field=value', () => {
    expect(parsePingSet('pronouns=they/them')).toEqual({
      field: 'pronouns',
      value: 'they/them',
    });
    expect(parsePingSet('quote')).toEqual({ field: 'quote', value: null });
    expect(parsePingSet('')).toBeNull();
  });
});
