import backgrounds from '../data/backgrounds.json';
import belongings from '../data/belongings.json';
import quirks from '../data/quirks.json';
import affectations from '../data/affectations.json';
import augOrigins from '../data/aug-origin.json';
import augmentations from '../data/augmentations.json';

export const CHARGEN_STEPS = [
  'stats',
  'background',
  'belongings',
  'cash',
  'quirks',
  'affectations',
  'augs',
  'aug-origin',
  'note',
  'desc',
] as const;

export type ChargenStep = (typeof CHARGEN_STEPS)[number];

export const STEP_META: Record<ChargenStep, { title: string; next: string; blurb: string }> = {
  stats: {
    title: 'STATS',
    next: 'BACKGROUND',
    blurb: 'Spend 4 points across MOR EQU REA COG AFF. Stats may begin at 0.',
  },
  background: {
    title: 'BACKGROUND',
    next: 'BELONGINGS',
    blurb: 'Pick one. The edge rides along.',
  },
  belongings: {
    title: 'BELONGINGS',
    next: 'CASH',
    blurb: 'Three d66 rolls. Keep what the street hands you.',
  },
  cash: {
    title: 'CASH',
    next: 'QUIRKS',
    blurb: '2d6 × 100 b¥ starting scratch.',
  },
  quirks: {
    title: 'QUIRKS',
    next: 'AFFECTATIONS',
    blurb: 'One hook the GM can pull.',
  },
  affectations: {
    title: 'AFFECTATIONS',
    next: 'AUGS',
    blurb: 'How you read on the street.',
  },
  augs: {
    title: 'AUGS',
    next: 'ORIGIN',
    blurb: 'Everyone gets a roll, a pick, or meat. Chrome does not count as load.',
  },
  'aug-origin': {
    title: 'AUG ORIGIN',
    next: 'NOTE',
    blurb: 'Where the chrome came from.',
  },
  note: {
    title: 'NOTE',
    next: 'LOOK',
    blurb: 'Who you were before the chrome. Staff reads this on the CGEN job.',
  },
  desc: {
    title: 'LOOK',
    next: 'SUBMIT',
    blurb: 'Generate a street look, edit it, then accept. This is what people see when they look at you.',
  },
};

export const NOTE_MIN = 80;
export const NOTE_MAX = 5600;
export const DESC_MAX = 2000;

export function clipNote(raw: string): string {
  return raw.replace(/%r/gi, '\n').slice(0, NOTE_MAX);
}

export function encodeNote(raw: string): string {
  return clipNote(raw).replace(/\r\n/g, '\n').replace(/\n/g, '%r');
}

export function noteReady(raw: string): boolean {
  return clipNote(raw).trim().length >= NOTE_MIN;
}

export function clipDesc(raw: string): string {
  return raw.replace(/%r/gi, '\n').slice(0, DESC_MAX);
}

export function encodeDesc(raw: string): string {
  return clipDesc(raw).replace(/\r\n/g, '\n').replace(/\n/g, '%r');
}

export function descReady(raw: string): boolean {
  return clipDesc(raw).trim().length > 0;
}

function catalogKit(slug: string): string {
  const row = CATALOG.affectations.find((item) => item.slug === slug);
  return (row?.phrase || row?.name || slug.replace(/-/g, ' ')).trim();
}

function listPhrase(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function pickLine(lines: string[], rng: () => number): string {
  return lines[Math.min(lines.length - 1, Math.floor(rng() * lines.length))]!;
}

/** Street impression — never the job title. */
export function vibeHint(background?: string): string {
  const bg = CATALOG.backgrounds.find((row) => row.slug === background);
  const blob = `${bg?.slug ?? ''} ${bg?.name ?? ''}`.toLowerCase();
  if (/sniper|marksman|telemetric/.test(blob)) return 'the kind of stillness that belongs at the far end of a street';
  if (/veteran|zone.wars|soldier|war child/.test(blob)) return 'old combat still sitting in the shoulders';
  if (/nodejack|hack|ghost|datasocial|transmissions/.test(blob)) return 'too much time in other people\'s systems';
  if (/enforcer|syndicate|cop|chauffeur/.test(blob)) return 'someone used to making a crowd part';
  if (/killmorph|cybrid|clone|recoded|robotnik|splice/.test(blob)) return 'a face that almost settles, then doesn\'t';
  if (/nanomancer|biomechanic|chemical|toxic|tecstastic/.test(blob)) return 'a body that has been opened and closed too often';
  if (/cabbie|orbital|strato/.test(blob)) return 'the long-haul stare of someone who lives above the grid';
  if (/jurojin|jurōjin|ultrateen|nexus/.test(blob)) return 'money and appetite wearing a human outline';
  if (/panzer|freak|shikaaree|berserker|fighter/.test(blob)) return 'violence kept on a short leash, and bored';
  if (/mnemonic|envoy|fluid|holo/.test(blob)) return 'someone half in this weather, half in another feed';
  if (/cognition.verif|synthetic.aware/.test(blob)) return 'the polite attention of a scanner that learned manners';
  if (/gang.war|surplus|runaway/.test(blob)) return 'surplus kit and a map of alleys behind the eyes';
  return 'another night-shift face the cameras already filed';
}

/** Instant street look from the draft so GENERATE never waits on a frame. */
export function composeDraftLook(
  draft: ChargenDraft,
  opts: { name?: string; rng?: () => number } = {},
): string {
  const rng = opts.rng ?? Math.random;
  const name = (opts.name ?? 'They').trim() || 'They';
  const hint = vibeHint(draft.background);
  const kit = listPhrase(draft.affectations.map(catalogKit));
  const openers = [
    `${name} comes out of the rain with ${hint}.`,
    `${name} is already in the frame. ${hint.charAt(0).toUpperCase()}${hint.slice(1)}.`,
    `Rain beads on ${name}. ${hint.charAt(0).toUpperCase()}${hint.slice(1)}.`,
  ];
  const bits = [pickLine(openers, rng)];
  if (kit) {
    const kits = [
      `${kit.charAt(0).toUpperCase()}${kit.slice(1)} does most of the talking.`,
      `Nothing about the walk is accidental. ${kit}.`,
      `The rain hits ${kit} first.`,
    ];
    bits.push(pickLine(kits, rng));
  }
  return clipDesc(bits.join(' '));
}

/** Pull the body out of +desc telnet chrome when no JSON frame arrives. */
export function lookBodyFromChrome(raw: string): string | null {
  const lines = clipDesc(raw)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return null;
  const start = lines.findIndex((line) => /^LOOK\b/i.test(line));
  if (start < 0) return null;
  const body = lines
    .slice(start + 1)
    .filter((line) => !/^(SPRAWL|DESC)\b/i.test(line) && !/^[-=]{4,}/.test(line));
  const text = body.join('\n').trim();
  if (!text || /no look yet/i.test(text)) return null;
  return text;
}

export type ChargenDraft = {
  stats: {
    morphology: number;
    equilibrium: number;
    reaction: number;
    cognition: number;
    affinity: number;
  };
  background?: string;
  belongings: string[];
  cash?: number;
  quirks: string[];
  affectations: string[];
  augs: string[];
  augNone?: boolean;
  augOrigin?: string;
  note?: string;
  desc?: string;
  step?: ChargenStep;
  handle?: string;
  status: 'draft' | 'submitted' | 'revision' | 'approved';
};

export function skipChargenStep(draft: ChargenDraft, step?: ChargenStep): boolean {
  return step === 'aug-origin' && draft.augs.length === 0;
}

export function chargenStepOffset(draft: ChargenDraft, from: number, dir: 1 | -1): number {
  let i = from + dir;
  while (i >= 0 && i < CHARGEN_STEPS.length && skipChargenStep(draft, CHARGEN_STEPS[i])) {
    i += dir;
  }
  return i;
}

export function stepIndexOf(step?: ChargenStep): number {
  if (!step) return 0;
  const index = CHARGEN_STEPS.indexOf(step);
  return index < 0 ? 0 : index;
}

/** Resume the saved wizard page, or the first step still open. */
export function resumeStepIndex(draft: ChargenDraft): number {
  if (draft.status === 'submitted' || draft.status === 'approved') {
    return CHARGEN_STEPS.length - 1;
  }
  if (draft.step && CHARGEN_STEPS.includes(draft.step)) {
    const i = stepIndexOf(draft.step);
    if (!skipChargenStep(draft, CHARGEN_STEPS[i])) return i;
    return Math.max(0, Math.min(CHARGEN_STEPS.length - 1, chargenStepOffset(draft, i, 1)));
  }
  for (let i = 0; i < CHARGEN_STEPS.length; i++) {
    if (skipChargenStep(draft, CHARGEN_STEPS[i])) continue;
    if (!canAdvance(draft, CHARGEN_STEPS[i]!)) return i;
  }
  return CHARGEN_STEPS.length - 1;
}

export const STAT_KEYS = [
  'morphology',
  'equilibrium',
  'reaction',
  'cognition',
  'affinity',
] as const;

export const STAT_LABEL: Record<(typeof STAT_KEYS)[number], string> = {
  morphology: 'MORPHOLOGY',
  equilibrium: 'EQUILIBRIUM',
  reaction: 'REACTION',
  cognition: 'COGNITION',
  affinity: 'AFFINITY',
};

export const STAT_ABBR: Record<(typeof STAT_KEYS)[number], string> = {
  morphology: 'MOR',
  equilibrium: 'EQU',
  reaction: 'REA',
  cognition: 'COG',
  affinity: 'AFF',
};

export type StatKey = (typeof STAT_KEYS)[number];

export function statMark(key: StatKey): string {
  return `${STAT_LABEL[key]} [${STAT_ABBR[key]}]`;
}

export const STAT_FLOOR = 0;
export const STAT_CAP = 4;
export const STAT_POINTS = 4;

export const emptyDraft = (): ChargenDraft => ({
  stats: {
    morphology: 0,
    equilibrium: 0,
    reaction: 0,
    cognition: 0,
    affinity: 0,
  },
  belongings: [],
  quirks: [],
  affectations: [],
  augs: [],
  status: 'draft',
});

export function pointsSpent(draft: ChargenDraft): number {
  return STAT_KEYS.reduce((sum, key) => sum + Math.max(STAT_FLOOR, draft.stats[key]), 0);
}

export function pointsLeft(draft: ChargenDraft): number {
  return STAT_POINTS - pointsSpent(draft);
}

export function rollCatalog<T extends { slug: string }>(
  rows: readonly T[],
  rng: () => number = Math.random,
): T {
  if (!rows.length) throw new Error('empty catalog');
  return rows[Math.min(rows.length - 1, Math.floor(rng() * rows.length))]!;
}

export function rollUnused<T extends { slug: string }>(
  rows: readonly T[],
  taken: readonly string[],
  rng: () => number = Math.random,
): T {
  const pool = rows.filter((row) => !taken.includes(row.slug));
  return rollCatalog(pool.length ? pool : rows, rng);
}

export function applyStep(
  draft: ChargenDraft,
  step: ChargenStep,
  value?: string,
  rng: () => number = Math.random,
): ChargenDraft {
  switch (step) {
    case 'background':
      return { ...draft, background: value };
    case 'augs': {
      if (!value || value === 'none' || value === 'meat') return { ...draft, augs: [], augNone: true };
      const slug =
        value === 'roll' || value === '/roll'
          ? rollUnused(CATALOG.augs, draft.augs, rng).slug
          : value;
      if (draft.augs.includes(slug)) return { ...draft, augs: [], augNone: true };
      return { ...draft, augs: [slug], augNone: false };
    }
    case 'aug-origin':
      return { ...draft, augOrigin: value };
    case 'note':
      return { ...draft, note: clipNote(value ?? '') };
    case 'desc':
      return { ...draft, desc: clipDesc(value ?? '') };
    case 'quirks':
      return { ...draft, quirks: value ? [value] : [] };
    case 'affectations':
      return { ...draft, affectations: value ? [value] : [] };
    case 'belongings': {
      if (!value) return draft;
      const slug =
        value === 'roll' || value === '/roll'
          ? rollUnused(CATALOG.belongings, draft.belongings, rng).slug
          : value;
      if (draft.belongings.includes(slug)) {
        return { ...draft, belongings: draft.belongings.filter((kept) => kept !== slug) };
      }
      if (draft.belongings.length >= 3) return draft;
      return { ...draft, belongings: [...draft.belongings, slug] };
    }
    default:
      return draft;
  }
}

export function cashFromLog(lines: Array<{ body: string }>): number | null {
  for (let i = lines.length - 1; i >= 0; i--) {
    const body = lines[i]?.body ?? '';
    if (/chargen reset/i.test(body)) return null;
    const hit = /starting cash\s+(\d+)/i.exec(body);
    if (hit) return Number(hit[1]);
  }
  return null;
}

export function canAdvance(draft: ChargenDraft, step: ChargenStep): boolean {
  switch (step) {
    case 'stats':
      return pointsLeft(draft) === 0;
    case 'background':
      return Boolean(draft.background);
    case 'belongings':
      return draft.belongings.length >= 3;
    case 'cash':
      return draft.cash != null;
    case 'quirks':
      return draft.quirks.length >= 1;
    case 'affectations':
      return draft.affectations.length >= 1;
    case 'augs':
      return Boolean(draft.augNone) || draft.augs.length >= 1;
    case 'aug-origin':
      return draft.augs.length === 0 || Boolean(draft.augOrigin);
    case 'note':
      return noteReady(draft.note ?? '');
    case 'desc':
      return descReady(draft.desc ?? '');
  }
}

export function chargenCmd(draft: ChargenDraft, step: ChargenStep, value?: string): string {
  switch (step) {
    case 'stats':
      return `+chargen/stats ${STAT_KEYS.map(
        (key) =>
          `${STAT_ABBR[key]}=${Math.min(STAT_CAP, Math.max(STAT_FLOOR, draft.stats[key]))}`,
      ).join(' ')}`;
    case 'background':
      return `+chargen/bg ${value ?? draft.background ?? ''}`;
    case 'belongings':
      if (value === 'roll' || value === '/roll') {
        const last = draft.belongings[draft.belongings.length - 1];
        return last ? `+chargen/belongings ${last}` : '+chargen/belongings roll';
      }
      return `+chargen/belongings ${value ?? ''}`;
    case 'cash':
      return '+chargen/cash';
    case 'quirks':
      return `+chargen/quirk ${value ?? ''}`;
    case 'affectations':
      return `+chargen/affect ${value ?? ''}`;
    case 'augs':
      if (draft.augNone || !draft.augs.length) return '+chargen/aug none';
      return `+chargen/aug ${value && value !== 'roll' && value !== '/roll' && value !== 'none' ? value : draft.augs[0]}`;
    case 'aug-origin':
      return '';
    case 'note': {
      const text = encodeNote(value ?? draft.note ?? '');
      return text.trim() ? `+chargen/note ${text}` : '';
    }
    case 'desc': {
      const raw = (value ?? '').trim().toLowerCase();
      if (raw === 'roll') return '+desc/roll';
      if (raw === 'gen' || raw === 'generate') return '+desc/gen';
      const text = encodeDesc(value ?? draft.desc ?? '');
      return text.trim() ? `+desc/set ${text}` : '+desc/gen';
    }
  }
}

export const CATALOG = {
  backgrounds: backgrounds as Array<{
    slug: string;
    name: string;
    edge: { name: string; blurb: string };
  }>,
  belongings: belongings as Array<{ slug: string; name: string; roll: string }>,
  quirks: quirks as Array<{ slug: string; name: string; blurb: string }>,
  affectations: affectations as Array<{ slug: string; name: string; blurb: string; phrase?: string }>,
  augOrigins: augOrigins as Array<{ slug: string; name: string; blurb: string }>,
  augs: augmentations as Array<{ slug: string; name: string; blurb: string; roll?: string }>,
};

const DRAFT_KEY = 'sprawl.chargen.draft';

function normalizeStats(stats: ChargenDraft['stats']): ChargenDraft['stats'] {
  const next = { ...emptyDraft().stats, ...stats };
  const allAtLeastOne = STAT_KEYS.every((key) => next[key] >= 1);
  const total = STAT_KEYS.reduce((sum, key) => sum + next[key], 0);
  if (allAtLeastOne && total > STAT_POINTS) {
    for (const key of STAT_KEYS) next[key] = Math.max(STAT_FLOOR, next[key] - 1);
  }
  for (const key of STAT_KEYS) {
    next[key] = Math.min(STAT_CAP, Math.max(STAT_FLOOR, next[key]));
  }
  return next;
}

export function loadDraft(storage: Storage = localStorage): ChargenDraft {
  try {
    const raw = storage.getItem(DRAFT_KEY);
    if (!raw) return emptyDraft();
    const parsed = JSON.parse(raw) as Partial<ChargenDraft>;
    return {
      ...emptyDraft(),
      ...parsed,
      stats: normalizeStats({ ...emptyDraft().stats, ...parsed.stats }),
      augs: Array.isArray(parsed.augs) ? parsed.augs : [],
    };
  } catch (err) {
    if (err instanceof SyntaxError) return emptyDraft();
    throw err;
  }
}

export function saveDraft(draft: ChargenDraft, storage: Storage = localStorage): void {
  storage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function clearDraft(storage: Storage = localStorage): void {
  storage.removeItem(DRAFT_KEY);
}

export function restartDraft(storage: Storage = localStorage): ChargenDraft {
  clearDraft(storage);
  return emptyDraft();
}

/** True when the outgoing line will actually wipe the server sheet. */
export function isConfirmedRestart(line: string): boolean {
  const hit = /^\+chargen\/restart(?:\s+(.*))?$/i.exec(line.trim());
  if (!hit) return false;
  const arg = (hit[1] ?? '').trim().toLowerCase();
  return (
    arg === 'confirm' ||
    arg === 'yes' ||
    arg === 'wipe' ||
    arg.endsWith(' confirm') ||
    arg.endsWith('=confirm') ||
    arg.endsWith('/confirm')
  );
}
