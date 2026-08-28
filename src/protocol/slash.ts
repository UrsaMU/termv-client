import { lockLine } from './hack';
import { MARKET_CATS, marketCatOf, marketListLine } from './market';

export type SlashCmd = {
  id: string;
  label: string;
  hint: string;
  help: string;
  verb: string;
  aliases: string[];
  wantsTarget: boolean;
  placeholder: string;
  listed?: boolean;
  staff?: boolean;
};

export type SlashLock = {
  label: string;
  insert: string;
};

function gigLine(sw: string, arg = ''): string {
  const extra = arg.trim();
  const name = sw.replace(/^\//, '').toLowerCase();
  if (!name) return extra ? `+gig ${extra}` : '+gig';
  return extra ? `+gig/${name} ${extra}` : `+gig/${name}`;
}

function chargenLine(sw: string, arg = ''): string {
  const extra = arg.trim();
  if (!sw) return extra ? `+chargen ${extra}` : '+chargen';
  return extra ? `+chargen/${sw} ${extra}` : `+chargen/${sw}`;
}

function jobsLine(sw: string, arg = ''): string {
  const extra = arg.trim();
  const name = sw.replace(/^\//, '').toLowerCase();
  if (!name) return extra ? `+job ${extra}` : '+jobs';
  if (/^\d+$/.test(name) && !extra) return `+job ${name}`;
  if (name === 'approve') return extra ? `+job/approve ${extra}` : '+job/approve';
  if (name === 'deny') return extra ? `+job/deny ${extra}` : '+job/deny';
  if (name === 'comment') return extra ? `+request/comment ${extra}` : '+request/comment';
  if (name === 'note' || name === 'ops') return extra ? `+job/note ${extra}` : '+job/note';
  if (name === 'cgen') return '+job/bucket CGEN';
  if (name === 'request') return extra ? `+request ${extra}` : '+request';
  if (name === 'read' || name === 'job') return extra ? `+job ${extra}` : '+job';
  return extra ? `+jobs/${name} ${extra}` : `+jobs/${name}`;
}

function descLine(sw: string, arg = ''): string {
  const extra = arg.trim();
  const name = sw.replace(/^\//, '').toLowerCase();
  if (!name) return extra ? `+desc ${extra}` : '+desc';
  if (name === 'roll') return '+desc/roll';
  if (name === 'gen' || name === 'generate') return '+desc/gen';
  if (name === 'set') return extra ? `+desc/set ${extra}` : '+desc/set';
  if (name === 'clear' || name === 'wipe') return '+desc/clear';
  if (name === 'list') return '+desc/list';
  return extra ? `+desc/${name} ${extra}` : `+desc/${name}`;
}

function shortDescLine(arg = ''): string {
  const extra = arg.trim();
  if (!extra) return '&short-desc me';
  const eq = extra.indexOf('=');
  if (eq >= 0) {
    const who = extra.slice(0, eq).trim() || 'me';
    const text = extra.slice(eq + 1).trim();
    return `&short-desc ${who}=${text}`;
  }
  return `&short-desc me=${extra}`;
}

function marketLine(sw: string, arg = ''): string {
  const extra = arg.trim();
  const name = sw.replace(/^\//, '').toLowerCase();
  if (!name) return extra ? marketListLine(extra) : '+market';
  if (name === 'buy') return extra ? `+market/buy ${extra}` : '+market/buy';
  if (name === 'info') return extra ? `+market/info ${extra}` : '+market/info';
  const cat = marketCatOf(name);
  if (cat.id !== 'all' || name === 'all') {
    return extra ? `+market ${cat.id} ${extra}`.trim() : marketListLine(cat.id);
  }
  return extra ? `+market ${name} ${extra}` : `+market ${name}`;
}

export const SLASH_COMMANDS: SlashCmd[] = [
  {
    id: 'look',
    label: 'LOOK',
    hint: 'SCENE / TARGET',
    help: 'ROOM OR NAME · OPTIONAL',
    verb: 'look',
    aliases: ['look', '/look', 'l', '/l'],
    wantsTarget: true,
    placeholder: 'TARGET · OR BLANK TO SCAN THE ROOM',
    listed: true,
  },
  {
    id: 'help',
    label: 'HELP',
    hint: 'FIELD MANUAL',
    help: 'SLASH YOU CAN FIRE · OR ONE CMD',
    verb: '',
    aliases: ['/help', '/man'],
    wantsTarget: true,
    placeholder: 'look · attack · or blank for all',
    listed: true,
  },
  {
    id: 'chargen',
    label: 'CHARGEN',
    hint: 'START / STAT / BG / CASH',
    help: 'START · STAT · BG · GEAR · CASH · QUIRK · AFFECT · SUBMIT · RESTART',
    verb: '+chargen',
    aliases: ['chargen', '/chargen', '/cgen', '+chargen', 'cgen'],
    wantsTarget: true,
    placeholder: 'start · stat MOR=2 · bg slug · cash · submit · restart confirm',
    listed: true,
  },
  {
    id: 'chargen-start',
    label: 'START',
    hint: 'OPEN DRAFT',
    help: 'JACK A BLANK SHEET',
    verb: '+chargen/start',
    aliases: ['/start', '+chargen/start', '/chargen/start'],
    wantsTarget: false,
    placeholder: '',
  },
  {
    id: 'chargen-stat',
    label: 'STAT',
    hint: 'MOR=N · 4 PTS',
    help: 'PLACE POINTS · FLOOR 0',
    verb: '+chargen/stat',
    aliases: ['/stat', '+chargen/stat', '/chargen/stat'],
    wantsTarget: true,
    placeholder: 'MOR=2 · EQU=1 · REA=0 · COG=1 · AFF=0',
  },
  {
    id: 'chargen-bg',
    label: 'BG',
    hint: 'SLUG | ROLL',
    help: 'ONE BACKGROUND · EDGE RIDES',
    verb: '+chargen/bg',
    aliases: ['/bg', '/background', '+chargen/bg', '+chargen/background'],
    wantsTarget: true,
    placeholder: 'SLUG · OR ROLL',
  },
  {
    id: 'chargen-gear',
    label: 'GEAR',
    hint: 'SLUG | ROLL ×3',
    help: 'THREE BELONGINGS',
    verb: '+chargen/belongings',
    aliases: ['/gear', '/belongings', '+chargen/belongings', '+chargen/gear'],
    wantsTarget: true,
    placeholder: 'SLUG · OR ROLL',
  },
  {
    id: 'chargen-cash',
    label: 'CASH',
    hint: '2d6 × 100',
    help: 'STARTING SCRATCH',
    verb: '+chargen/cash',
    aliases: ['/cash', '+chargen/cash', '/chargen/cash'],
    wantsTarget: false,
    placeholder: '',
  },
  {
    id: 'chargen-quirk',
    label: 'QUIRK',
    hint: 'SLUG | ROLL',
    help: 'ONE HOOK FOR THE GM',
    verb: '+chargen/quirk',
    aliases: ['/quirk', '+chargen/quirk', '/chargen/quirk'],
    wantsTarget: true,
    placeholder: 'SLUG · OR ROLL',
  },
  {
    id: 'chargen-affect',
    label: 'AFFECT',
    hint: 'SLUG | ROLL',
    help: 'HOW YOU READ ON THE STREET',
    verb: '+chargen/affect',
    aliases: ['/affect', '/affectations', '+chargen/affect'],
    wantsTarget: true,
    placeholder: 'SLUG · OR ROLL',
  },
  {
    id: 'chargen-aug',
    label: 'AUG',
    hint: 'ROLL / PICK / NONE',
    help: 'ONE CHROME · OR MEAT',
    verb: '+chargen/aug',
    aliases: ['/aug', '+chargen/aug', '/chargen/aug'],
    wantsTarget: true,
    placeholder: 'none · roll · neurochem',
  },
  {
    id: 'chargen-submit',
    label: 'SUBMIT',
    hint: 'STAFF REVIEW',
    help: 'LOCK THE SHEET',
    verb: '+chargen/submit',
    aliases: ['/submit', '+chargen/submit', '/chargen/submit'],
    wantsTarget: false,
    placeholder: '',
  },
  {
    id: 'chargen-note',
    label: 'NOTE',
    hint: 'SHORT BG',
    help: 'STAFF READS THIS ON THE CGEN JOB',
    verb: '+chargen/note',
    aliases: ['/note', '+note', '+chargen/note', '/chargen/note'],
    wantsTarget: true,
    placeholder: 'who you were before the chrome',
  },
  {
    id: 'desc',
    label: 'DESC',
    hint: 'LOOK / ROLL / SET',
    help: 'WHAT PEOPLE SEE WHEN THEY LOOK',
    verb: '+desc',
    aliases: ['/desc', '+desc'],
    wantsTarget: true,
    placeholder: 'roll · gen · set text',
  },
  {
    id: 'desc-roll',
    label: 'ROLL LOOK',
    hint: 'NEW OPENER',
    help: 'REROLL THE STREET LOOK',
    verb: '+desc/roll',
    aliases: ['/desc/roll', '+desc/roll'],
    wantsTarget: false,
    placeholder: '',
  },
  {
    id: 'desc-gen',
    label: 'GEN LOOK',
    hint: 'REBUILD',
    help: 'REBUILD FROM STYLES',
    verb: '+desc/gen',
    aliases: ['/desc/gen', '+desc/gen', '/desc/generate'],
    wantsTarget: false,
    placeholder: '',
  },
  {
    id: 'desc-set',
    label: 'SET LOOK',
    hint: 'TEXT',
    help: 'WRITE THE BASE LOOK',
    verb: '+desc/set',
    aliases: ['/desc/set', '+desc/set'],
    wantsTarget: true,
    placeholder: 'custom street look',
  },
  {
    id: 'short-desc',
    label: 'SHORT',
    hint: 'ROOM LINE',
    help: '&SHORT-DESC ME=TEXT',
    verb: '&short-desc',
    aliases: ['/short', '/shortdesc', '/short-desc'],
    wantsTarget: true,
    placeholder: 'wet coat in the rain',
    listed: true,
  },
  {
    id: 'chargen-restart',
    label: 'RESTART',
    hint: 'CONFIRM WIPE',
    help: 'WIPE SHEET · NEEDS CONFIRM',
    verb: '+chargen/restart',
    aliases: ['/restart', '+chargen/restart', '/chargen/restart'],
    wantsTarget: true,
    placeholder: 'confirm',
  },
  {
    id: 'chargen-list',
    label: 'LIST',
    hint: 'TOPIC',
    help: 'BACKGROUNDS · BELONGINGS · QUIRKS',
    verb: '+chargen/list',
    aliases: ['/list', '+chargen/list', '/chargen/list'],
    wantsTarget: true,
    placeholder: 'backgrounds · belongings · quirks · affectations',
  },
  {
    id: 'chargen-info',
    label: 'INFO',
    hint: 'SLUG',
    help: 'ONE CATALOG ENTRY',
    verb: '+chargen/info',
    aliases: ['/info', '+chargen/info', '/chargen/info'],
    wantsTarget: true,
    placeholder: 'nodejacker · holdout · scrimped',
  },
  {
    id: 'roll',
    label: 'ROLL',
    hint: 'STAT[/DS]',
    help: 'MOR EQU REA COG AFF',
    verb: '+roll',
    aliases: ['/roll', '+roll'],
    wantsTarget: true,
    placeholder: 'REA · COG/12 · AFF +bg',
    listed: true,
  },
  {
    id: 'roll-rea',
    label: 'REA',
    hint: 'REACTION',
    help: 'SHOOT · SNEAK · DRIVE',
    verb: '+roll REA',
    aliases: ['/rea', '/reaction'],
    wantsTarget: true,
    placeholder: '12 · +upgrade',
  },
  {
    id: 'roll-cog',
    label: 'COG',
    hint: 'COGNITION',
    help: 'HACK · SEARCH · CLOCK',
    verb: '+roll COG',
    aliases: ['/cog', '/cognition'],
    wantsTarget: true,
    placeholder: '12 · +upgrade',
  },
  {
    id: 'roll-aff',
    label: 'AFF',
    hint: 'AFFINITY',
    help: 'TALK · CON · BLUFF',
    verb: '+roll AFF',
    aliases: ['/aff', '/affinity'],
    wantsTarget: true,
    placeholder: '10 · +bg',
  },
  {
    id: 'roll-mor',
    label: 'MOR',
    hint: 'MORPHOLOGY',
    help: 'MELEE · LIFT',
    verb: '+roll MOR',
    aliases: ['/mor', '/morphology'],
    wantsTarget: true,
    placeholder: '10',
  },
  {
    id: 'roll-equ',
    label: 'EQU',
    hint: 'EQUILIBRIUM',
    help: 'NERVE · COOL',
    verb: '+roll EQU',
    aliases: ['/equ', '/equilibrium'],
    wantsTarget: true,
    placeholder: '10',
  },
  {
    id: 'attack',
    label: 'ATTACK',
    hint: 'NPC / DS',
    help: 'HOSTILE · SLUG · #N',
    verb: '+attack',
    aliases: ['attack', '/attack', '/atk'],
    wantsTarget: true,
    placeholder: 'eswat · cop · #12',
    listed: true,
  },
  {
    id: 'attack-aim',
    label: 'AIM',
    hint: 'CALLED SHOT',
    help: 'AIMED +ATTACK',
    verb: '+attack/aim',
    aliases: ['/aim'],
    wantsTarget: true,
    placeholder: 'eswat',
  },
  {
    id: 'attack-burst',
    label: 'BURST',
    hint: 'FULL BURST',
    help: 'BURST +ATTACK',
    verb: '+attack/burst',
    aliases: ['/burst'],
    wantsTarget: true,
    placeholder: 'eswat',
  },
  {
    id: 'attack-auto',
    label: 'AUTO',
    hint: 'FULL AUTO',
    help: 'AUTO +ATTACK',
    verb: '+attack/auto',
    aliases: ['/auto'],
    wantsTarget: true,
    placeholder: 'eswat',
  },
  {
    id: 'attack-reload',
    label: 'RELOAD',
    hint: 'MAG',
    help: 'TOP OFF THE GUN',
    verb: '+reload',
    aliases: ['/reload', '+reload'],
    wantsTarget: false,
    placeholder: '',
  },
  {
    id: 'combat',
    label: 'COMBAT',
    hint: 'STREET',
    help: 'ATTACK ON STREET',
    verb: '',
    aliases: ['/combat', '/fight'],
    wantsTarget: false,
    placeholder: '',
  },
  {
    id: 'npc',
    label: 'NPC',
    hint: 'SPAWN / HERE',
    help: 'STAFF DROP · PLAYER PICK',
    verb: '+npc/spawn',
    aliases: ['/npc', '/hostile', '+npc'],
    wantsTarget: true,
    placeholder: 'sprawl-cop · gang-member',
    listed: true,
  },
  {
    id: 'npc-spawn',
    label: 'SPAWN',
    hint: 'SLUG',
    help: 'DROP AN ANTAGONIST HERE',
    verb: '+npc/spawn',
    aliases: ['/spawn', '/npc/spawn', '+npc/spawn'],
    wantsTarget: true,
    placeholder: 'sprawl-cop',
    staff: true,
  },
  {
    id: 'npc-clear',
    label: 'CLEAR',
    hint: 'HERE',
    help: 'REMOVE ROOM NPCS',
    verb: '+npc/clear',
    aliases: ['/clear', '/npc/clear', '+npc/clear'],
    wantsTarget: true,
    placeholder: 'cop · or blank for all',
    staff: true,
  },
  {
    id: 'heal',
    label: 'HEAL',
    hint: 'FIRST AID',
    help: 'COG vs 10 · +2 RES',
    verb: '+heal',
    aliases: ['/heal', '/aid', '+heal'],
    wantsTarget: false,
    placeholder: '',
  },
  {
    id: 'heal-lazarus',
    label: 'LAZARUS',
    hint: 'PATCH',
    help: '+3 RES · SPEND A BLISTER',
    verb: '+lazarus',
    aliases: ['/lazarus', '/patch', '+lazarus'],
    wantsTarget: false,
    placeholder: '',
  },
  {
    id: 'heal-stabilize',
    label: 'STABILIZE',
    hint: 'BLEED',
    help: 'COG vs 12 · STOP THE CLOCK',
    verb: '+stabilize',
    aliases: ['/stabilize', '+stabilize'],
    wantsTarget: false,
    placeholder: '',
  },
  {
    id: 'heal-rest',
    label: 'REST',
    hint: '8H',
    help: 'EIGHT HOURS · FULL RES',
    verb: '+heal/rest',
    aliases: ['/rest', '+heal/rest'],
    wantsTarget: false,
    placeholder: '',
  },
  {
    id: 'heal-clinic',
    label: 'CLINIC',
    hint: 'MEDPRO',
    help: '250 b¥ · FULL + CLEAR CRIT',
    verb: '+clinic',
    aliases: ['/clinic', '/medpro', '+clinic'],
    wantsTarget: false,
    placeholder: '',
  },
  {
    id: 'gig',
    label: 'GIG',
    hint: 'CONTRACT',
    help: 'PULL · DROP IN · PUSH · TURN IN',
    verb: '+gig',
    aliases: ['gig', '/gig', '+gig'],
    wantsTarget: true,
    placeholder: 'enter · push · turnin · leave',
    listed: true,
  },
  {
    id: 'gig-enter',
    label: 'DROP IN',
    hint: 'SITE',
    help: 'ENTER THE PRIVATE SCENE',
    verb: '+gig/enter',
    aliases: ['/gig/enter', '+gig/enter'],
    wantsTarget: false,
    placeholder: '',
  },
  {
    id: 'gig-push',
    label: 'GO DEEPER',
    hint: 'NEXT NODE',
    help: 'ADVANCE AFTER THE ROOM IS CLEAR',
    verb: '+gig/push',
    aliases: [
      '/gig/push',
      '+gig/push',
      '/push',
      '+push',
      '/deeper',
      '+deeper',
      '/gig/next',
      '+gig/next',
      '/gig/advance',
      '+gig/advance',
    ],
    wantsTarget: false,
    placeholder: '',
  },
  {
    id: 'gig-turnin',
    label: 'TURN IN',
    hint: 'PAYDAY',
    help: 'CASH THE TOKEN',
    verb: '+gig/turnin',
    aliases: ['/gig/turnin', '+gig/turnin', '/turnin'],
    wantsTarget: false,
    placeholder: '',
  },
  {
    id: 'gig-leave',
    label: 'LEAVE',
    hint: 'SITE',
    help: 'WALK OUT · RUN STAYS OPEN',
    verb: '+gig/leave',
    aliases: ['/gig/leave', '+gig/leave'],
    wantsTarget: false,
    placeholder: '',
  },
  {
    id: 'gig-abandon',
    label: 'ABANDON',
    hint: 'QUIT',
    help: 'WIPE THE SITE · NO PAY',
    verb: '+gig/abandon',
    aliases: ['/gig/abandon', '+gig/abandon'],
    wantsTarget: false,
    placeholder: '',
  },
  {
    id: 'jobs',
    label: 'JOBS',
    hint: 'LIST / READ / APPROVE',
    help: 'LIST · READ · APPROVE · DENY · REPLY · OPS · REQUEST',
    verb: '+jobs',
    aliases: ['jobs', '/jobs', '+jobs'],
    wantsTarget: true,
    placeholder: '5 · approve 5=ok · deny 5=no · cgen',
    listed: true,
  },
  {
    id: 'jobs-read',
    label: 'JOB',
    hint: '#',
    help: 'OPEN ONE TICKET',
    verb: '+job',
    aliases: ['/job', '+job'],
    wantsTarget: true,
    placeholder: '5',
  },
  {
    id: 'jobs-approve',
    label: 'APPROVE',
    hint: '#=NOTE',
    help: 'CLOSE + UNLOCK CGEN',
    verb: '+job/approve',
    aliases: ['/approve', '+job/approve', '+jobs/approve', '/jobs/approve'],
    wantsTarget: true,
    placeholder: '5=Looks good',
    staff: true,
  },
  {
    id: 'jobs-deny',
    label: 'DENY',
    hint: '#=NOTE',
    help: 'KICK BACK · NEEDS NOTE',
    verb: '+job/deny',
    aliases: ['/deny', '+job/deny', '+jobs/deny', '/jobs/deny'],
    wantsTarget: true,
    placeholder: '5=Need more note',
    staff: true,
  },
  {
    id: 'jobs-comment',
    label: 'REPLY',
    hint: '#=TEXT',
    help: 'PLAYER REPLY ON YOUR TICKET',
    verb: '+request/comment',
    aliases: ['/comment', '+request/comment', '/request/comment'],
    wantsTarget: true,
    placeholder: '5=Need the note longer',
  },
  {
    id: 'jobs-staff-comment',
    label: 'STAFF REPLY',
    hint: '#=TEXT',
    help: 'VISIBLE TO THE RUNNER',
    verb: '+job/comment',
    aliases: ['+job/comment', '/job/comment'],
    wantsTarget: true,
    placeholder: '5=Need more note',
    staff: true,
  },
  {
    id: 'jobs-ops',
    label: 'OPS NOTE',
    hint: '#=TEXT',
    help: 'STAFF ONLY',
    verb: '+job/note',
    aliases: ['/ops', '+job/note', '/job/note'],
    wantsTarget: true,
    placeholder: '5=check the bg',
    staff: true,
  },
  {
    id: 'jobs-request',
    label: 'REQUEST',
    hint: 'TITLE=TEXT',
    help: 'OPEN A TICKET',
    verb: '+request',
    aliases: ['/request', '+request'],
    wantsTarget: true,
    placeholder: 'lamp flicker=Harbor Keys loop',
  },
  {
    id: 'market',
    label: 'MARKET',
    hint: 'BROWSE / BUY',
    help: 'CAT · BUY · INFO',
    verb: '+market',
    aliases: ['market', '/market', '+market'],
    wantsTarget: true,
    placeholder: 'guns · buy pkd-45 · info hyperion',
    listed: true,
  },
  {
    id: 'market-buy',
    label: 'BUY',
    hint: 'SLUG[=QTY]',
    help: 'SPEND b¥',
    verb: '+market/buy',
    aliases: ['/buy', '+market/buy', '/market/buy'],
    wantsTarget: true,
    placeholder: 'pkd-45 · hyperion=1',
  },
  {
    id: 'market-info',
    label: 'STALL',
    hint: 'SLUG',
    help: 'ONE STOCK ROW',
    verb: '+market/info',
    aliases: ['+market/info', '/market/info'],
    wantsTarget: true,
    placeholder: 'pkd-45 · hyperion',
  },
  {
    id: 'gear-use',
    label: 'USE',
    hint: 'ITEM',
    help: 'ACTIVATE A THING',
    verb: 'use',
    aliases: ['/use', '+use'],
    wantsTarget: true,
    placeholder: 'toolkit · yeheyuan',
  },
  {
    id: 'gear-drop',
    label: 'DROP',
    hint: 'ITEM',
    help: 'LEAVE IT HERE',
    verb: 'drop',
    aliases: ['/drop', '+drop'],
    wantsTarget: true,
    placeholder: 'katana',
  },
  {
    id: 'gear-give',
    label: 'GIVE',
    hint: 'ITEM=WHO',
    help: 'HAND IT OFF',
    verb: 'give',
    aliases: ['/give', '+give'],
    wantsTarget: true,
    placeholder: 'katana=Alice',
  },
  {
    id: 'gear-wear',
    label: 'WEAR',
    hint: 'ARMOR',
    help: 'PUT IT ON',
    verb: 'wear',
    aliases: ['/wear', '+wear', '+gear/wear'],
    wantsTarget: true,
    placeholder: 'vest',
  },
  {
    id: 'gear-wield',
    label: 'WIELD',
    hint: 'WEAPON',
    help: 'IN HAND',
    verb: 'wield',
    aliases: ['/wield', '+wield', '+gear/wield'],
    wantsTarget: true,
    placeholder: 'pkd-45',
  },
  {
    id: 'gear-stow',
    label: 'STOW',
    hint: 'ITEM',
    help: 'BACK IN THE PACK',
    verb: 'stow',
    aliases: ['/stow', '+stow', '+gear/stow'],
    wantsTarget: true,
    placeholder: 'pkd-45',
  },
  {
    id: 'gear-load',
    label: 'LOAD',
    hint: 'GUN=AMMO',
    help: 'CHAMBER SPECIALTY',
    verb: '+gear/load',
    aliases: ['/load', '+gear/load'],
    wantsTarget: true,
    placeholder: 'pkd-45=hellfires',
  },
  {
    id: 'gear-unload',
    label: 'UNLOAD',
    hint: 'GUN',
    help: 'STANDARD ROUNDS',
    verb: '+gear/unload',
    aliases: ['/unload', '+gear/unload'],
    wantsTarget: true,
    placeholder: 'pkd-45',
  },
  {
    id: 'gear-mod',
    label: 'MOD',
    hint: 'HOST=MOD',
    help: 'BOLT IT ON',
    verb: '+gear/mod',
    aliases: ['/mod', '+gear/mod'],
    wantsTarget: true,
    placeholder: 'pkd-45=smart-link',
  },
  {
    id: 'gear-unmod',
    label: 'UNMOD',
    hint: 'HOST=MOD',
    help: 'PULL IT OFF',
    verb: '+gear/unmod',
    aliases: ['/unmod', '+gear/unmod'],
    wantsTarget: true,
    placeholder: 'pkd-45=smart-link',
  },
  {
    id: 'street',
    label: 'STREET',
    hint: 'SCENE',
    help: 'OPEN STREET',
    verb: '',
    aliases: ['/street', '/play'],
    wantsTarget: false,
    placeholder: '',
  },
  {
    id: 'sheet',
    label: 'SHEET',
    hint: 'DOSSIER',
    help: 'OPEN SHEET',
    verb: '',
    aliases: ['/sheet', '/dossier'],
    wantsTarget: false,
    placeholder: '',
  },
  {
    id: 'ping',
    label: 'PING',
    hint: 'DOSSIER',
    help: 'FINGER A HANDLE · BLANK = YOU',
    verb: '+ping',
    aliases: ['/ping', '+ping', 'ping'],
    wantsTarget: true,
    placeholder: 'HANDLE · OR BLANK FOR YOU',
    listed: true,
  },
  {
    id: 'ping-set',
    label: 'PING SET',
    hint: 'FIELD=VALUE',
    help: 'WRITE A PING FIELD ON YOU',
    verb: '+ping/set',
    aliases: ['/ping/set', '+ping/set', '/ping-set'],
    wantsTarget: true,
    placeholder: 'pronouns=they/them',
  },
  {
    id: 'ping-pronouns',
    label: 'PRONOUNS',
    hint: 'PING FIELD',
    help: '&ping-pronouns',
    verb: '+ping/set pronouns=',
    aliases: ['/ping-pronouns', '/ping/pronouns'],
    wantsTarget: true,
    placeholder: 'they/them',
  },
  {
    id: 'ping-timezone',
    label: 'TIMEZONE',
    hint: 'PING FIELD',
    help: '&ping-timezone',
    verb: '+ping/set timezone=',
    aliases: ['/ping-timezone', '/ping/timezone'],
    wantsTarget: true,
    placeholder: 'PT · UTC-8',
  },
  {
    id: 'ping-prefs',
    label: 'PREFS',
    hint: 'PING FIELD',
    help: '&ping-prefs',
    verb: '+ping/set prefs=',
    aliases: ['/ping-prefs', '/ping/prefs'],
    wantsTarget: true,
    placeholder: 'fade to black · no torture',
  },
  {
    id: 'ping-quote',
    label: 'QUOTE',
    hint: 'PING FIELD',
    help: '&ping-quote',
    verb: '+ping/set quote=',
    aliases: ['/ping-quote', '/ping/quote'],
    wantsTarget: true,
    placeholder: 'Stay frosty.',
  },
  {
    id: 'ping-position',
    label: 'POSITION',
    hint: 'PING FIELD',
    help: '&ping-position',
    verb: '+ping/set position=',
    aliases: ['/ping-position', '/ping/position'],
    wantsTarget: true,
    placeholder: 'runner · fixer',
  },
  {
    id: 'wiki',
    label: 'WIKI',
    hint: 'LORE',
    help: 'OPEN THE GRID WIKI',
    verb: '',
    aliases: ['/wiki'],
    wantsTarget: false,
    placeholder: '',
  },
  {
    id: 'inventory',
    label: 'INV',
    hint: 'PACK',
    help: 'OPEN INVENTORY',
    verb: '+gear',
    aliases: ['inv', 'inventory', '/inv', '/inventory', '+inv', '+inventory', '/pack'],
    wantsTarget: false,
    placeholder: '',
  },
  {
    id: 'comms',
    label: 'COMMS',
    hint: 'CHAN / MAIL / BOARDS',
    help: 'OPEN COMMS',
    verb: '',
    aliases: ['/comms', '/mail', '/channels', '/boards'],
    wantsTarget: false,
    placeholder: '',
  },
  {
    id: 'map',
    label: 'MAP',
    hint: 'FLOW',
    help: 'OPEN MAP',
    verb: '',
    aliases: ['/map'],
    wantsTarget: false,
    placeholder: '',
  },
  {
    id: 'haunts',
    label: 'HAUNTS',
    hint: 'DIVES',
    help: 'OPEN HAUNTS',
    verb: '',
    aliases: ['/haunts', '/haunt', '/dives', '/dive'],
    wantsTarget: false,
    placeholder: '',
  },
  {
    id: 'deck',
    label: 'DECK',
    hint: 'RIG',
    help: 'OPEN DECK',
    verb: '',
    aliases: ['/deck'],
    wantsTarget: false,
    placeholder: '',
  },
  {
    id: 'hack',
    label: 'HACK',
    hint: 'LOCK / DS',
    help: 'CRACK A ROOM LOCK',
    verb: '+hack',
    aliases: ['/hack', '+hack'],
    wantsTarget: true,
    placeholder: 'north · panel',
  },
  {
    id: 'lock',
    label: 'LOCK',
    hint: 'RELOCK / DS',
    help: 'SET OR RELOCK A DS LOCK',
    verb: '+lock',
    aliases: ['/lock', '+lock'],
    wantsTarget: true,
    placeholder: 'north · north=ds/12',
  },
  {
    id: 'staff',
    label: 'STAFF',
    hint: 'JOBS',
    help: 'OPEN STAFF',
    verb: '',
    aliases: ['/staff'],
    wantsTarget: false,
    placeholder: '',
    staff: true,
  },
  {
    id: 'console',
    label: 'CONSOLE',
    hint: 'TTY',
    help: 'OPEN THE TAPE',
    verb: '',
    aliases: ['console', '/console', '/tty'],
    wantsTarget: false,
    placeholder: '',
    listed: true,
  },
  {
    id: 'quit',
    label: 'QUIT',
    hint: 'JACK OUT',
    help: 'DROP THE LINK',
    verb: 'quit',
    aliases: ['quit', '/quit', '/exit'],
    wantsTarget: false,
    placeholder: '',
    listed: true,
  },
];

function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function parseSlashLine(raw: string): { cmd: SlashCmd; target: string } | null {
  const line = raw.trim();
  if (!line) return null;
  const ranked = SLASH_COMMANDS.flatMap((cmd) => cmd.aliases.map((alias) => ({ cmd, alias }))).sort(
    (a, b) => b.alias.length - a.alias.length,
  );
  for (const { cmd, alias } of ranked) {
    const match = new RegExp(`^${escapeRe(alias)}(?:\\s+(.*))?$`, 'i').exec(line);
    if (!match) continue;
    return { cmd, target: (match[1] ?? '').trim() };
  }
  return null;
}

export function parseLookLine(raw: string): { verb: 'look'; target: string } | null {
  const hit = parseSlashLine(raw);
  if (!hit || hit.cmd.id !== 'look') return null;
  return { verb: 'look', target: hit.target };
}

export function buildLook(target = ''): string {
  return buildSlash(
    SLASH_COMMANDS.find((cmd) => cmd.id === 'look') ?? SLASH_COMMANDS[0],
    target,
  );
}

function rollLine(abbr: string, extra = ''): string {
  const rest = extra.trim();
  if (!rest) return `+roll ${abbr}`;
  if (rest.startsWith('/')) return `+roll ${abbr}${rest}`;
  const first = rest.split(/\s+/)[0] ?? '';
  if (/^\d+$/.test(first) || /^(easy|moderate|hard|extreme)$/i.test(first)) {
    const [ds, ...more] = rest.split(/\s+/);
    return [`+roll ${abbr}/${ds}`, ...more].join(' ');
  }
  return `+roll ${abbr} ${rest}`;
}

export function buildSlash(cmd: SlashCmd, target = ''): string {
  const arg = target.trim().replace(/\(#[0-9][0-9A-Za-z]*\)$/, '').trim();
  if (cmd.id === 'look') return arg ? `look ${arg}` : 'look';
  if (cmd.id === 'ping') return arg ? `+ping ${arg}` : '+ping';
  if (cmd.id === 'ping-set') return arg ? `+ping/set ${arg}` : '';
  if (cmd.id.startsWith('ping-')) {
    const field = cmd.id.slice('ping-'.length);
    return arg ? `+ping/set ${field}=${arg}` : `+ping/set ${field}`;
  }
  if (cmd.id === 'quit') return 'quit';
  if (cmd.id === 'roll') return arg ? `+roll ${arg}` : '';
  if (cmd.id === 'roll-rea') return rollLine('REA', arg);
  if (cmd.id === 'roll-cog') return rollLine('COG', arg);
  if (cmd.id === 'roll-aff') return rollLine('AFF', arg);
  if (cmd.id === 'roll-mor') return rollLine('MOR', arg);
  if (cmd.id === 'roll-equ') return rollLine('EQU', arg);
  if (cmd.id === 'attack-reload') return '+reload';
  if (cmd.id === 'attack' || cmd.id.startsWith('attack-')) {
    return arg ? `${cmd.verb} ${arg}` : '';
  }
  if (!cmd.verb) return '';
  if (cmd.id === 'chargen') {
    if (!arg) return '+chargen';
    const [sw, ...rest] = arg.split(/\s+/);
    const switchName = (sw ?? '').replace(/^\//, '');
    return chargenLine(switchName, rest.join(' '));
  }
  if (cmd.id === 'gig') {
    if (!arg) return '+gig';
    const [sw, ...rest] = arg.split(/\s+/);
    return gigLine((sw ?? '').replace(/^\//, ''), rest.join(' '));
  }
  if (cmd.id === 'jobs') {
    if (!arg) return '+jobs';
    const [sw, ...rest] = arg.split(/\s+/);
    return jobsLine((sw ?? '').replace(/^\//, ''), rest.join(' '));
  }
  if (cmd.id === 'market') {
    if (!arg) return '+market';
    const [sw, ...rest] = arg.split(/\s+/);
    return marketLine((sw ?? '').replace(/^\//, ''), rest.join(' '));
  }
  if (cmd.id === 'desc') {
    if (!arg) return '+desc';
    const [sw, ...rest] = arg.split(/\s+/);
    return descLine((sw ?? '').replace(/^\//, ''), rest.join(' '));
  }
  if (cmd.id === 'short-desc') return shortDescLine(arg);
  if (cmd.id === 'lock') return lockLine(arg);
  if (!cmd.wantsTarget) return cmd.verb;
  return arg ? `${cmd.verb} ${arg}` : cmd.verb;
}

const CHARGEN_NEEDS_DRAFT = /\/(stat|bg|background|belongings|gear|cash|quirk|affect|aug|note|submit)\b/i;

export function expandSlash(cmd: SlashCmd, target = ''): string[] {
  const line = buildSlash(cmd, target);
  if (!line) return [];
  if (CHARGEN_NEEDS_DRAFT.test(line) && !line.startsWith('+chargen/start')) {
    return ['+chargen/start', line];
  }
  if (cmd.id === 'lock') return [line, 'look'];
  if (cmd.id === 'gig' || cmd.id.startsWith('gig-')) {
    if (line === '+gig') return [line];
    return [line, 'look'];
  }
  return [line];
}

export const CHARGEN_LOCKS: SlashLock[] = [
  { label: 'START', insert: 'start' },
  { label: 'STAT', insert: 'stat ' },
  { label: 'BG', insert: 'bg ' },
  { label: 'GEAR', insert: 'gear ' },
  { label: 'CASH', insert: 'cash' },
  { label: 'QUIRK', insert: 'quirk ' },
  { label: 'AFFECT', insert: 'affect ' },
  { label: 'AUG', insert: 'aug ' },
  { label: 'NOTE', insert: 'note ' },
  { label: 'DESC', insert: 'desc ' },
  { label: 'SUBMIT', insert: 'submit' },
  { label: 'RESTART', insert: 'restart' },
  { label: 'LIST', insert: 'list ' },
  { label: 'INFO', insert: 'info ' },
];

export const RESTART_LOCKS: SlashLock[] = [{ label: 'CONFIRM', insert: 'confirm' }];

export const GIG_LOCKS: SlashLock[] = [
  { label: 'PULL', insert: 'pull' },
  { label: 'DROP IN', insert: 'enter' },
  { label: 'TURN IN', insert: 'turnin' },
  { label: 'LEAVE', insert: 'leave' },
  { label: 'ABANDON', insert: 'abandon' },
];

export const JOBS_LOCKS: SlashLock[] = [
  { label: 'CGEN', insert: 'cgen' },
  { label: 'APPROVE', insert: 'approve ' },
  { label: 'DENY', insert: 'deny ' },
  { label: 'COMMENT', insert: 'comment ' },
  { label: 'REQUEST', insert: 'request ' },
];

export const PING_LOCKS: SlashLock[] = [
  { label: 'PRONOUNS', insert: 'pronouns=' },
  { label: 'TIMEZONE', insert: 'timezone=' },
  { label: 'PREFS', insert: 'prefs=' },
  { label: 'QUOTE', insert: 'quote=' },
  { label: 'POSITION', insert: 'position=' },
  { label: 'HANDLE', insert: 'handle=' },
];

export const MARKET_LOCKS: SlashLock[] = MARKET_CATS.map((cat) => ({
  label: cat.label,
  insert: cat.id === 'all' ? '' : cat.id,
})).filter((lock) => lock.insert);

export function marketReady(insert: string): boolean {
  const key = insert.trim();
  if (!key || /\s/.test(key)) return false;
  if (/^(buy|info)$/i.test(key)) return false;
  return marketCatOf(key).id !== 'all' || /^all$/i.test(key);
}

export function needsMarketScreen(cmd: SlashCmd, _target = ''): boolean {
  return cmd.id === 'market' || cmd.id.startsWith('market-');
}

export function needsConsoleScreen(cmd: SlashCmd): boolean {
  return cmd.id === 'console';
}

export function needsGearScreen(cmd: SlashCmd): boolean {
  return cmd.id === 'inventory' || cmd.id.startsWith('gear-');
}

export function needsCombatScreen(cmd: SlashCmd): boolean {
  return (
    cmd.id === 'attack' ||
    cmd.id.startsWith('attack-') ||
    cmd.id === 'combat' ||
    cmd.id === 'npc' ||
    cmd.id === 'npc-clear'
  );
}

export function isHealSlash(cmd: SlashCmd): boolean {
  return cmd.id === 'heal' || cmd.id.startsWith('heal-');
}

export function attackSlashMode(cmd: SlashCmd): 'aim' | 'burst' | 'auto' | 'reload' | null {
  if (cmd.id === 'attack-burst') return 'burst';
  if (cmd.id === 'attack-auto') return 'auto';
  if (cmd.id === 'attack-aim') return 'aim';
  if (cmd.id === 'attack-reload') return 'reload';
  if (cmd.id === 'attack') return 'aim';
  return null;
}

export type CombatSlashPlan = {
  path: '/play';
  mode: 'aim' | 'burst' | 'auto' | 'reload' | null;
  select: string;
  fire: boolean;
  reload: boolean;
};

/** Named /attack fires on street. Empty /attack stays on street to pick a hostile. */
export function planCombatSlash(cmd: SlashCmd, target = ''): CombatSlashPlan | null {
  if (!needsCombatScreen(cmd)) return null;
  const mode = attackSlashMode(cmd);
  const named = target.trim();
  return {
    path: '/play',
    mode,
    select: named,
    reload: mode === 'reload',
    fire: Boolean(named) && cmd.id !== 'npc' && cmd.id !== 'combat' && mode !== 'reload',
  };
}

/** Tab/click complete on /attack /aim /burst /auto — chips, do not fire. */
export function combatNeedsTarget(cmd: SlashCmd, target = ''): boolean {
  const mode = attackSlashMode(cmd);
  if (!mode || mode === 'reload') return false;
  return !target.trim();
}

/** Plugin line for a named slash attack. Empty pick stays silent. */
export function combatFireLine(cmd: SlashCmd, target = ''): string {
  const plan = planCombatSlash(cmd, target);
  if (!plan) return '';
  if (plan.reload) return '+reload';
  if (!plan.fire) return '';
  const who = plan.select.trim();
  if (!who) return '';
  if (plan.mode === 'burst') return `+attack/burst ${who}`;
  if (plan.mode === 'auto') return `+attack/auto ${who}`;
  return `+attack ${who}`;
}

const PANEL_PATH: Record<string, string> = {
  street: '/play',
  sheet: '/sheet',
  inventory: '/inventory',
  comms: '/comms',
  map: '/map',
  haunts: '/haunts',
  deck: '/deck',
  hack: '/deck',
  staff: '/staff',
  console: '/console',
  market: '/market',
  gig: '/gig',
  ping: '/play',
  wiki: '/wiki',
};

export function panelPathFor(cmd: SlashCmd): string | null {
  if (cmd.id.startsWith('gear-')) return '/inventory';
  if (cmd.id.startsWith('market-')) return '/market';
  if (cmd.id.startsWith('gig-')) return '/play';
  if (cmd.id === 'roll' || cmd.id.startsWith('roll-')) return '/play';
  if (cmd.id === 'npc' || cmd.id.startsWith('npc-')) return null;
  if (cmd.id.startsWith('ping-')) return null;
  if (needsCombatScreen(cmd)) return '/play';
  return PANEL_PATH[cmd.id] ?? null;
}

export function needsGigScreen(cmd: SlashCmd, target = ''): boolean {
  return cmd.id === 'gig' && !target.trim();
}

export function jobsReady(insert: string): boolean {
  return /^(cgen|all|new|mine|open)$/i.test(insert.trim());
}

export function needsJobsScreen(cmd: SlashCmd, target = ''): boolean {
  if (cmd.id === 'jobs-request') return false;
  if (cmd.id === 'jobs') {
    const sw = target.trim().split(/\s+/)[0]?.replace(/^\//, '').toLowerCase() ?? '';
    if (sw === 'request') return false;
    return true;
  }
  return cmd.id.startsWith('jobs-');
}

export function chargenReady(insert: string): boolean {
  return /^(start|cash|submit)$/i.test(insert.trim());
}

export function restartReady(insert: string): boolean {
  return /^(confirm|yes|wipe)$/i.test(insert.trim());
}

export function isRestartSwitch(insert: string): boolean {
  return /^restart\s*$/i.test(insert.trim());
}

export function needsRestartConfirm(cmd: SlashCmd, target = ''): boolean {
  if (cmd.id === 'chargen-restart') return !restartReady(target);
  if (cmd.id === 'chargen') return isRestartSwitch(target);
  return false;
}

export function isQuitLine(line: string): boolean {
  return /^quit$/i.test(line.trim());
}

const WIZARD_IDS = new Set([
  'chargen',
  'chargen-start',
  'chargen-stat',
  'chargen-bg',
  'chargen-gear',
  'chargen-cash',
  'chargen-quirk',
  'chargen-affect',
  'chargen-note',
  'chargen-submit',
  'chargen-restart',
]);

export function needsChargenScreen(cmd: SlashCmd, target = ''): boolean {
  if (cmd.id === 'chargen-list' || cmd.id === 'chargen-info') return false;
  if (cmd.id === 'chargen') {
    const sw = target.trim().split(/\s+/)[0]?.replace(/^\//, '').toLowerCase() ?? '';
    if (sw === 'list' || sw === 'info') return false;
    return true;
  }
  return WIZARD_IDS.has(cmd.id);
}

export function matchSlash(raw: string): SlashCmd[] {
  const q = raw.trim().toLowerCase();
  if (!q) return [];
  // Bare + / @ is a raw command prefix, not a catalog query.
  if (q === '+' || q === '@') return [];
  if (q === '/') return SLASH_COMMANDS.filter((cmd) => cmd.listed);
  return SLASH_COMMANDS.filter((cmd) =>
    cmd.aliases.some((alias) => alias.startsWith(q) || q.startsWith(`${alias} `)),
  );
}

export function restAfterAlias(raw: string, cmd: SlashCmd): string {
  const line = raw.trim();
  const lower = line.toLowerCase();
  const aliases = [...cmd.aliases].sort((a, b) => b.length - a.length);
  for (const alias of aliases) {
    if (lower === alias) return '';
    if (lower.startsWith(`${alias} `)) return line.slice(alias.length).trim();
  }
  return '';
}

/** Click or Tab on an optic row — arm so optional chips show, same as a tap. */
export function slashHitArm(raw: string, cmd: SlashCmd): { cmd: SlashCmd; rest: string } {
  return { cmd, rest: restAfterAlias(raw, cmd) };
}

/** Longest alias that still starts with the typed token. Tab fills this into the box. */
export function completeSlash(raw: string, cmd: SlashCmd): string {
  const line = raw.trim();
  if (!line) {
    return cmd.aliases.find((alias) => alias.startsWith('/')) ?? cmd.aliases[0] ?? `/${cmd.label.toLowerCase()}`;
  }
  const token = line.split(/\s+/)[0] ?? '';
  const typed = token.toLowerCase();
  const rest = restAfterAlias(line, cmd);
  const matches = cmd.aliases.filter((alias) => alias.toLowerCase().startsWith(typed));
  const hit =
    [...matches].sort((a, b) => b.length - a.length)[0] ??
    cmd.aliases.find((alias) => alias.startsWith('/')) ??
    cmd.aliases[0] ??
    token;
  return rest ? `${hit} ${rest}` : hit;
}

export function stepSlashPick(hits: number, pick: number, dir: 1 | -1): number {
  if (hits <= 0) return 0;
  return (pick + dir + hits * 8) % hits;
}

/** New scrollTop so `item` sits inside the list viewport. */
export function revealInView(
  scrollTop: number,
  viewSize: number,
  itemTop: number,
  itemSize: number,
): number {
  if (viewSize <= 0) return scrollTop;
  if (itemTop < scrollTop) return Math.max(0, itemTop);
  const itemBottom = itemTop + itemSize;
  const viewBottom = scrollTop + viewSize;
  if (itemBottom > viewBottom) return Math.max(0, itemBottom - viewSize);
  return scrollTop;
}

export function armableSlash(raw: string): { cmd: SlashCmd; target: string } | null {
  const line = raw.trim();
  if (!/^[/+]/.test(line)) return null;
  const parsed = parseSlashLine(line);
  if (!parsed) return null;
  const token = (line.split(/\s+/)[0] ?? '').toLowerCase();
  const stillTyping = SLASH_COMMANDS.some(
    (cmd) =>
      cmd.id !== parsed.cmd.id &&
      cmd.aliases.some((alias) => {
        const a = alias.toLowerCase();
        return a !== token && a.startsWith(token);
      }),
  );
  if (!/\s/.test(line) && stillTyping) return null;
  return parsed;
}
