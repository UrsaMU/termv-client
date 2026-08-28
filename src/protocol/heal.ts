import type { FightPayload, GearItem, RollPayload, SheetPayload } from './frames';

export type HealAct = 'aid' | 'lazarus' | 'stabilize' | 'rest' | 'clinic';

export const HEAL_RULES = {
  firstAid: { heal: 2, ds: 10 },
  stabilize: { heal: 1, ds: 12 },
  lazarus: 3,
  restHours: 8,
  clinic: { cost: 250, name: 'Street medpro' },
} as const;

export function isHealVerb(verb: string): boolean {
  return /^(heal|lazarus|rest|clinic|stabilize)$/i.test(verb.trim());
}

export function isLazarusItem(item: { slug?: string; name?: string; kind?: string }): boolean {
  return /lazarus/i.test(`${item.slug ?? ''} ${item.name ?? ''} ${item.kind ?? ''}`);
}

export function packLazarus<T extends { slug?: string; name?: string; kind?: string }>(items: T[]): T[] {
  return items.filter((item) => isLazarusItem(item));
}

export function healCmd(act: HealAct): string {
  if (act === 'aid') return '+heal';
  if (act === 'rest') return '+heal/rest';
  if (act === 'lazarus') return '+lazarus';
  if (act === 'stabilize') return '+stabilize';
  return '+clinic';
}

export function healActOf(id: string): HealAct | null {
  if (id === 'heal' || id === 'heal-aid') return 'aid';
  if (id === 'heal-lazarus') return 'lazarus';
  if (id === 'heal-stabilize') return 'stabilize';
  if (id === 'heal-rest') return 'rest';
  if (id === 'heal-clinic') return 'clinic';
  return null;
}

export type HealChoice = {
  id: HealAct;
  label: string;
  hint: string;
  ready: boolean;
  why: string;
};

export function healActs(
  sheet: Pick<SheetPayload, 'resilience' | 'resilienceMax' | 'critical' | 'cash'>,
  pack: Array<{ slug?: string; name?: string; kind?: string }> = [],
): HealChoice[] {
  const hurt = sheet.resilience < sheet.resilienceMax;
  const crit = Boolean(sheet.critical);
  const patch = packLazarus(pack).length > 0;
  const cash = sheet.cash ?? 0;
  return [
    {
      id: 'aid',
      label: 'FIRST AID',
      hint: `COG vs ${HEAL_RULES.firstAid.ds} · +${HEAL_RULES.firstAid.heal}`,
      ready: hurt && !crit,
      why: crit ? 'crit blocks aid' : hurt ? '' : 'already full',
    },
    {
      id: 'lazarus',
      label: 'LAZARUS',
      hint: patch ? `+${HEAL_RULES.lazarus} RES` : 'NO PATCH',
      ready: hurt && patch,
      why: patch ? (hurt ? '' : 'already full') : 'buy a blister',
    },
    {
      id: 'stabilize',
      label: 'STABILIZE',
      hint: `COG vs ${HEAL_RULES.stabilize.ds} · stop bleed`,
      ready: crit,
      why: crit ? '' : 'no crit',
    },
    {
      id: 'rest',
      label: 'REST',
      hint: `${HEAL_RULES.restHours}h · full RES`,
      ready: hurt && !crit,
      why: crit ? 'crit needs clinic' : hurt ? '' : 'already full',
    },
    {
      id: 'clinic',
      label: 'CLINIC',
      hint: `${HEAL_RULES.clinic.cost} b¥ · full + clear crit`,
      ready: (hurt || crit) && cash >= HEAL_RULES.clinic.cost,
      why: cash < HEAL_RULES.clinic.cost ? `need ${HEAL_RULES.clinic.cost} b¥` : '',
    },
  ];
}

function clampRes(sheet: SheetPayload, delta: number): SheetPayload {
  const resilience = Math.max(0, Math.min(sheet.resilienceMax, sheet.resilience + delta));
  return { ...sheet, resilience };
}

function fightOf(
  verb: string,
  sheet: SheetPayload,
  amount: number,
  note: string,
  ok = true,
): FightPayload {
  return {
    verb,
    ok,
    who: sheet.name || 'you',
    resilience: sheet.resilience,
    resilienceMax: sheet.resilienceMax,
    amount,
    note,
    critical: sheet.critical,
  };
}

function cogRoll(cog: number, ds: number, title: string): RollPayload {
  const dice = [6, 5];
  const total = cog + dice[0]! + dice[1]!;
  const success = total >= ds;
  return {
    verb: 'heal',
    title,
    stat: 'cognition',
    statShort: 'COG',
    statValue: cog,
    bonuses: 0,
    total,
    ds,
    success,
    margin: total - ds,
    damageToTarget: 0,
    damageToSelf: 0,
    needNerveCheck: false,
    mode: 'aid',
    dice,
    kept: dice,
    explodeBonus: 0,
    doubleSix: false,
    doubleOne: false,
    parts: [`stat ${cog}`],
    flavor: success ? 'the patch takes' : 'hands shake, nothing holds',
    target: 'you',
    line: title === 'STABILIZE' ? '+stabilize' : '+heal',
  };
}

export type HealResult = {
  sheet: SheetPayload;
  cash: number;
  roll: RollPayload | null;
  fight: FightPayload;
  error: string | null;
};

export function applyHeal(
  act: HealAct,
  sheet: SheetPayload,
  pack: GearItem[] = [],
  cog = sheet.stats.cognition,
): HealResult {
  const hurt = sheet.resilience < sheet.resilienceMax;
  if (act === 'aid') {
    if (sheet.critical) {
      return { sheet, cash: sheet.cash, roll: null, fight: fightOf('heal', sheet, 0, 'crit blocks aid', false), error: 'critical — stabilize, then clinic' };
    }
    if (!hurt) {
      return { sheet, cash: sheet.cash, roll: null, fight: fightOf('heal', sheet, 0, 'already full', false), error: 'already full' };
    }
    const roll = cogRoll(cog, HEAL_RULES.firstAid.ds, 'FIRST AID');
    if (!roll.success) {
      return { sheet, cash: sheet.cash, roll, fight: fightOf('heal', sheet, 0, 'first aid fails', false), error: null };
    }
    const next = clampRes(sheet, HEAL_RULES.firstAid.heal);
    return {
      sheet: next,
      cash: next.cash,
      roll,
      fight: fightOf('heal', next, HEAL_RULES.firstAid.heal, `First aid +${HEAL_RULES.firstAid.heal}`),
      error: null,
    };
  }
  if (act === 'lazarus') {
    if (!hurt) {
      return { sheet, cash: sheet.cash, roll: null, fight: fightOf('lazarus', sheet, 0, 'already full', false), error: 'already full' };
    }
    if (!packLazarus(pack).length) {
      return { sheet, cash: sheet.cash, roll: null, fight: fightOf('lazarus', sheet, 0, 'no patch', false), error: 'no Lazarus patch' };
    }
    const next = clampRes(sheet, HEAL_RULES.lazarus);
    return {
      sheet: next,
      cash: next.cash,
      roll: null,
      fight: fightOf('lazarus', next, HEAL_RULES.lazarus, `Lazarus +${HEAL_RULES.lazarus}`),
      error: null,
    };
  }
  if (act === 'stabilize') {
    if (!sheet.critical) {
      return { sheet, cash: sheet.cash, roll: null, fight: fightOf('stabilize', sheet, 0, 'no crit', false), error: 'no critical' };
    }
    const roll = cogRoll(cog, HEAL_RULES.stabilize.ds, 'STABILIZE');
    if (!roll.success) {
      return { sheet, cash: sheet.cash, roll, fight: fightOf('stabilize', sheet, 0, 'stabilize fails', false), error: null };
    }
    const next = clampRes(sheet, HEAL_RULES.stabilize.heal);
    return {
      sheet: next,
      cash: next.cash,
      roll,
      fight: fightOf('stabilize', next, HEAL_RULES.stabilize.heal, 'bleed packed · crit remains'),
      error: null,
    };
  }
  if (act === 'rest') {
    if (sheet.critical) {
      return { sheet, cash: sheet.cash, roll: null, fight: fightOf('rest', sheet, 0, 'crit needs clinic', false), error: 'critical — rest will not clear it' };
    }
    if (!hurt) {
      return { sheet, cash: sheet.cash, roll: null, fight: fightOf('rest', sheet, 0, 'already full', false), error: 'already full' };
    }
    const next = { ...sheet, resilience: sheet.resilienceMax };
    return {
      sheet: next,
      cash: next.cash,
      roll: null,
      fight: fightOf('rest', next, next.resilienceMax, 'Eight hours down.'),
      error: null,
    };
  }
  const cost = HEAL_RULES.clinic.cost;
  if (sheet.cash < cost) {
    return { sheet, cash: sheet.cash, roll: null, fight: fightOf('clinic', sheet, 0, 'cannot pay', false), error: `need ${cost} b¥` };
  }
  if (!hurt && !sheet.critical) {
    return { sheet, cash: sheet.cash, roll: null, fight: fightOf('clinic', sheet, 0, 'already full', false), error: 'already full' };
  }
  const next = { ...sheet, resilience: sheet.resilienceMax, critical: null, cash: sheet.cash - cost };
  return {
    sheet: next,
    cash: next.cash,
    roll: null,
    fight: fightOf('clinic', next, next.resilienceMax, `${HEAL_RULES.clinic.name} · −${cost} b¥`),
    error: null,
  };
}
