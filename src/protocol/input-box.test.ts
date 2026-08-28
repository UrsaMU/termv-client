import { describe, expect, it } from 'vitest';
import {
  growInputHeight,
  INPUT_MAX_ROWS,
  INPUT_MIN_PX,
  INPUT_LINE_PX,
  INPUT_PAD_PX,
  rememberCmd,
  stepHistoryIndex,
  tabTargetsStreet,
} from './input-box';

describe('growInputHeight', () => {
  it('stays at one row until the text needs more, then caps at six', () => {
    expect(growInputHeight(20)).toBe(INPUT_MIN_PX);
    expect(growInputHeight(80)).toBe(80);
    expect(growInputHeight(400)).toBe(INPUT_PAD_PX + INPUT_LINE_PX * INPUT_MAX_ROWS);
  });
});

describe('command history', () => {
  it('dedupes the latest line and walks up into older commands', () => {
    expect(rememberCmd('pose leans', [])).toEqual(['pose leans']);
    expect(rememberCmd('/attack cop', ['pose leans'])).toEqual(['/attack cop', 'pose leans']);
    expect(rememberCmd('/attack cop', ['/attack cop', 'pose leans'])).toEqual(['/attack cop', 'pose leans']);
    expect(stepHistoryIndex(2, -1, 1)).toBe(0);
    expect(stepHistoryIndex(2, 0, 1)).toBe(1);
    expect(stepHistoryIndex(2, 1, 1)).toBe(1);
    expect(stepHistoryIndex(2, 0, -1)).toBe(-1);
  });
});

describe('tabTargetsStreet', () => {
  it('only steals Tab when the page itself has no focus', () => {
    const body = { id: 'body' };
    const html = { id: 'html' };
    const box = { id: 'box' };
    expect(tabTargetsStreet(null, body, html)).toBe(true);
    expect(tabTargetsStreet(body, body, html)).toBe(true);
    expect(tabTargetsStreet(html, body, html)).toBe(true);
    expect(tabTargetsStreet(box, body, html)).toBe(false);
  });
});
