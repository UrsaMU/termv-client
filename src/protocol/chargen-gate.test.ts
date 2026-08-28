import { describe, expect, it } from 'vitest';
import {
  afterLinkPath,
  gateFromSheet,
  inChargen,
  isChargenPrompt,
  isSheetApprovedNotice,
  playableGate,
} from './chargen-gate';

describe('gateFromSheet', () => {
  it('forces chargen for missing, draft, and revision sheets', () => {
    expect(gateFromSheet(null)).toBe('unknown');
    expect(gateFromSheet({ status: 'DRAFT' })).toBe('needed');
    expect(gateFromSheet({ status: 'revision' })).toBe('needed');
  });

  it('parks submitted sheets on the dossier, not the wizard', () => {
    expect(gateFromSheet({ status: 'submitted' })).toBe('submitted');
    expect(gateFromSheet({ status: 'SUBMITTED' })).toBe('submitted');
  });

  it('lets live and approved runners onto the street', () => {
    expect(gateFromSheet({ status: 'LIVE' })).toBe('ready');
    expect(gateFromSheet({ status: 'APPROVED' })).toBe('ready');
  });
});

describe('afterLinkPath', () => {
  it('sends draft to chargen, submitted and live to street', () => {
    expect(afterLinkPath('needed')).toBe('/chargen');
    expect(afterLinkPath('submitted')).toBe('/play');
    expect(afterLinkPath('ready')).toBe('/play');
    expect(inChargen('needed')).toBe(true);
    expect(inChargen('submitted')).toBe(false);
    expect(inChargen('ready')).toBe(false);
  });
});

describe('playableGate', () => {
  it('lets a live or submitted sheet out of the wizard even if the gate lagged', () => {
    expect(playableGate('needed', { status: 'LIVE' })).toBe('ready');
    expect(playableGate('needed', { status: 'SUBMITTED' })).toBe('submitted');
    expect(playableGate('submitted', null)).toBe('submitted');
    expect(playableGate('needed', { status: 'DRAFT' })).toBe('needed');
  });
});

describe('isChargenPrompt', () => {
  it('detects the plugin no-sheet leftover', () => {
    expect(isChargenPrompt('No sheet. Type +chargen to jack in.')).toBe(true);
    expect(isChargenPrompt('Type +chargen/start first.')).toBe(true);
    expect(isChargenPrompt('2 +chargen/stat      place 4 points')).toBe(false);
    expect(isChargenPrompt('No sheet. +chargen first.')).toBe(false);
    expect(isChargenPrompt('Left the site. +gig/enter to return.')).toBe(false);
  });
});

describe('isSheetApprovedNotice', () => {
  it('clocks staff approval chrome', () => {
    expect(isSheetApprovedNotice('Sprawl sheet approved by Ops.')).toBe(true);
    expect(isSheetApprovedNotice('KESS already approved.')).toBe(true);
    expect(isSheetApprovedNotice('Submitted. CGEN job opened.')).toBe(false);
  });
});
