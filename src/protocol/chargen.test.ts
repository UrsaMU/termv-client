import { describe, expect, it } from 'vitest';
import {
  CATALOG,
  CHARGEN_STEPS,
  applyStep,
  canAdvance,
  cashFromLog,
  chargenCmd,
  chargenStepOffset,
  composeDraftLook,
  descReady,
  lookBodyFromChrome,
  vibeHint,
  emptyDraft,
  isConfirmedRestart,
  loadDraft,
  resumeStepIndex,
  pointsLeft,
  restartDraft,
  rollCatalog,
  saveDraft,
  skipChargenStep,
  statMark,
} from './chargen';

class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.get(key) ?? null;
  }
  key(index: number) {
    return [...this.store.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}

describe('chargen points', () => {
  it('starts with 4 unspent and cannot advance', () => {
    const draft = emptyDraft();
    expect(pointsLeft(draft)).toBe(4);
    expect(canAdvance(draft, 'stats')).toBe(false);
  });

  it('advances stats only when the 4 points are spent', () => {
    const draft = emptyDraft();
    draft.stats.cognition = 2;
    draft.stats.reaction = 2;
    expect(pointsLeft(draft)).toBe(0);
    expect(canAdvance(draft, 'stats')).toBe(true);
  });

  it('lets a stat sit at 0 and puts all 4 in one stat', () => {
    const draft = emptyDraft();
    expect(draft.stats.morphology).toBe(0);
    draft.stats.cognition = 4;
    expect(pointsLeft(draft)).toBe(0);
    expect(canAdvance(draft, 'stats')).toBe(true);
  });
});

describe('chargen catalogs', () => {
  it('loads the plugin tables used by the wizard', () => {
    expect(CHARGEN_STEPS).toContain('augs');
    expect(CHARGEN_STEPS).toContain('aug-origin');
    expect(CHARGEN_STEPS).toContain('note');
    expect(CHARGEN_STEPS).toContain('desc');
    expect(CHARGEN_STEPS[CHARGEN_STEPS.length - 1]).toBe('desc');
    expect(CATALOG.augs.length).toBe(47);
    expect(CATALOG.backgrounds.length).toBeGreaterThanOrEqual(32);
    expect(CATALOG.augOrigins.map((row) => row.slug)).toEqual([
      'scrimped',
      'corporate-benefactor',
      'betrayed',
    ]);
  });
});

describe('statMark', () => {
  it('keeps the bracketed optic label', () => {
    expect(statMark('morphology')).toBe('MORPHOLOGY [MOR]');
    expect(statMark('equilibrium')).toBe('EQUILIBRIUM [EQU]');
    expect(statMark('reaction')).toBe('REACTION [REA]');
    expect(statMark('cognition')).toBe('COGNITION [COG]');
    expect(statMark('affinity')).toBe('AFFINITY [AFF]');
  });
});

describe('restartDraft', () => {
  it('wipes a spent sheet back to floor 0', () => {
    const storage = new MemoryStorage();
    const spent = emptyDraft();
    spent.stats.cognition = 4;
    spent.stats.reaction = 0;
    spent.background = 'nodejacker';
    spent.cash = 700;
    spent.belongings = ['holdout'];
    saveDraft(spent, storage);
    const next = restartDraft(storage);
    expect(next.stats).toEqual(emptyDraft().stats);
    expect(next.background).toBeUndefined();
    expect(next.cash).toBeUndefined();
    expect(next.belongings).toEqual([]);
    expect(next.status).toBe('draft');
    expect(pointsLeft(next)).toBe(4);
    expect(loadDraft(storage).stats.cognition).toBe(0);
  });
});

describe('isConfirmedRestart', () => {
  it('only treats confirm tokens as a wipe', () => {
    expect(isConfirmedRestart('+chargen/restart confirm')).toBe(true);
    expect(isConfirmedRestart('+chargen/restart yes')).toBe(true);
    expect(isConfirmedRestart('+chargen/restart wipe')).toBe(true);
    expect(isConfirmedRestart('+chargen/restart')).toBe(false);
    expect(isConfirmedRestart('+chargen/restart Neon')).toBe(false);
    expect(isConfirmedRestart('+chargen/start')).toBe(false);
    expect(isConfirmedRestart('+chargen/stat MOR=2')).toBe(false);
  });
});

describe('draft persistence', () => {
  it('round-trips between steps', () => {
    const storage = new MemoryStorage();
    const draft = emptyDraft();
    draft.stats.cognition = 3;
    draft.background = 'nodejacker';
    draft.step = 'note';
    saveDraft(draft, storage);
    expect(loadDraft(storage).background).toBe('nodejacker');
    expect(loadDraft(storage).stats.cognition).toBe(3);
    expect(loadDraft(storage).step).toBe('note');
    expect(resumeStepIndex(loadDraft(storage))).toBe(CHARGEN_STEPS.indexOf('note'));
  });

  it('resumes a saved look step instead of restarting the wizard', () => {
    const parked = { ...emptyDraft(), step: 'desc' as const, desc: 'Rain on chrome.' };
    expect(resumeStepIndex(parked)).toBe(CHARGEN_STEPS.indexOf('desc'));
    const mid = applyStep(emptyDraft(), 'background', 'nodejacker');
    expect(resumeStepIndex(mid)).toBe(CHARGEN_STEPS.indexOf('stats'));
    const statsDone = { ...emptyDraft(), stats: { ...emptyDraft().stats, cognition: 4 } };
    expect(resumeStepIndex(statsDone)).toBe(CHARGEN_STEPS.indexOf('background'));
    expect(
      resumeStepIndex({ ...emptyDraft(), status: 'submitted', step: 'affectations' }),
    ).toBe(CHARGEN_STEPS.indexOf('desc'));
  });

  it('returns a fresh draft on corrupt storage', () => {
    const storage = new MemoryStorage();
    storage.setItem('sprawl.chargen.draft', '{');
    expect(loadDraft(storage).status).toBe('draft');
  });

  it('shifts old floor-1 drafts onto the book 0–4 scale', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      'sprawl.chargen.draft',
      JSON.stringify({
        stats: { morphology: 1, equilibrium: 1, reaction: 3, cognition: 3, affinity: 1 },
        belongings: [],
        quirks: [],
        affectations: [],
        status: 'draft',
      }),
    );
    const draft = loadDraft(storage);
    expect(draft.stats).toEqual({
      morphology: 0,
      equilibrium: 0,
      reaction: 2,
      cognition: 2,
      affinity: 0,
    });
    expect(pointsLeft(draft)).toBe(0);
  });
});

describe('rollCatalog', () => {
  it('picks a real table row instead of a roll token', () => {
    const rows = CATALOG.backgrounds;
    expect(rollCatalog(rows, () => 0).slug).toBe(rows[0]?.slug);
    expect(rollCatalog(rows, () => 0.999).slug).toBe(rows[rows.length - 1]?.slug);
  });
});

describe('applyStep', () => {
  it('records a pick on the next draft, not the previous one', () => {
    const next = applyStep(emptyDraft(), 'background', 'nodejacker');
    expect(next.background).toBe('nodejacker');
    expect(applyStep(next, 'belongings', 'holdout').belongings).toEqual(['holdout']);
  });

  it('rolls a real belongings row so the pick can pin', () => {
    const slugs = new Set(CATALOG.belongings.map((row) => row.slug));
    const first = applyStep(emptyDraft(), 'belongings', 'roll', () => 0);
    expect(first.belongings).toHaveLength(1);
    expect(slugs.has(first.belongings[0] ?? '')).toBe(true);
    expect(first.belongings[0]?.startsWith('rolled-')).toBe(false);
    const second = applyStep(first, 'belongings', 'roll', () => 0);
    expect(second.belongings).toHaveLength(2);
    expect(second.belongings[0]).not.toBe(second.belongings[1]);
    expect(slugs.has(second.belongings[1] ?? '')).toBe(true);
    const full = { ...second, belongings: [...second.belongings, 'sanyo-cell'] };
    expect(applyStep(full, 'belongings', 'roll', () => 0.999).belongings).toEqual(full.belongings);
  });
});

describe('cashFromLog', () => {
  it('reads the last starting-cash leftover', () => {
    expect(cashFromLog([{ body: 'Starting cash 700 b¥ (2d6 x 100)' }])).toBe(700);
    expect(cashFromLog([{ body: 'nope' }])).toBeNull();
    expect(
      cashFromLog([
        { body: 'Starting cash 700 b¥ (2d6 x 100)' },
        { body: 'Chargen reset for Neon.' },
      ]),
    ).toBeNull();
  });
});

describe('chargen augs', () => {
  it('requires a roll, a pick, or none before leaving the step', () => {
    expect(canAdvance(emptyDraft(), 'augs')).toBe(false);
    const meat = applyStep(emptyDraft(), 'augs', 'none');
    expect(meat.augs).toEqual([]);
    expect(meat.augNone).toBe(true);
    expect(canAdvance(meat, 'augs')).toBe(true);
    expect(canAdvance(meat, 'aug-origin')).toBe(true);
    expect(skipChargenStep(meat, 'aug-origin')).toBe(true);
    expect(chargenCmd(meat, 'augs')).toBe('+chargen/aug none');
    expect(chargenCmd(applyStep(emptyDraft(), 'augs', 'meat'), 'augs')).toBe('+chargen/aug none');
  });

  it('rolls or picks one slug and skips origin only when meat', () => {
    const rolled = applyStep(emptyDraft(), 'augs', 'roll', () => 0);
    expect(rolled.augs).toEqual([CATALOG.augs[0]!.slug]);
    expect(canAdvance(rolled, 'augs')).toBe(true);
    expect(canAdvance(rolled, 'aug-origin')).toBe(false);
    expect(skipChargenStep(rolled, 'aug-origin')).toBe(false);
    expect(chargenCmd(rolled, 'augs')).toBe(`+chargen/aug ${rolled.augs[0]}`);
    const picked = applyStep(emptyDraft(), 'augs', 'neurochem');
    expect(picked.augs).toEqual(['neurochem']);
    expect(applyStep(picked, 'augs', 'neurochem').augNone).toBe(true);
    const augsAt = CHARGEN_STEPS.indexOf('augs');
    expect(chargenStepOffset(applyStep(emptyDraft(), 'augs', 'none'), augsAt, 1)).toBe(
      CHARGEN_STEPS.indexOf('note'),
    );
    expect(chargenStepOffset(picked, augsAt, 1)).toBe(CHARGEN_STEPS.indexOf('aug-origin'));
  });

  it('does not resume on a skipped origin page', () => {
    const parked = { ...applyStep(emptyDraft(), 'augs', 'none'), step: 'aug-origin' as const };
    expect(resumeStepIndex(parked)).toBe(CHARGEN_STEPS.indexOf('note'));
  });
});

describe('chargenCmd', () => {
  it('emits plugin verbs the server actually registers', () => {
    expect(chargenCmd(emptyDraft(), 'cash')).toBe('+chargen/cash');
    expect(chargenCmd(emptyDraft(), 'background', 'nodejacker')).toBe('+chargen/bg nodejacker');
    expect(chargenCmd(emptyDraft(), 'belongings', 'holdout')).toBe('+chargen/belongings holdout');
    const rolled = applyStep(emptyDraft(), 'belongings', 'roll', () => 0);
    expect(chargenCmd(rolled, 'belongings', 'roll')).toBe(
      `+chargen/belongings ${rolled.belongings[0]}`,
    );
    expect(chargenCmd(emptyDraft(), 'affectations', 'chrome-nails')).toBe(
      '+chargen/affect chrome-nails',
    );
    expect(chargenCmd(emptyDraft(), 'aug-origin', 'scrimped')).toBe('');
    expect(canAdvance(emptyDraft(), 'note')).toBe(false);
    const draftNote = 'Harbor Keys.\nStill running packets. '.repeat(4);
    const noted = applyStep(emptyDraft(), 'note', `  ${draftNote}`);
    expect(noted.note?.startsWith('  Harbor Keys.\n')).toBe(true);
    expect(noted.note?.includes('\n')).toBe(true);
    expect(canAdvance(noted, 'note')).toBe(true);
    expect(chargenCmd(noted, 'note')).toContain('%r');
    expect(applyStep(emptyDraft(), 'note', 'x'.repeat(6000)).note?.length).toBe(5600);
    expect(canAdvance(emptyDraft(), 'desc')).toBe(false);
    const faced = applyStep(emptyDraft(), 'desc', 'Rain on chrome.');
    expect(canAdvance(faced, 'desc')).toBe(true);
    expect(chargenCmd(faced, 'desc', 'gen')).toBe('+desc/gen');
    expect(chargenCmd(faced, 'desc', 'roll')).toBe('+desc/roll');
    expect(chargenCmd(faced, 'desc')).toBe('+desc/set Rain on chrome.');
    expect(applyStep(emptyDraft(), 'desc', 'x'.repeat(3000)).desc?.length).toBe(2000);
  });

  it('sends the book scores the server already stores as 0–4', () => {
    const draft = emptyDraft();
    draft.stats.cognition = 2;
    draft.stats.reaction = 2;
    expect(chargenCmd(draft, 'stats')).toBe('+chargen/stats MOR=0 EQU=0 REA=2 COG=2 AFF=0');
  });
});

describe('composeDraftLook', () => {
  it('writes a street look from background and affectations', () => {
    const draft = applyStep(
      applyStep(emptyDraft(), 'background', 'nodejacker'),
      'affectations',
      CATALOG.affectations[0]?.slug,
    );
    const look = composeDraftLook(draft, { name: 'NEON', rng: () => 0 });
    expect(look).toMatch(/NEON/);
    expect(look).not.toMatch(/nodejacker/i);
    expect(look.length).toBeGreaterThan(20);
    expect(descReady(look)).toBe(true);
  });

  it('hints the trade without naming it or leaking quirks', () => {
    expect(vibeHint('telemetric-sniper')).not.toMatch(/sniper/i);
    expect(vibeHint('zone-wars-veteran')).not.toMatch(/zone wars veteran/i);
    let draft = applyStep(emptyDraft(), 'background', 'telemetric-sniper');
    draft = applyStep(draft, 'affectations', 'heavy-duster');
    draft = applyStep(draft, 'quirks', 'secret-synthetic');
    const look = composeDraftLook(draft, { name: 'gL17.ch', rng: () => 0.5 });
    expect(look).toMatch(/duster/i);
    expect(look).not.toMatch(/telemetric sniper/i);
    expect(look).not.toMatch(/\bwears\b/i);
    expect(look).not.toMatch(/first glance/i);
    expect(look).not.toMatch(/secret synthetic/i);
    expect(look.endsWith('.')).toBe(true);
  });

  it('stays third person — never “you clock”', () => {
    let draft = applyStep(emptyDraft(), 'background', 'nodejacker');
    draft = applyStep(draft, 'affectations', 'heavy-duster');
    for (const roll of [0, 0.34, 0.5, 0.67, 0.99]) {
      const look = composeDraftLook(draft, { name: 'NEON', rng: () => roll });
      expect(look).not.toMatch(/\byou\b/i);
      expect(look).not.toMatch(/clock/i);
      expect(look).not.toContain('—');
    }
  });
});

describe('lookBodyFromChrome', () => {
  it('keeps the body and drops LOOK chrome', () => {
    expect(
      lookBodyFromChrome('LOOK · NEON\nRain on chrome.\nSPRAWL'),
    ).toBe('Rain on chrome.');
    expect(lookBodyFromChrome('LOOK · NEON\nNo look yet. Try +desc/roll.\nSPRAWL')).toBeNull();
    expect(lookBodyFromChrome('Starting cash 700')).toBeNull();
  });
});
