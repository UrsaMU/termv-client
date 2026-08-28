import { create } from 'zustand';
import { LiveLink, TransportError, type JobItem, type MailItem, type WikiPage, type WikiStub } from '../live/transport';
import { parseLootLine, payoutFromData, payoutNotice } from '../protocol/reward';
import {
  channelFromWire,
  channelJoinLine,
  channelKey,
  channelRows,
  channelSendLine,
  type ChannelInfo,
  type ChannelPost,
  type ChannelRow,
} from '../protocol/channel';
import {
  boardPostReady,
  boardReplyReady,
  markBoardRead,
  sortBoardPosts,
  type BoardCompose,
  type BoardItem,
  type BoardPost,
} from '../protocol/boards';
import {
  composeReady,
  replyDraft,
  splitRecipients,
  type MailCompose,
  type MailFolder,
} from '../protocol/mail';
import {
  commentReady,
  cgenJobCount,
  filterJobsByFolder,
  jobIsCgen,
  jobIsOpen,
  jobApproveLine,
  jobChargenApproveLine,
  jobBucketOf,
  newJobCount,
  jobDenyLine,
  requestReady,
  type JobCompose,
  type JobFolder,
} from '../protocol/jobs';
import {
  buildMotd,
  emptyFold,
  foldBulletin,
  jobNotice,
  mailNotice,
  unreadMailCount,
  type BulletinFold,
  type MotdBulletin,
  type NoticeDraft,
} from '../protocol/bulletin';
import {
  examineEntry,
  pendingGmEntry,
  pingEntry,
  rollEntry,
  rollEntryFromWire,
  speechFromWire,
  type FeedEntry,
} from '../protocol/feed';
import {
  emptyNet,
  descFromData,
  fightFromData,
  flowFromData,
  gearFromData,
  gigFromData,
  hauntFromData,
  marketFromData,
  netFromData,
  pingFromData,
  sheetFromData,
  sprawlFromWire,
  type FightPayload,
  type PingPayload,
  type FlowDistrict,
  type GearItem,
  type GearPayload,
  type GigPayload,
  type HauntPlace,
  type MarketPayload,
  type NetPayload,
  type RollPayload,
  type SheetPayload,
  type WireMessage,
} from '../protocol/frames';
import {
  gateFromSheet,
  isChargenPrompt,
  isSheetApprovedNotice,
  type ChargenGate,
} from '../protocol/chargen-gate';
import { clearDraft, isConfirmedRestart, lookBodyFromChrome, restartDraft } from '../protocol/chargen';
import { examineFromLook, isCmdEcho, isLoginUi, isLookUi, lookFromRoom, roomFromLook, type ExamineView, type RoomView } from '../protocol/look';
import {
  activityKeyFor,
  clearActivity,
  emptyActivity,
  markIfAway,
  type ActivityKey,
  type ActivityMap,
} from '../protocol/activity';
import { applyGearAct, gearCmd, type GearAct } from '../protocol/gear';
import {
  applyAttackToHostile,
  attackActs,
  attackCmd,
  attackReady,
  attackRef,
  examineFromHostile,
  fireModeCmd,
  hostilesFromRoom,
  hostileForLook,
  localAttackRoll,
  matchHostile,
  overlayHostiles,
  pickWielded,
  rangeAttackMod,
  rangeCmd,
  rangeMetres,
  weaponRangeM,
  attackKit,
  type FireMode,
  type Hostile,
  type RangeStance,
} from '../protocol/combat';
import { applyHeal, healCmd, type HealAct } from '../protocol/heal';
import { clearNpcCmd, findNpc, nextNpcId, npcClearNotice, npcRow, spawnCmd } from '../protocol/npcs';
import { leftoverLines } from '../protocol/wire';
import {
  appendConsole,
  bangError,
  consoleEcho,
  isConsoleError,
  lookToConsole,
  speechToConsole,
  type ConsoleLine,
} from '../protocol/console';
import { expandSlash, isQuitLine, parseSlashLine, type SlashCmd } from '../protocol/slash';
import { routeInput, type InputMode } from '../protocol/speech';

const HOST_KEY = 'sprawl.host';
const WS_KEY = 'sprawl.ws';
const ALIAS_KEY = 'sprawl.alias';

export type TabId = 'street' | 'sheet' | 'deck' | 'map' | 'comms';
export type GearSlot = 'wielded' | 'worn' | 'carried';

export type { ChannelRow };
export type CommsTab = 'channels' | 'mail' | 'boards' | 'jobs';
export type Notice = NoticeDraft & { id: string };

export type SessionState = {
  linked: boolean;
  alias: string;
  flags: string;
  host: string;
  wsHost: string;
  error: string | null;
  busy: boolean;
  room: RoomView;
  lookTick: number;
  lookDesc: string;
  feed: FeedEntry[];
  consoleLog: ConsoleLine[];
  sheet: SheetPayload | null;
  roll: RollPayload | null;
  fight: FightPayload | null;
  combatTarget: Hostile | null;
  combatRangeM: number;
  combatMode: Exclude<FireMode, 'reload'>;
  inputMode: InputMode;
  modeOpen: boolean;
  staff: boolean;
  gig: GigPayload | null;
  ping: PingPayload | null;
  wikiPages: WikiStub[];
  wikiPage: WikiPage | null;
  net: NetPayload;
  gear: GearPayload;
  market: MarketPayload;
  flow: FlowDistrict[];
  haunts: HauntPlace[];
  channels: ChannelInfo[];
  channelMeta: ChannelRow[];
  mail: MailItem[];
  mailUnread: number;
  mailFolder: MailFolder;
  mailCompose: MailCompose | null;
  openMail: MailItem | null;
  jobs: JobItem[];
  jobFolder: JobFolder;
  openJob: JobItem | null;
  jobCompose: JobCompose | null;
  jobPending: number;
  commsTab: CommsTab;
  activeChannel: ChannelInfo | null;
  comms: Record<string, ChannelPost[]>;
  boards: BoardItem[];
  openBoard: BoardItem | null;
  boardPosts: BoardPost[];
  openBoardPost: BoardPost | null;
  boardCompose: BoardCompose | null;
  pendingGm: boolean;
  heat: number;
  district: string;
  needsChargen: ChargenGate;
  chargenGen: number;
  motd: MotdBulletin | null;
  motdOpen: boolean;
  notices: Notice[];
  here: string;
  activity: ActivityMap;
  loadWiki: () => Promise<void>;
  openWiki: (path: string) => Promise<void>;
  closeWiki: () => void;
  seenPath: (path: string) => void;
  jackIn: (name: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setNeedsChargen: (gate: ChargenGate) => void;
  dismissMotd: () => void;
  dismissNotice: (id: string) => void;
  setCommsTab: (tab: CommsTab) => void;
  openChannel: (id: string) => Promise<void>;
  closeChannel: () => void;
  sendChannel: (text: string, mode?: 'say' | 'pose') => void;
  loadBoards: () => Promise<void>;
  selectBoard: (id: string) => Promise<void>;
  closeBoard: () => void;
  readBoardPost: (id: string) => void;
  closeBoardPost: () => void;
  openBoardCompose: () => void;
  closeBoardCompose: () => void;
  setBoardCompose: (draft: BoardCompose) => void;
  sendBoardPost: () => Promise<void>;
  sendBoardReply: (note: string) => Promise<boolean>;
  selectHostile: (target: Hostile | string | null) => void;
  setCombatRange: (stance: RangeStance | 'back' | 'cover') => void;
  setCombatMode: (mode: FireMode) => void;
  attackHostile: (fallback?: string) => boolean;
  lookHostile: (target: Hostile | string) => void;
  spawnNpc: (ref: string, name?: string) => void;
  clearNpc: (ref?: string) => void;
  healSelf: (act: HealAct) => void;
  refreshGear: () => void;
  useGear: (act: GearAct['id'], ref: string, extra?: string) => void;
  setMailFolder: (folder: MailFolder) => Promise<void>;
  readMail: (id: string) => Promise<void>;
  closeMail: () => void;
  openCompose: (seed?: Partial<MailCompose>) => void;
  closeCompose: () => void;
  setCompose: (draft: MailCompose) => void;
  sendMail: () => Promise<void>;
  replyMail: () => void;
  trashMail: (id: string) => Promise<void>;
  restoreMail: (id: string) => Promise<void>;
  starMail: (id: string) => Promise<void>;
  loadJobs: () => Promise<void>;
  fileCgenJob: () => Promise<void>;
  setJobFolder: (folder: JobFolder) => Promise<void>;
  readJob: (id: string) => Promise<void>;
  closeJob: () => void;
  openJobCompose: (seed?: Partial<JobCompose>) => void;
  closeJobCompose: () => void;
  setJobCompose: (draft: JobCompose) => void;
  sendJobRequest: () => Promise<void>;
  commentJob: (id: string, note: string, staffOnly?: boolean) => Promise<boolean>;
  approveJob: (id: string, note?: string) => Promise<void>;
  denyJob: (id: string, note: string) => Promise<void>;
  send: (line: string, opts?: { echo?: boolean }) => void;
  speak: (text: string) => void;
  slashCmd: SlashCmd | null;
  slashTarget: string;
  armSlash: (cmd: SlashCmd, target?: string) => void;
  disarmSlash: () => void;
  setSlashTarget: (target: string) => void;
  pushLook: (view: ExamineView) => void;
  setInputMode: (mode: InputMode) => void;
  setModeOpen: (open: boolean) => void;
  setHosts: (host: string, ws: string) => void;
  openRoll: (roll: RollPayload | null) => void;
};

const emptyRoom: RoomView = {
  name: 'UNLINKED',
  description: '',
  people: [],
  stuff: [],
  exits: [],
};

function envHost(): string | undefined {
  const v = (import.meta as ImportMeta & { env?: Record<string, string> }).env
    ?.VITE_API_URL;
  return v?.trim() || undefined;
}

function envWs(): string | undefined {
  const v = (import.meta as ImportMeta & { env?: Record<string, string> }).env
    ?.VITE_WS_URL;
  return v?.trim() || undefined;
}

function readHost(): string {
  return localStorage.getItem(HOST_KEY) ?? envHost() ?? 'http://127.0.0.1:4303';
}

function readWs(): string {
  return localStorage.getItem(WS_KEY) ?? envWs() ?? 'ws://127.0.0.1:4302';
}

let live: LiveLink | null = null;
let chargenWaiters: Array<(gate: ChargenGate) => void> = [];
let bulletin: BulletinFold = emptyFold();
let noticeSeq = 0;

function pushNotices(
  drafts: NoticeDraft[],
  set: (partial: Partial<SessionState>) => void,
  get: () => SessionState,
): void {
  if (!drafts.length) return;
  const existing = get().notices;
  const next = [...existing];
  for (const draft of drafts) {
    if ((draft.kind === 'mail' || draft.kind === 'jobs') && next.some((n) => n.kind === draft.kind)) {
      continue;
    }
    noticeSeq += 1;
    next.push({ ...draft, id: `n-${noticeSeq}` });
  }
  set({ notices: next.slice(-6) });
}

function applyMotd(
  set: (partial: Partial<SessionState>) => void,
  get: () => SessionState,
): void {
  if (!get().linked) return;
  if (get().motd && !get().motdOpen) return;
  const motd = buildMotd(bulletin);
  if (!motd) return;
  set({ motd, motdOpen: true });
}

function publishChargen(gate: ChargenGate): void {
  const waiters = chargenWaiters;
  chargenWaiters = [];
  for (const wait of waiters) wait(gate);
}

function gearMark(gear: GearPayload): string {
  return `${gear.load}/${gear.loadMax}|${gear.items
    .map((item) => `${item.name}:${item.slot}:${item.load}`)
    .join(',')}`;
}

function bumpActivity(
  key: ActivityKey,
  set: (partial: Partial<SessionState>) => void,
  get: () => SessionState,
): void {
  const here = get().here;
  if (!here || here === '/') return;
  const next = markIfAway(get().activity, key, here);
  if (next === get().activity) return;
  set({ activity: next });
}

function waitForChargen(get: () => SessionState, timeoutMs: number): Promise<ChargenGate> {
  const current = get().needsChargen;
  if (current !== 'unknown') return Promise.resolve(current);
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      resolve(get().needsChargen);
    }, timeoutMs);
    chargenWaiters.push((gate) => {
      window.clearTimeout(timer);
      resolve(gate);
    });
  });
}

function staffFromFlags(flags: string): boolean {
  const fl = flags.toLowerCase();
  return ['wizard', 'admin', 'superuser', 'staff'].some((flag) => fl.includes(flag));
}

export const useSession = create<SessionState>((set, get) => ({
  linked: false,
  alias: localStorage.getItem(ALIAS_KEY) ?? '',
  flags: '',
  host: readHost(),
  wsHost: readWs(),
  error: null,
  busy: false,
  room: emptyRoom,
  lookTick: 0,
  lookDesc: '',
  feed: [],
  consoleLog: [],
  sheet: null,
  roll: null,
  fight: null,
  combatTarget: null,
  combatRangeM: 15,
  combatMode: 'aim',
  inputMode: 'pose',
  modeOpen: false,
  staff: false,
  gig: null,
  ping: null,
  wikiPages: [],
  wikiPage: null,
  net: emptyNet(),
  gear: { load: 0, loadMax: 10, items: [] },
  market: { cash: 0, items: [] },
  flow: [],
  haunts: [],
  channels: [],
  channelMeta: [],
  mail: [],
  mailUnread: 0,
  mailFolder: 'inbox',
  mailCompose: null,
  openMail: null,
  jobs: [],
  jobFolder: 'open',
  openJob: null,
  jobCompose: null,
  jobPending: 0,
  commsTab: 'channels',
  activeChannel: null,
  boards: [],
  openBoard: null,
  boardPosts: [],
  openBoardPost: null,
  boardCompose: null,
  comms: {},
  pendingGm: false,
  heat: 0,
  district: 'HARBOR KEYS',
  needsChargen: 'unknown',
  chargenGen: 0,
  slashCmd: null,
  slashTarget: '',
  motd: null,
  motdOpen: false,
  notices: [],
  here: '/',
  activity: emptyActivity(),
  seenPath: (path) => {
    const key = activityKeyFor(path);
    set({
      here: path,
      activity: key ? clearActivity(get().activity, key) : get().activity,
    });
  },
  loadWiki: async () => {
    if (!live) {
      set({ error: 'not linked' });
      return;
    }
    try {
      const wikiPages = await live.listWiki();
      set({ wikiPages, error: null });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },
  openWiki: async (path) => {
    if (!live) {
      set({ error: 'not linked' });
      return;
    }
    try {
      const wikiPage = await live.getWiki(path);
      set({ wikiPage, error: wikiPage ? null : 'page not found' });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },
  closeWiki: () => set({ wikiPage: null }),

  setHosts: (host, ws) => {
    localStorage.setItem(HOST_KEY, host);
    localStorage.setItem(WS_KEY, ws);
    set({ host, wsHost: ws });
  },

  setInputMode: (inputMode) => set({ inputMode, modeOpen: false }),
  setModeOpen: (modeOpen) => set({ modeOpen }),
  armSlash: (slashCmd, slashTarget = '') =>
    set({ slashCmd, slashTarget, modeOpen: false }),
  disarmSlash: () => set({ slashCmd: null, slashTarget: '' }),
  pushLook: (view) => set({ feed: [...get().feed, examineEntry(view)] }),
  setSlashTarget: (slashTarget) => set({ slashTarget }),
  setNeedsChargen: (needsChargen) => {
    set({ needsChargen });
    publishChargen(needsChargen);
  },
  dismissMotd: () => set({ motdOpen: false }),
  dismissNotice: (id) => set({ notices: get().notices.filter((n) => n.id !== id) }),
  setCommsTab: (commsTab) => set({ commsTab, activeChannel: commsTab === 'channels' ? get().activeChannel : null }),
  closeChannel: () => set({ activeChannel: null }),
  closeBoard: () => set({ openBoard: null, boardPosts: [], openBoardPost: null, boardCompose: null }),
  closeBoardPost: () => set({ openBoardPost: null }),
  readBoardPost: (id) => {
    const post = get().boardPosts.find((row) => row.id === id);
    set({ openBoardPost: post ?? null, boardCompose: null });
  },
  openBoardCompose: () =>
    set({ boardCompose: { subject: '', body: '' }, openBoardPost: null }),
  closeBoardCompose: () => set({ boardCompose: null }),
  setBoardCompose: (boardCompose) => set({ boardCompose }),
  sendBoardPost: async () => {
    const board = get().openBoard;
    const draft = get().boardCompose;
    if (!board || !draft || !boardPostReady(draft)) {
      set({ error: 'post needs subject and body' });
      return;
    }
    if (!live) {
      const post: BoardPost = {
        id: `bp-local-${Date.now()}`,
        num: get().boardPosts.reduce((max, row) => Math.max(max, row.num), 0) + 1,
        subject: draft.subject.trim(),
        from: get().alias || 'YOU',
        body: draft.body.trim(),
        date: Date.now(),
        sticky: false,
        replies: [],
      };
      set({
        boardPosts: sortBoardPosts([...get().boardPosts, post]),
        boardCompose: null,
        error: null,
      });
      return;
    }
    try {
      await live.createBoardPost(board.id, draft.subject.trim(), draft.body.trim());
      const posts = await live.listBoardPosts(board.id);
      set({ boardPosts: posts, boardCompose: null, error: null });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },
  selectHostile: (target) => {
    if (!target) {
      set({ combatTarget: null, error: null });
      return;
    }
    const listed = overlayHostiles(get().room, get().combatTarget);
    if (typeof target !== 'string') {
      const hit = matchHostile(listed, target);
      set({ combatTarget: hit ? { ...hit, ...target } : target, error: null });
      return;
    }
    const hit = matchHostile(listed, target);
    set({ combatTarget: hit, error: hit ? null : 'no hostile' });
  },
  setCombatRange: (band) => {
    const stance: RangeStance = band === 'back' || band === 'break' ? 'break' : band === 'cover' || band === 'street' ? 'street' : 'close';
    const gun = pickWielded(get().gear.items);
    const metres = rangeMetres(stance, weaponRangeM(gun));
    set({ combatRangeM: metres, error: null });
    if (live) get().send(rangeCmd(stance, weaponRangeM(gun)));
  },
  setCombatMode: (mode) => {
    if (mode === 'reload') {
      const gun = pickWielded(get().gear.items);
      if (!live) {
        if (gun && gun.magMax != null) {
          set({
            gear: {
              ...get().gear,
              items: get().gear.items.map((row) =>
                row.slug === gun.slug && row.name === gun.name ? { ...row, mag: row.magMax } : row,
              ),
            },
            error: null,
          });
        }
        return;
      }
      get().send(fireModeCmd('reload'));
      return;
    }
    set({ combatMode: mode, error: null });
  },
  refreshGear: () => {
    if (live) get().send('+gear');
  },
  useGear: (act, ref, extra = '') => {
    set({
      gear: { ...get().gear, items: applyGearAct(get().gear.items, act, ref, extra) },
      error: null,
    });
    if (!live) return;
    const line = gearCmd(act, ref, extra);
    if (line) get().send(line);
  },
  attackHostile: (fallback = '') => {
    const listed = overlayHostiles(get().room, get().combatTarget);
    const named = fallback.trim();
    const target =
      (named ? matchHostile(listed, named) : get().combatTarget) ??
      listed.find((row) => !row.dead) ??
      null;
    const mode = get().combatMode;
    const line =
      target && attackReady(target)
        ? attackCmd(attackRef(target), mode)
        : named
          ? attackCmd(named, mode)
          : '';
    if (!line) {
      set({ error: 'no target' });
      return false;
    }
    set({ error: null });
    if (!live) {
      if (!target || !attackReady(target)) return true;
      const stat = get().sheet?.stats.reaction ?? 2;
      const bonus = attackKit(get().gear.items, mode).total;
      const gun = pickWielded(get().gear.items);
      const range = rangeAttackMod(get().combatRangeM, gun);
      const roll = localAttackRoll(target, stat, bonus, mode, range);
      const next = applyAttackToHostile(target, roll);
      set({
        combatTarget: next,
        roll,
        feed: [...get().feed, rollEntry(roll)],
        error: null,
      });
      return true;
    }
    get().send(line);
    return true;
  },
  lookHostile: (target) => {
    const listed = overlayHostiles(get().room, get().combatTarget);
    const hit = matchHostile(listed, target);
    if (!hit) {
      set({ error: 'no hostile' });
      return;
    }
    set({ combatTarget: hit, error: null });
    const acts = attackActs(hit, attackKit(get().gear.items, get().combatMode).total);
    if (live) {
      get().send(hit.id ? `look #${hit.id}` : `look ${hit.name}`);
      return;
    }
    set({
      combatTarget: hit,
      feed: [...get().feed, examineEntry(examineFromHostile(hit), acts)],
      error: null,
    });
  },
  spawnNpc: (ref, name = '') => {
    const row = findNpc(ref);
    if (!row) {
      set({ error: `unknown antagonist ${ref}` });
      return;
    }
    if (live) {
      const line = spawnCmd(row.slug, name);
      if (line) get().send(line);
      get().send('look');
      return;
    }
    const room = get().room;
    const id = nextNpcId([...room.people, ...room.stuff]);
    const spawned = npcRow(row, id);
    set({
      room: { ...room, stuff: [...room.stuff, spawned] },
      error: null,
    });
  },
  clearNpc: (ref = '') => {
    const q = ref.trim().toLowerCase().replace(/^#/, '');
    const room = get().room;
    const stuff = q
      ? room.stuff.filter((row) => {
          const blob = `${row.label} ${row.id ?? ''}`.toLowerCase();
          return !blob.includes(q);
        })
      : room.stuff.filter((row) => !/npc|horde/i.test(`${row.flag} ${row.sub}`));
    const removed = room.stuff.length - stuff.length;
    pushNotices([npcClearNotice(removed, ref)], set, get);
    set({
      room: { ...room, stuff },
      combatTarget: null,
      error: null,
    });
    if (live) {
      get().send(clearNpcCmd(ref));
      get().send('look');
    }
  },
  healSelf: (act) => {
    const sheet = get().sheet;
    if (!sheet) {
      set({ error: 'no sheet' });
      return;
    }
    if (live) {
      const line = healCmd(act);
      if (line) get().send(line);
      get().send('+sheet');
      get().send('+gear');
      return;
    }
    const result = applyHeal(act, sheet, get().gear.items, sheet.stats.cognition);
    if (result.error && !result.roll) {
      set({ error: result.error, fight: result.fight });
      return;
    }
    set({
      sheet: result.sheet,
      fight: result.fight,
      roll: result.roll,
      error: result.error,
    });
  },
  sendBoardReply: async (note) => {
    const board = get().openBoard;
    const post = get().openBoardPost;
    if (!board || !post || !boardReplyReady(note)) {
      set({ error: 'reply needs text' });
      return false;
    }
    if (!live) {
      const reply = {
        num: post.replies.length + 1,
        from: get().alias || 'YOU',
        body: note.trim(),
        date: Date.now(),
      };
      const next = { ...post, replies: [...post.replies, reply] };
      set({
        openBoardPost: next,
        boardPosts: get().boardPosts.map((row) => (row.id === post.id ? next : row)),
        error: null,
      });
      return true;
    }
    try {
      await live.replyBoardPost(board.id, post.num, note.trim());
      const posts = await live.listBoardPosts(board.id);
      const open = posts.find((row) => row.id === post.id) ?? posts.find((row) => row.num === post.num) ?? null;
      set({ boardPosts: posts, openBoardPost: open, error: null });
      return true;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
      return false;
    }
  },
  openChannel: async (id) => {
    const chan =
      get().channels.find((row) => row.id === id || channelKey(row.name) === channelKey(id)) ??
      get().channelMeta.find((row) => row.id === id || channelKey(row.name) === channelKey(id));
    if (!chan) {
      set({ error: 'channel not found' });
      return;
    }
    set({ activeChannel: chan, commsTab: 'channels', error: null });
    if (!live) return;
    try {
      get().send(channelJoinLine(chan.alias, chan.name), { echo: true });
      const hist = await live.history(chan);
      const key = channelKey(chan.name);
      const comms = { ...get().comms, [key]: hist };
      set({
        comms,
        channelMeta: channelRows(get().channels, comms),
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },
  sendChannel: (text, mode = 'say') => {
    const chan = get().activeChannel;
    const line = chan ? channelSendLine(chan.alias, text, mode) : '';
    if (!text.trim()) return;
    if (!chan || !line) {
      set({ error: 'join a channel first' });
      return;
    }
    if (!live) {
      const key = channelKey(chan.name);
      const post: ChannelPost = {
        id: `cp-local-${Date.now()}`,
        channel: chan.name,
        from: get().alias || 'YOU',
        body: text.trim(),
        at: Date.now(),
        mode,
      };
      const comms = { ...get().comms, [key]: [...(get().comms[key] ?? []), post] };
      set({ comms, channelMeta: channelRows(get().channels, comms), error: null });
      return;
    }
    get().send(line);
  },
  loadBoards: async () => {
    if (!live) return;
    try {
      const boards = await live.listBoards();
      set({ boards, error: null });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },
  selectBoard: async (id) => {
    const board = get().boards.find((row) => row.id === id);
    if (!board) {
      set({ error: 'board not found' });
      return;
    }
    set({
      openBoard: board,
      openBoardPost: null,
      boardCompose: null,
      commsTab: 'boards',
      error: null,
      boards: markBoardRead(get().boards, id),
    });
    if (!live) return;
    try {
      const posts = await live.listBoardPosts(id);
      set({ boardPosts: posts, error: null });
      void live.markBoardRead(id);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },
  closeMail: () => set({ openMail: null }),
  closeCompose: () => set({ mailCompose: null }),
  openCompose: (seed) =>
    set({
      openMail: null,
      commsTab: 'mail',
      mailCompose: { to: seed?.to ?? '', subject: seed?.subject ?? '', body: seed?.body ?? '' },
    }),
  setCompose: (mailCompose) => set({ mailCompose }),
  replyMail: () => {
    const open = get().openMail;
    if (!open) return;
    get().openCompose(replyDraft(open));
  },
  setMailFolder: async (folder) => {
    set({ mailFolder: folder, openMail: null, commsTab: 'mail' });
    await loadMail(set, get, folder);
  },
  readMail: async (id) => {
    const cached = get().mail.find((row) => row.id === id);
    if (!live) {
      if (!cached) {
        set({ error: 'not linked' });
        return;
      }
      const mail = get().mail.map((row) =>
        row.id === id ? { ...row, state: 'read' as const } : row,
      );
      set({
        openMail: { ...cached, state: 'read' },
        mail,
        mailUnread: get().mailFolder === 'inbox' ? unreadMailCount(mail) : get().mailUnread,
        commsTab: 'mail',
        mailCompose: null,
        error: null,
      });
      return;
    }
    try {
      const item = await live.getMail(id, get().mailFolder);
      if (!item) {
        set({ error: 'mail not found' });
        return;
      }
      const mail = get().mail.map((row) => (row.id === item.id ? { ...row, ...item, state: 'read' as const } : row));
      const unread = get().mailFolder === 'inbox' ? unreadMailCount(mail) : get().mailUnread;
      set({
        openMail: { ...item, state: 'read' },
        mail,
        mailUnread: unread,
        commsTab: 'mail',
        mailCompose: null,
        notices: unread ? get().notices : get().notices.filter((n) => n.kind !== 'mail'),
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },
  sendMail: async () => {
    const draft = get().mailCompose;
    if (!draft || !composeReady(draft) || !live) {
      set({ error: draft ? 'mail needs to, subject, and body' : 'not linked' });
      return;
    }
    try {
      await live.sendMail(splitRecipients(draft.to), draft.subject.trim(), draft.body.trim());
      set({ mailCompose: null, error: null });
      await loadMail(set, get, get().mailFolder);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },
  trashMail: async (id) => {
    if (!live) {
      set({ error: 'not linked' });
      return;
    }
    try {
      await live.deleteMail(id);
      set({ openMail: null });
      await loadMail(set, get, get().mailFolder);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },
  restoreMail: async (id) => {
    if (!live) {
      set({ error: 'not linked' });
      return;
    }
    try {
      await live.patchMail(id, { folder: 'inbox' });
      set({ openMail: null });
      await loadMail(set, get, get().mailFolder);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },
  loadJobs: async () => {
    await loadJobs(set, get);
  },
  fileCgenJob: async () => {
    await fileCgenJob(set, get);
  },
  closeJob: () => set({ openJob: null }),
  closeJobCompose: () => set({ jobCompose: null }),
  openJobCompose: (seed) =>
    set({
      openJob: null,
      openMail: null,
      mailCompose: null,
      commsTab: get().commsTab === 'mail' ? 'jobs' : get().commsTab,
      jobCompose: {
        title: seed?.title ?? '',
        body: seed?.body ?? '',
        bucket: jobBucketOf(seed?.bucket ?? 'SPHERE'),
      },
    }),
  setJobCompose: (jobCompose) => set({ jobCompose }),
  setJobFolder: async (folder) => {
    const open = get().openJob;
    const keep = open && filterJobsByFolder([open], folder).length > 0;
    set({ jobFolder: folder, openJob: keep ? open : null });
    await loadJobs(set, get);
  },
  readJob: async (id) => {
    const cached = get().jobs.find((row) => row.id === id);
    if (!live) {
      if (!cached) {
        set({ error: 'not linked' });
        return;
      }
      set({
        openJob: cached,
        jobCompose: null,
        openMail: null,
        mailCompose: null,
        error: null,
      });
      return;
    }
    try {
      const item = await live.getJob(id);
      if (!item) {
        set({ error: 'job not found' });
        return;
      }
      const jobs = get().jobs.map((row) => (row.id === item.id ? { ...row, ...item } : row));
      set({
        openJob: item,
        jobs,
        jobPending: cgenJobCount(jobs),
        jobCompose: null,
        openMail: null,
        mailCompose: null,
        error: null,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },
  sendJobRequest: async () => {
    const draft = get().jobCompose;
    if (!draft || !requestReady(draft) || !live) {
      set({ error: draft ? 'job needs title and body' : 'not linked' });
      return;
    }
    try {
      await live.createJob(draft.title.trim(), draft.body.trim(), draft.bucket.trim() || 'request');
      set({ jobCompose: null, error: null });
      await loadJobs(set, get);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },
  commentJob: async (id, note, staffOnly = false) => {
    if (!commentReady(note)) {
      set({ error: 'comment needs text' });
      return false;
    }
    if (!live) {
      set({ error: 'not linked' });
      return false;
    }
    const job = get().jobs.find((row) => row.id === id) ?? get().openJob;
    if (!job) {
      set({ error: 'job not found' });
      return false;
    }
    try {
      await live.commentJob(id, note.trim(), staffOnly);
      set({ error: null });
      await get().readJob(id);
      return true;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
      return false;
    }
  },
  approveJob: async (id, note) => {
    const job = get().jobs.find((row) => row.id === id) ?? get().openJob;
    if (!job) {
      set({ error: 'job not found' });
      return;
    }
    get().send(jobApproveLine(job, note ?? ''), { echo: true });
    const chargen = jobChargenApproveLine(job, note ?? '');
    if (chargen) get().send(chargen, { echo: true });
    set({
      openJob: null,
      jobs: get().jobs.map((row) => (row.id === id ? { ...row, status: 'closed' as const } : row)),
      error: null,
    });
    set({ jobPending: cgenJobCount(get().jobs) });
    window.setTimeout(() => {
      void loadJobs(set, get);
    }, 400);
  },
  denyJob: async (id, note) => {
    if (!commentReady(note)) {
      set({ error: 'deny needs a note' });
      return;
    }
    const job = get().jobs.find((row) => row.id === id) ?? get().openJob;
    if (!job) {
      set({ error: 'job not found' });
      return;
    }
    get().send(jobDenyLine(job, note), { echo: true });
    set({
      openJob: null,
      jobs: get().jobs.map((row) => (row.id === id ? { ...row, status: 'cancelled' as const } : row)),
      error: null,
    });
    set({ jobPending: cgenJobCount(get().jobs) });
    window.setTimeout(() => {
      void loadJobs(set, get);
    }, 400);
  },
  starMail: async (id) => {
    const current = get().mail.find((row) => row.id === id) ?? get().openMail;
    if (!live) {
      if (!current) {
        set({ error: 'not linked' });
        return;
      }
      const starred = !current.starred;
      set({
        mail: get().mail.map((row) => (row.id === id ? { ...row, starred } : row)),
        openMail: get().openMail?.id === id ? { ...get().openMail!, starred } : get().openMail,
        error: null,
      });
      return;
    }
    try {
      await live.patchMail(id, { starred: !current?.starred });
      const starred = !current?.starred;
      set({
        mail: get().mail.map((row) => (row.id === id ? { ...row, starred } : row)),
        openMail: get().openMail?.id === id ? { ...get().openMail!, starred } : get().openMail,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },
  openRoll: (roll) => set({ roll }),

  logout: () => {
    live?.close();
    live = null;
    bulletin = emptyFold();
    set({
      linked: false,
      error: null,
      room: emptyRoom,
      lookTick: 0,
      lookDesc: '',
      feed: [],
      consoleLog: [],
      sheet: null,
      roll: null,
      fight: null,
      combatTarget: null,
      combatRangeM: 15,
      combatMode: 'aim',
      gig: null,
      ping: null,
      wikiPages: [],
      wikiPage: null,
      pendingGm: false,
      needsChargen: 'unknown',
      chargenGen: 0,
      slashCmd: null,
      slashTarget: '',
      motd: null,
      motdOpen: false,
      notices: [],
      here: '/',
      activity: emptyActivity(),
      openMail: null,
      commsTab: 'channels',
      mailFolder: 'inbox',
      mailCompose: null,
      mailUnread: 0,
      jobs: [],
      jobFolder: 'open',
      openJob: null,
      jobCompose: null,
      jobPending: 0,
      activeChannel: null,
      comms: {},
      boards: [],
      openBoard: null,
      boardPosts: [],
      openBoardPost: null,
      boardCompose: null,
    });
  },

  jackIn: async (name, password) => {
    await connectAuth(name, () => live!.login(name, password), set, get, 'login');
  },

  register: async (name, email, password) => {
    await connectAuth(name, () => live!.register(name, email, password), set, get, 'register');
  },

  send: (raw, opts) => {
    const line = raw.trim();
    if (!line) return;
    const quitting = isQuitLine(line);
    if (!live) {
      if (quitting) {
        get().logout();
        return;
      }
      set({ error: 'not linked' });
      return;
    }
    try {
      live.send(line);
    } catch (err) {
      if (!quitting) {
        set({ error: err instanceof Error ? err.message : String(err) });
        return;
      }
    }
    if (quitting) {
      get().logout();
      return;
    }
    const echoed = opts?.echo ? [consoleEcho(line)] : [];
    if (isConfirmedRestart(line)) {
      restartDraft();
      set({
        chargenGen: get().chargenGen + 1,
        needsChargen: 'needed',
        consoleLog: echoed.length ? appendConsole(get().consoleLog, echoed) : get().consoleLog,
      });
    } else if (echoed.length) {
      set({ consoleLog: appendConsole(get().consoleLog, echoed) });
    }
    if (line.startsWith('?') || line.startsWith('+ask')) {
      set({ feed: [...get().feed, pendingGmEntry()], pendingGm: true });
    }
  },

  speak: (text) => {
    const state = get();
    const slash = parseSlashLine(text);
    if (slash) {
      for (const line of expandSlash(slash.cmd, slash.target)) get().send(line, { echo: true });
      return;
    }
    const line = routeInput(text, state.inputMode);
    if (!line) return;
    get().send(line, { echo: true });
  },
}));

async function connectAuth(
  name: string,
  auth: () => Promise<{ token: string; flags?: string }>,
  set: (partial: Partial<SessionState>) => void,
  get: () => SessionState,
  mode: 'login' | 'register',
): Promise<void> {
  const state = get();
  set({ busy: true, error: null });
  live?.close();
  live = new LiveLink(state.host, state.wsHost);
  try {
    const result = await auth();
    localStorage.setItem(ALIAS_KEY, name);
    const needsChargen: ChargenGate = mode === 'register' ? 'needed' : 'unknown';
    bulletin = emptyFold();
    set({
      linked: true,
      alias: name.toUpperCase(),
      flags: result.flags ?? '',
      staff: staffFromFlags(result.flags ?? ''),
      room: { name: 'LINKING', description: 'Waiting for look…', people: [], stuff: [], exits: [] },
      lookDesc: '',
      feed: [],
      sheet: null,
      roll: null,
      fight: null,
      combatTarget: null,
      combatRangeM: 15,
      combatMode: 'aim',
      ping: null,
      wikiPages: [],
      wikiPage: null,
      busy: false,
      needsChargen,
      motd: null,
      motdOpen: false,
      notices: [],
    });
    if (needsChargen !== 'unknown') publishChargen(needsChargen);
    live.connect(
      result.token,
      (msg) => onWire(msg, set, get),
      (err) => set({ error: err.message }),
    );
    window.setTimeout(() => {
      try {
        live?.send('look');
        live?.send('+sheet');
        live?.send('+gear');
        if (mode === 'register') live?.send('+chargen/start');
      } catch (err) {
        set({ error: err instanceof Error ? err.message : String(err) });
      }
    }, 250);
    void hydrateComms(set, get);
    if (mode === 'login') {
      const gate = await waitForChargen(get, 2500);
      if (get().needsChargen === 'unknown') {
        set({ needsChargen: gate });
        publishChargen(gate);
      }
    }
  } catch (err) {
    const message =
      err instanceof TransportError
        ? err.message
        : err instanceof Error
          ? err.message
          : String(err);
    set({ busy: false, linked: false, error: bangError(message), needsChargen: 'unknown' });
  }
}

function onWire(
  message: WireMessage,
  set: (partial: Partial<SessionState>) => void,
  get: () => SessionState,
): void {
  const pingEarly = sprawlFromWire(message);
  if (pingEarly?.kind === 'ping') {
    const ping = pingFromData(pingEarly.data);
    if (ping) {
      set({
        ping,
        feed: [...get().feed, pingEntry(ping)],
      });
      bumpActivity('street', set, get);
    }
    return;
  }
  const room = roomFromLook(message);
  if (room) {
    const listed = hostilesFromRoom(room);
    const open = get().combatTarget;
    const view = lookFromRoom(room, open);
    set({
      room,
      district: room.name,
      lookTick: get().lookTick + 1,
      combatTarget: open ? matchHostile(listed, open) ?? open : open,
      consoleLog: appendConsole(get().consoleLog, lookToConsole(view)),
      feed: [...get().feed, examineEntry(view)],
    });
    return;
  }
  const examine = examineFromLook(message);
  if (examine) {
    const hit = hostileForLook(get().room, examine, get().combatTarget);
    const acts = hit ? attackActs(hit, attackKit(get().gear.items, get().combatMode).total) : [];
    set({
      feed: [...get().feed, examineEntry(examine, acts)],
      combatTarget: hit ?? get().combatTarget,
      consoleLog: appendConsole(get().consoleLog, lookToConsole(examine)),
    });
    bumpActivity('street', set, get);
    return;
  }
  if (isLookUi(message) || isLoginUi(message) || isCmdEcho(message)) return;

  const frame = sprawlFromWire(message);
  if (frame) {
    if (frame.kind === 'sheet') {
      const sheet = sheetFromData(frame.data);
      if (sheet) {
        const fromSheet = gateFromSheet(sheet);
        const prev = get().needsChargen;
        const needsChargen =
          (prev === 'submitted' || prev === 'ready') &&
          fromSheet === 'needed' &&
          sheet.status.toUpperCase() !== 'REVISION'
            ? prev
            : fromSheet;
        const spent = Object.values(sheet.stats).some((n) => n > 0);
        if (needsChargen === 'ready' && spent) clearDraft();
        set({ sheet, alias: sheet.name || get().alias, needsChargen });
        publishChargen(needsChargen);
      }
      return;
    }
    if (frame.kind === 'fight' || frame.kind === 'roll') {
      if (frame.kind === 'fight') {
        const fight = fightFromData(frame.data);
        if (fight) {
          const current = get().sheet;
          const who = fight.who.trim().toUpperCase();
          const mine = !who || who === 'YOU' || who === (get().alias || '').toUpperCase();
          set({
            fight,
            sheet:
              mine && current
                ? {
                    ...current,
                    resilience: fight.resilience || current.resilience,
                    resilienceMax: fight.resilienceMax || current.resilienceMax,
                    critical: fight.critical ?? current.critical,
                  }
                : current,
          });
          bumpActivity('street', set, get);
          if (mine) bumpActivity('sheet', set, get);
        }
      }
      if (frame.kind === 'roll') {
        const entry = rollEntryFromWire(message);
        if (entry) {
          const roll = entry.roll ?? null;
          const open = get().combatTarget;
          const next =
            roll?.verb === 'attack' && open ? applyAttackToHostile(open, roll) : open;
          set({
            feed: [...get().feed, entry],
            roll,
            combatTarget: next,
            consoleLog: appendConsole(get().consoleLog, [entry.body]),
          });
          bumpActivity('street', set, get);
        }
      }
      if (get().gig && live) {
        try {
          live.send('+gig/status');
        } catch (err) {
          set({ error: err instanceof Error ? err.message : String(err) });
        }
      }
      return;
    }
    if (frame.kind === 'gear') {
      const gear = gearFromData(frame.data);
      if (gear) {
        const changed = gearMark(get().gear) !== gearMark(gear);
        set({ gear });
        if (changed) bumpActivity('inventory', set, get);
      }
      return;
    }
    if (frame.kind === 'net') {
      const net = netFromData(frame.data);
      if (net) {
        const hotter = net.heat > get().heat;
        set({ net, heat: net.heat });
        if (hotter) bumpActivity('deck', set, get);
      }
      return;
    }
    if (frame.kind === 'gig') {
      const gig = gigFromData(frame.data);
      if (gig && (gig.status === 'abandoned' || !gig.id)) {
        set({ gig: null });
        if (live) {
          try {
            live.send('look');
          } catch (err) {
            set({ error: err instanceof Error ? err.message : String(err) });
          }
        }
        return;
      }
      if (gig) {
        const prev = get().gig;
        set({ gig });
        if (!prev || prev.node !== gig.node) bumpActivity('street', set, get);
        // Mid-run clear: light GIG desk + street cue so the next beat is obvious.
        const clearedNow =
          Boolean(gig.canAdvance || (gig.nodeCleared && !gig.token)) &&
          !(prev?.canAdvance || (prev?.nodeCleared && !prev?.token));
        if (clearedNow) {
          bumpActivity('street', set, get);
          const hint = gig.nextHint || 'NODE CLEAR — GO DEEPER (+gig/push)';
          set({
            feed: [
              ...get().feed,
              { id: `gig-adv-${Date.now()}`, kind: 'system', body: hint },
            ],
          });
        }
        if (gig.status === 'complete' && (gig.payoutBy > 0 || gig.payoutAp > 0)) {
          pushNotices(
            [payoutNotice({
              kind: 'gig',
              label: gig.title || 'GIG',
              bityuan: gig.payoutBy,
              ap: gig.payoutAp,
            })],
            set,
            get,
          );
        }
        if (live && (!prev || prev.roomName !== gig.roomName || prev.node !== gig.node)) {
          try {
            live.send('look');
          } catch (err) {
            set({ error: err instanceof Error ? err.message : String(err) });
          }
        }
      }
      return;
    }
    if (frame.kind === 'ping') {
      const ping = pingFromData(frame.data);
      if (ping) {
        set({
          ping,
          feed: [...get().feed, pingEntry(ping)],
        });
        bumpActivity('street', set, get);
      }
      return;
    }
    if (frame.kind === 'payout') {
      const pay = payoutFromData(frame.data);
      if (pay) pushNotices([payoutNotice(pay)], set, get);
      return;
    }
    if (frame.kind === 'market') {
      const market = marketFromData(frame.data);
      if (market) {
        const sheet = get().sheet;
        set({
          market,
          sheet: sheet ? { ...sheet, cash: market.cash || sheet.cash } : sheet,
        });
      }
      return;
    }
    if (frame.kind === 'flow') {
      const flow = flowFromData(frame.data);
      if (flow) set({ flow });
      return;
    }
    if (frame.kind === 'haunt' || frame.kind === 'haunts') {
      const haunts = hauntFromData(frame.data);
      if (haunts) set({ haunts });
      return;
    }
    if (frame.kind === 'desc') {
      const desc = descFromData(frame.data);
      if (desc) set({ lookDesc: desc.text });
      return;
    }
    if (frame.kind === 'notice') {
      const body = String(frame.data.text ?? frame.data.body ?? '').trim();
      if (body) {
        set({
          feed: [...get().feed, { id: `n-${Date.now()}`, kind: 'system', body }],
        });
      }
      return;
    }
  }

  const spoken = speechFromWire(message);
  if (spoken) {
    set({
      feed: [...get().feed, spoken],
      consoleLog: appendConsole(get().consoleLog, [speechToConsole(spoken)]),
    });
    bumpActivity('street', set, get);
    return;
  }

  const chanPost = channelFromWire(message);
  if (chanPost) {
    const key = channelKey(chanPost.channel);
    const comms = { ...get().comms };
    comms[key] = [...(comms[key] ?? []), chanPost];
    const watching = get().activeChannel && channelKey(get().activeChannel!.name) === key;
    set({
      comms,
      channelMeta: channelRows(get().channels, comms).map((row) =>
        channelKey(row.name) === key && !watching ? { ...row, unread: row.unread + 1 } : row,
      ),
    });
    bumpActivity('comms', set, get);
    return;
  }

  const extra = leftoverLines(message);
  if (!extra.length) return;
  const lootHits = extra
    .map(parseLootLine)
    .filter((row): row is NonNullable<ReturnType<typeof parseLootLine>> => !!row)
    .map(payoutNotice);
  if (lootHits.length) pushNotices(lootHits, set, get);
  const chromeLook = lookBodyFromChrome(extra.join('\n'));
  bulletin = foldBulletin(bulletin, extra);
  applyMotd(set, get);
  const mailHit = bulletin.notices.some((note) => note.kind === 'mail');
  const jobsHit = bulletin.notices.some((note) => note.kind === 'jobs');
  pushNotices(bulletin.notices, set, get);
  if (mailHit) {
    bumpActivity('comms', set, get);
    void loadMail(set, get, 'inbox');
  }
  if (jobsHit) {
    bumpActivity('comms', set, get);
    bumpActivity('staff', set, get);
    void loadJobs(set, get);
  }
  const consoleLines = bulletin.feed.length ? bulletin.feed : extra;
  bulletin = { ...bulletin, notices: [], feed: [] };
  const lookPatch = chromeLook && !get().lookDesc ? { lookDesc: chromeLook } : {};
  if (extra.some(isSheetApprovedNotice)) {
    clearDraft();
    set({
      needsChargen: 'ready',
      consoleLog: appendConsole(get().consoleLog, consoleLines),
      ...lookPatch,
    });
    if (consoleLines.some(isConsoleError)) bumpActivity('console', set, get);
    publishChargen('ready');
    try {
      live?.send('+sheet');
      live?.send('+gear');
    } catch {
      /* linked send */
    }
    return;
  }
  if (extra.some(isChargenPrompt) && get().needsChargen === 'unknown') {
    set({
      needsChargen: 'needed',
      consoleLog: appendConsole(get().consoleLog, consoleLines),
      ...lookPatch,
    });
    if (consoleLines.some(isConsoleError)) bumpActivity('console', set, get);
    publishChargen('needed');
    return;
  }
  set({ consoleLog: appendConsole(get().consoleLog, consoleLines), ...lookPatch });
  if (consoleLines.some(isConsoleError)) bumpActivity('console', set, get);
}

export function groupedGear(items: GearItem[]) {
  return {
    wielded: items.filter((item) => item.slot === 'wielded'),
    worn: items.filter((item) => item.slot === 'worn'),
    carried: items.filter((item) => item.slot !== 'wielded' && item.slot !== 'worn'),
  };
}

export { marketCatForItem as marketBucket } from '../protocol/market';

async function fileCgenJob(
  set: (partial: Partial<SessionState>) => void,
  get: () => SessionState,
): Promise<void> {
  if (!live) return;
  try {
    await loadJobs(set, get);
    const open = get().jobs.some((job) => jobIsCgen(job) && jobIsOpen(job));
    if (open) return;
    const name = get().alias || get().sheet?.name || 'GOON';
    const note = get().sheet?.note?.trim() || 'Pending staff approval.';
    await live.createJob(`CGEN pending: ${name}`, note, 'CGEN');
    await loadJobs(set, get);
  } catch (err) {
    set({ error: err instanceof Error ? err.message : String(err) });
  }
}

async function loadJobs(
  set: (partial: Partial<SessionState>) => void,
  get: () => SessionState,
): Promise<void> {
  if (!live) return;
  try {
    const jobs = await live.listJobs();
    const open = get().openJob;
    const pending = cgenJobCount(jobs);
    const hotter = pending > get().jobPending;
    set({
      jobs,
      jobPending: pending,
      openJob: open ? (jobs.find((row) => row.id === open.id) ?? open) : null,
    });
    if (hotter) {
      bumpActivity('comms', set, get);
      bumpActivity('staff', set, get);
    }
  } catch (err) {
    set({ error: err instanceof Error ? err.message : String(err) });
  }
}

async function loadMail(
  set: (partial: Partial<SessionState>) => void,
  get: () => SessionState,
  folder: MailFolder,
): Promise<void> {
  if (!live) return;
  try {
    const mail = await live.listMail(folder);
    if (folder === 'inbox') {
      const unread = unreadMailCount(mail);
      const hotter = unread > get().mailUnread;
      set({
        mail,
        mailUnread: unread,
        notices: unread ? get().notices : get().notices.filter((n) => n.kind !== 'mail'),
      });
      if (hotter) bumpActivity('comms', set, get);
      return;
    }
    set({ mail });
  } catch (err) {
    set({ error: err instanceof Error ? err.message : String(err) });
  }
}

async function hydrateComms(
  set: (partial: Partial<SessionState>) => void,
  get: () => SessionState,
): Promise<void> {
  if (!live) return;
  try {
    const listed = await live.listChannels();
    const channels = listed;
    const mail = await live.listMail(get().mailFolder);
    const jobs = await live.listJobs();
    const boards = await live.listBoards().catch(() => get().boards);
    set({
      channels,
      channelMeta: channelRows(channels, get().comms),
      boards,
      mail,
      mailUnread: unreadMailCount(mail),
      jobs,
      jobPending: cgenJobCount(jobs),
    });
    const notes = [
      mailNotice(unreadMailCount(mail)),
      jobNotice(newJobCount(jobs), get().staff ? '/staff' : '/comms'),
    ].filter((note): note is NonNullable<typeof note> => Boolean(note));
    if (notes.length) pushNotices(notes, set, get);
  } catch (err) {
    set({ error: err instanceof Error ? err.message : String(err) });
  }
}
