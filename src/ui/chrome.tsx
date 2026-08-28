import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { growInputHeight, pushRemembered, rememberedCmds, stepHistoryIndex, tabTargetsStreet } from '../protocol/input-box';
import { useLocation, useNavigate } from 'react-router-dom';
import { NOTICE_TTL_MS, type NoticeKind } from '../protocol/bulletin';

import { inChargen, playableGate } from '../protocol/chargen-gate';
import { activityHint, awayActivity, tabActivity } from '../protocol/activity';
import { deskBackOf, dockActive, dossierPath, operativeTabs, type DeskBackLink } from '../protocol/dock';
import { hostilesFromRoom, type AttackAct } from '../protocol/combat';
import { hackLocksFromRoom } from '../protocol/hack';
import { bareLookName, exitChip, lookCmdFor, type EntityRow, type ExamineView, type LookList } from '../protocol/look';
import { overflowEdges, rosterMoreMark, SCENE_SYNC_MS, sceneFromSwipe, sceneHeadMark } from '../protocol/scene';
import {
  CHARGEN_LOCKS,
  chargenReady,
  expandSlash,
  isRestartSwitch,
  isHealSlash,
  needsCombatScreen,
  planCombatSlash,
  GIG_LOCKS,
  JOBS_LOCKS,
  jobsReady,
  MARKET_LOCKS,
  PING_LOCKS,
  marketReady,
  matchSlash,
  needsChargenScreen,
  needsGigScreen,
  needsJobsScreen,
  panelPathFor,
  needsRestartConfirm,
  armableSlash,
  completeSlash,
  slashHitArm,
  parseSlashLine,
  restartReady,
  RESTART_LOCKS,
  SLASH_COMMANDS,
  stepSlashPick,
  revealInView,
  type SlashCmd,
} from '../protocol/slash';
import { healActOf } from '../protocol/heal';
import { helpReady, slashHelpLocks, slashHelpLook } from '../protocol/slash-help';
import { NPC_LOCKS, spawnReady } from '../protocol/npcs';
import { INPUT_MODE_META, INPUT_MODES, type InputMode, type SpeechMode } from '../protocol/speech';
import { gameMediaSrc } from '../protocol/splash';
import { useSession } from '../state/session';

export { ScrollPane } from './ScrollPane';

export type NoticeItem = {
  id: string;
  kind?: NoticeKind | string;
  title: string;
  body: string;
  to?: string;
};

export function NoticeStack({
  items,
  ttl = NOTICE_TTL_MS,
  onDismiss,
  onOpen,
}: {
  items: NoticeItem[];
  ttl?: number;
  onDismiss: (id: string) => void;
  onOpen?: (item: NoticeItem) => void;
}) {
  if (!items.length) return null;
  return (
    <div className="ribbons" aria-live="polite">
      {items.map((item) => (
        <NoticeRibbon key={item.id} item={item} ttl={ttl} onDismiss={onDismiss} onOpen={onOpen} />
      ))}
    </div>
  );
}

function NoticeRibbon({
  item,
  ttl,
  onDismiss,
  onOpen,
}: {
  item: NoticeItem;
  ttl: number;
  onDismiss: (id: string) => void;
  onOpen?: (item: NoticeItem) => void;
}) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setLeaving(true), ttl);
    return () => window.clearTimeout(id);
  }, [item.id, ttl]);

  useEffect(() => {
    if (!leaving) return;
    const id = window.setTimeout(() => onDismiss(item.id), 280);
    return () => window.clearTimeout(id);
  }, [leaving, item.id, onDismiss]);

  return (
    <div className={`ribbon ${item.kind ?? ''} ${leaving ? 'out' : ''}`.trim()}>
      <button
        type="button"
        className="ribbon-go"
        onClick={() => {
          onDismiss(item.id);
          onOpen?.(item);
        }}
      >
        {item.title} · {item.body}
      </button>
      <button type="button" className="ribbon-x" onClick={() => onDismiss(item.id)} aria-label="dismiss">
        [x]
      </button>
    </div>
  );
}

export function PopupFrame({
  title,
  open,
  onClose,
  children,
  className,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);
  if (!open) return null;
  return (
    <div className="veil" role="presentation" onClick={onClose}>
      <aside
        className={['popup', className].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="popup-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="popup-bar">
          <span id="popup-title">{`>> ${title}`}</span>
          <button
            ref={closeRef}
            type="button"
            className="popup-x"
            onClick={onClose}
            aria-label="close"
          >
            [x]
          </button>
        </header>
        <div className="popup-scan" />
        <div className="popup-slot">{children}</div>
      </aside>
    </div>
  );
}

export function SlideVeil({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" className="slide-veil" aria-label="close menu" onClick={onClose} />
  );
}

export function StatusBar({
  left,
  mid,
  right,
  invert = false,
}: {
  left: string;
  mid: string;
  right: string;
  invert?: boolean;
}) {
  return (
    <div className={invert ? 'status invert' : 'status'}>
      <span>{left}</span>
      <span>{mid}</span>
      <span>{right}</span>
    </div>
  );
}

export function Art({
  src,
  kind = 'room',
  children,
}: {
  src?: string;
  kind?: 'room' | 'skyline' | 'portrait' | 'district' | 'scene';
  children?: ReactNode;
}) {
  const host = useSession((s) => s.host);
  const href = src ? gameMediaSrc(host, src) : '';
  return (
    <div className={`art ${kind === 'room' ? '' : kind}`.trim()}>
      {href ? <img src={href} alt="" /> : null}
      {children}
    </div>
  );
}

export function LookLists({
  lists,
  onCmd,
  onPick,
}: {
  lists: LookList[];
  onCmd?: (cmd: string) => void;
  onPick?: (item: EntityRow, list: LookList) => boolean | void;
}) {
  return (
    <>
      {lists.map((list) => {
        const exits = list.label.includes('EXIT');
        return (
          <div key={list.label}>
            <LookHead label={list.label} count={list.items.length} />
            {list.items.map((item) => {
              const cmd = exits ? item.cmd : lookCmdFor(item);
              return (
                <Row
                  key={`${list.label}-${item.label}-${cmd ?? ''}`}
                  left={item.label}
                  right={
                    exits ? exitChip(item.label, item.flag || item.cmd) : item.flag || item.idle || item.sub
                  }
                  sub={exits ? undefined : item.sub}
                  onClick={
                    onPick || (cmd && onCmd)
                      ? () => {
                          if (onPick?.(item, list)) return;
                          if (cmd && onCmd) onCmd(cmd);
                        }
                      : undefined
                  }
                />
              );
            })}
          </div>
        );
      })}
    </>
  );
}

export function LookCard({
  look,
  scene = false,
  lists = true,
  acts,
  onCmd,
  onPick,
  onAct,
  pulse = 0,
}: {
  look: ExamineView;
  scene?: boolean;
  lists?: boolean;
  acts?: AttackAct[];
  onCmd?: (cmd: string) => void;
  onPick?: (item: EntityRow, list: LookList) => boolean | void;
  onAct?: (act: AttackAct) => void;
  pulse?: number;
}) {
  const sync = useLookPulse(scene ? pulse : 0);
  return (
    <div
      className={['look-card', scene && 'scene', sync && 'sync'].filter(Boolean).join(' ')}
      data-look={scene ? 'scene' : 'target'}
    >
      <div className="slash-head">
        <span>{'>> /LOOK'}</span>
        <span className="n">{scene ? sceneHeadMark(sync) : 'TARGET'}</span>
      </div>
      {sync ? <div className="look-sync" aria-hidden /> : null}
      <Art src={look.mediaUrl} kind={scene ? 'scene' : 'room'} />
      <Row left={look.name} />
      {look.description ? <div className="scene-desc">{look.description}</div> : null}
      {lists ? <LookLists lists={look.lists} onCmd={onCmd} onPick={onPick} /> : null}
      {acts?.length ? (
        <>
          <LookHead label="ATTACK" />
          {acts.map((act) => (
            <Row
              key={act.label}
              left={act.label}
              right={act.right || '▸'}
              onClick={onAct ? () => onAct(act) : undefined}
            />
          ))}
        </>
      ) : null}
    </div>
  );
}

function useLookPulse(tick: number): boolean {
  const [sync, setSync] = useState(false);
  useEffect(() => {
    if (!tick) return;
    setSync(true);
    const id = window.setTimeout(() => setSync(false), SCENE_SYNC_MS);
    return () => window.clearTimeout(id);
  }, [tick]);
  return sync;
}

export function RosterDrawer({
  lists,
  open,
  onOpen,
  onClose,
  onCmd,
  onPick,
  pulse = 0,
}: {
  lists: LookList[];
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onCmd?: (cmd: string) => void;
  onPick?: (item: EntityRow, list: LookList) => boolean | void;
  pulse?: number;
}) {
  const startY = useRef<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ above: false, below: false });
  const count = lists.reduce((sum, list) => sum + list.items.length, 0);
  const sync = useLookPulse(pulse);

  useLayoutEffect(() => {
    const el = list.current;
    if (!open || !el) {
      setEdges({ above: false, below: false });
      return;
    }
    const measure = () => setEdges(overflowEdges(el));
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    for (const child of el.children) watch.observe(child);
    el.addEventListener('scroll', measure, { passive: true });
    return () => {
      watch.disconnect();
      el.removeEventListener('scroll', measure);
    };
  }, [open, lists]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) onClose();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open, onClose]);

  return (
    <div ref={root} className={open ? 'roster-drawer open' : 'roster-drawer shut'}>
      <button
        type="button"
        className={sync ? 'roster-bar sync' : 'roster-bar'}
        aria-expanded={open}
        onPointerDown={(event) => {
          startY.current = event.clientY;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerUp={(event) => {
          const origin = startY.current;
          startY.current = null;
          if (origin == null) return;
          const gesture = sceneFromSwipe(event.clientY - origin);
          if (gesture === 'open') onOpen();
          else if (gesture === 'shut') onClose();
          else if (open) onClose();
          else onOpen();
        }}
      >
        <span>{'>> HERE'}</span>
        <span className="n">{`${String(count).padStart(2, '0')} ${rosterMoreMark(open, edges.below)}`}</span>
      </button>
      {open ? (
        <button type="button" className="roster-veil" aria-label="close here" onClick={onClose} />
      ) : null}
      <div className="roster-panel">
        <div ref={list} className="roster-list">
          <LookLists
            lists={lists}
            onCmd={
              onCmd
                ? (cmd) => {
                    onClose();
                    onCmd(cmd);
                  }
                : undefined
            }
            onPick={
              onPick
                ? (item, list) => {
                    const handled = onPick(item, list);
                    if (handled) onClose();
                    return handled;
                  }
                : undefined
            }
          />
        </div>
        {edges.above ? <div className="roster-fade up" aria-hidden /> : null}
        {edges.below ? <div className="roster-fade down" aria-hidden /> : null}
      </div>
    </div>
  );
}

export function LookHead({
  label,
  count,
  onClick,
}: {
  label: string;
  count?: number;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span>{`>> ${label}`}</span>
      {count != null ? <span className="n">{String(count).padStart(2, '0')}</span> : null}
    </>
  );
  if (onClick) {
    return (
      <button type="button" className="look-head" onClick={onClick}>
        {inner}
      </button>
    );
  }
  return <div className="look-head">{inner}</div>;
}

export function Row({
  left,
  right,
  sub,
  onClick,
  selected = false,
  danger = false,
  unread = false,
}: {
  left: string;
  right?: string;
  sub?: string;
  onClick?: () => void;
  selected?: boolean;
  danger?: boolean;
  unread?: boolean;
}) {
  const cls = [
    'row',
    sub && 'has-sub',
    selected && 'selected',
    danger && 'danger',
    unread && 'unread',
  ]
    .filter(Boolean)
    .join(' ');
  const inner = (
    <>
      <span className="left">
        <span className="name">{left}</span>
        {sub ? <span className="sub">{sub}</span> : null}
      </span>
      {right ? <span className="right">{right}</span> : null}
    </>
  );
  if (onClick) {
    return (
      <button type="button" className={cls} onClick={onClick}>
        {inner}
      </button>
    );
  }
  return <div className={cls}>{inner}</div>;
}

export function DeskBack({ label, to, onClick }: DeskBackLink) {
  const nav = useNavigate();
  return (
    <div className="desk-back">
      <Row
        left={`◂ ${label}`}
        onClick={() => {
          onClick?.();
          if (to) nav(to);
        }}
      />
    </div>
  );
}

export function Slab({
  children,
  onClick,
  disabled,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button type="button" className="slab" onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  );
}

export function Segments({
  items,
  value,
  onChange,
}: {
  items: Array<{ id: string; label: string; disabled?: boolean }>;
  value?: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="segments">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={item.id === value ? 'active' : undefined}
          disabled={item.disabled}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function Meter({ ratio, danger = false }: { ratio: number; danger?: boolean }) {
  const width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
  return (
    <div className={danger ? 'bar danger' : 'bar'}>
      <i style={{ width }} />
    </div>
  );
}

export function Gauge({
  label,
  value,
  ratio,
  danger = false,
  onClick,
}: {
  label: string;
  value: string;
  ratio: number;
  danger?: boolean;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <div className="cap">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <Meter ratio={ratio} danger={danger} />
    </>
  );
  if (onClick) {
    return (
      <button type="button" className="gauge tap" onClick={onClick}>
        {inner}
      </button>
    );
  }
  return <div className="gauge">{inner}</div>;
}

export function Dots({ value, max = 4 }: { value: number; max?: number }) {
  return (
    <span className="dots">
      {Array.from({ length: max }, (_, i) => (
        <i key={i} className={i < value ? 'on' : undefined} />
      ))}
    </span>
  );
}

function speechOf(mode: InputMode): SpeechMode {
  return mode;
}

export function InputRow({
  mode,
  modeOpen,
  value,
  onChange,
  onMode,
  onToggleModes,
  onSend,
  slashHits = [],
  armed = null,
  target = '',
  locks = [],
  onArm,
  onDisarm,
  onTarget,
  onFill,
  history = [],
  placeholder,
}: {
  mode: InputMode;
  modeOpen: boolean;
  value: string;
  onChange: (value: string) => void;
  onMode: (mode: InputMode) => void;
  onToggleModes: () => void;
  onSend: () => void;
  slashHits?: SlashCmd[];
  armed?: SlashCmd | null;
  target?: string;
  locks?: Array<{ label: string; insert: string }>;
  onArm?: (cmd: SlashCmd, rest: string) => void;
  onDisarm?: () => void;
  onTarget?: (value: string) => void;
  onFill?: (value: string) => void;
  history?: string[];
  placeholder?: string;
}) {
  const speech = speechOf(mode);
  const field = useRef<HTMLTextAreaElement>(null);
  const hitsBox = useRef<HTMLDivElement>(null);
  const hitEls = useRef<(HTMLButtonElement | null)[]>([]);
  const stash = useRef('');
  const [pick, setPick] = useState(0);
  const [histAt, setHistAt] = useState(-1);
  const slashing = Boolean(armed) || slashHits.length > 0;
  const hitKey = slashHits.map((cmd) => cmd.id).join('|');

  useEffect(() => {
    setPick(0);
  }, [hitKey]);

  useLayoutEffect(() => {
    hitEls.current.length = slashHits.length;
    const box = hitsBox.current;
    const hit = hitEls.current[pick];
    if (!box || !hit) return;
    box.scrollTop = revealInView(box.scrollTop, box.clientHeight, hit.offsetTop, hit.offsetHeight);
  }, [pick, hitKey, slashHits.length]);

  useEffect(() => {
    if (armed) field.current?.focus();
  }, [armed]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.defaultPrevented) return;
      const el = field.current;
      if (!el) return;
      if (!tabTargetsStreet(document.activeElement, document.body, document.documentElement)) return;
      event.preventDefault();
      el.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useLayoutEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${growInputHeight(el.scrollHeight)}px`;
  }, [armed, target, value]);

  const menuOpen = !slashing && modeOpen;
  return (
    <div className="slide-stack">
      {menuOpen ? (
        <SlideVeil
          onClose={() => {
            if (modeOpen) onToggleModes();
          }}
        />
      ) : null}
      {!slashing && modeOpen ? (
        <div className="modes">
          {INPUT_MODES.map((id) => (
            <Row
              key={id}
              left={INPUT_MODE_META[id].label}
              right={INPUT_MODE_META[id].syntax}
              selected={id === speech}
              onClick={() => onMode(id)}
            />
          ))}
        </div>
      ) : null}
      {!armed && slashHits.length ? (
        <div className="slash-sheet" role="listbox" aria-label="slash commands">
          <div className="slash-scan" />
          <div className="slash-head">
            <span>{'>> SLASH'}</span>
            <span className="n">OPTIC</span>
          </div>
          <div className="slash-hits" ref={hitsBox}>
          {slashHits.map((cmd, i) => (
            <button
              key={cmd.id}
              type="button"
              ref={(el) => {
                hitEls.current[i] = el;
              }}
              className={i === pick ? 'slash-hit on' : 'slash-hit'}
              role="option"
              aria-selected={i === pick}
              onClick={() => {
                const hit = slashHitArm(value, cmd);
                onArm?.(hit.cmd, hit.rest);
              }}
            >
              <span className="slash-verb">{`/${cmd.label}`}</span>
              <span className="slash-hint">{cmd.hint}</span>
              <span className="slash-keys">{cmd.aliases.join(' · ')}</span>
            </button>
          ))}
          </div>
        </div>
      ) : null}
      {armed ? (
        <div className="slash-arm">
          <div className="slash-scan" />
          <div className="slash-head">
            <span>{`>> /${armed.label}`}</span>
            <span className="n">{armed.help}</span>
          </div>
          {locks.length ? (
            <div className="slash-locks">
              {locks.map((lock) => (
                <button
                  key={lock.insert}
                  type="button"
                  className={lock.insert === target ? 'slash-lock on' : 'slash-lock'}
                  onClick={() => onTarget?.(lock.insert)}
                >
                  {lock.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      <form
        className={armed ? 'input-row armed' : 'input-row'}
        onSubmit={(event) => {
          event.preventDefault();
          onSend();
        }}
      >
        {armed ? (
          <button type="button" className="slash-chip" onClick={onDisarm} aria-label="clear look">
            <span>{`/${armed.label}`}</span>
            <span className="x">×</span>
          </button>
        ) : (
          <>
            <button type="button" className="prefix" onClick={onToggleModes}>
              {INPUT_MODE_META[speech].label} ▾
            </button>
          </>
        )}
        <textarea
          ref={field}
          rows={1}
          value={armed ? target : value}
          placeholder={
            armed
              ? armed.placeholder || armed.help
              : placeholder || INPUT_MODE_META[speech].placeholder
          }
          onChange={(event) => {
            setHistAt(-1);
            if (armed) onTarget?.(event.target.value);
            else onChange(event.target.value);
          }}
          autoComplete="off"
          spellCheck={false}
          onFocus={(event) => event.currentTarget.scrollIntoView({ block: 'nearest' })}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              if (armed) onDisarm?.();
              else if (modeOpen) onToggleModes();
            }
            if (event.key === 'Tab' && !armed && slashHits.length) {
              event.preventDefault();
              const cmd = slashHits[pick] ?? slashHits[0]!;
              const hit = slashHitArm(value, cmd);
              onArm?.(hit.cmd, hit.rest);
              return;
            }
            if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && !armed) {
              const down = event.key === 'ArrowDown';
              if (histAt < 0 && slashHits.length) {
                event.preventDefault();
                setPick(stepSlashPick(slashHits.length, pick, down ? 1 : -1));
                return;
              }
              if (!history.length) return;
              const el = field.current;
              const atStart = !el || (el.selectionStart === 0 && el.selectionEnd === 0);
              const atEnd = !el || (el.selectionStart === el.value.length && el.selectionEnd === el.value.length);
              if (event.key === 'ArrowUp' && !atStart && histAt < 0) return;
              if (event.key === 'ArrowDown' && !atEnd && histAt < 0) return;
              event.preventDefault();
              if (histAt < 0) stash.current = value;
              const next = stepHistoryIndex(history.length, histAt, down ? -1 : 1);
              setHistAt(next);
              onFill?.(next < 0 ? stash.current : (history[next] ?? stash.current));
            }
          }}
        />
        <button type="submit" className="send" aria-label="send">
          ▸
        </button>
      </form>
    </div>
  );
}

export function StreetInput({
  locks,
  placeholder,
  sendPlain,
}: {
  locks?: Array<{ label: string; insert: string }>;
  placeholder?: string;
  sendPlain?: (text: string) => void;
} = {}) {
  const nav = useNavigate();
  const session = useSession();
  const [draft, setDraft] = useState('');
  const armed = session.slashCmd;
  const target = session.slashTarget;
  const slashHits = armed ? [] : matchSlash(draft);
  const roomLocks = [...session.room.people, ...session.room.stuff].map((item) => ({
    label: item.label,
    insert: item.id ? `#${item.id}` : bareLookName(item.label),
  }));
  const packLocks = session.gear.items.map((item) => ({
    label: item.name.toUpperCase(),
    insert: item.name,
  }));
  const hostileLocks = hostilesFromRoom(session.room)
    .filter((row) => !row.dead)
    .map((row) => ({
      label: row.name.toUpperCase(),
      insert: row.slug || (row.id ? `#${row.id}` : row.name),
    }));
  const doorLocks = hackLocksFromRoom(session.room).map((row) => ({
    label: `${row.name.toUpperCase()}`,
    insert: row.slug,
  }));
  const restart = SLASH_COMMANDS.find((cmd) => cmd.id === 'chargen-restart');
  const chips =
    locks ??
    (armed?.id === 'chargen-restart'
      ? RESTART_LOCKS
      : armed?.id === 'chargen' || armed?.id.startsWith('chargen-')
        ? CHARGEN_LOCKS
        : armed?.id === 'gig' || armed?.id.startsWith('gig-')
          ? GIG_LOCKS
        : armed?.id === 'jobs' || armed?.id.startsWith('jobs-')
          ? JOBS_LOCKS
          : armed?.id === 'market' || armed?.id.startsWith('market-')
            ? MARKET_LOCKS
          : armed?.id === 'ping-set'
            ? PING_LOCKS
            : armed?.id.startsWith('gear-')
              ? packLocks
              : armed?.id === 'npc-spawn' || (armed?.id === 'npc' && session.staff)
                ? NPC_LOCKS.map((lock) => ({ label: lock.label, insert: lock.insert }))
                : armed?.id === 'hack' || armed?.id === 'lock'
                ? doorLocks
                : armed?.id === 'help'
                ? slashHelpLocks(session.staff)
                : armed && needsCombatScreen(armed)
                ? hostileLocks
                : roomLocks);

  function openWizard(cmd: SlashCmd, rest = '') {
    if (session.needsChargen !== 'needed') return;
    if (cmd.id === 'chargen-restart' || isRestartSwitch(rest)) return;
    if (needsChargenScreen(cmd, rest)) nav(dossierPath(true));
  }

  function openPanel(cmd: SlashCmd, rest = '') {
    if (needsGigScreen(cmd, rest)) {
      nav('/gig');
      return;
    }
    if (needsJobsScreen(cmd, rest)) {
      void session.loadJobs();
      if (session.staff) {
        nav('/staff');
        return;
      }
      session.setCommsTab('jobs');
      nav('/comms');
      return;
    }
    const to = panelPathFor(cmd);
    if (to) nav(to);
  }

  function applyHelpPlan(cmd: SlashCmd, value = '') {
    if (cmd.id !== 'help') return false;
    session.pushLook(slashHelpLook(value, session.staff));
    session.disarmSlash();
    setDraft('');
    nav('/play');
    return true;
  }

  function applyHealPlan(cmd: SlashCmd) {
    const act = healActOf(cmd.id);
    if (!act || !isHealSlash(cmd)) return false;
    session.healSelf(act);
    session.disarmSlash();
    setDraft('');
    return true;
  }

  function applyNpcPlan(cmd: SlashCmd, value = '') {
    if (cmd.id === 'npc-clear') {
      session.clearNpc(value);
      session.disarmSlash();
      setDraft('');
      return true;
    }
    if (cmd.id === 'npc-spawn' || (cmd.id === 'npc' && session.staff)) {
      if (!value.trim()) return false;
      session.spawnNpc(value);
      session.disarmSlash();
      setDraft('');
      return true;
    }
    return false;
  }

  function applyCombatPlan(cmd: SlashCmd, value = '') {
    const plan = planCombatSlash(cmd, value);
    if (!plan) return false;
    if (cmd.id === 'npc' && session.staff) return false;
    if (cmd.id === 'npc-spawn' || cmd.id === 'npc-clear') return false;
    if (cmd.id === 'npc') {
      if (!plan.select) return false;
      session.selectHostile(plan.select);
      session.disarmSlash();
      setDraft('');
      nav('/play');
      return true;
    }
    if (plan.reload) {
      session.setCombatMode('reload');
      session.disarmSlash();
      setDraft('');
      nav('/play');
      return true;
    }
    if (plan.mode) session.setCombatMode(plan.mode);
    if (!plan.fire) return false;
    if (plan.select) session.selectHostile(plan.select);
    if (!session.attackHostile(plan.select)) return false;
    session.disarmSlash();
    setDraft('');
    nav('/play');
    return true;
  }

  function arm(cmd: SlashCmd, rest = '') {
    if (applyNpcPlan(cmd, rest)) return;
    if (applyCombatPlan(cmd, rest)) return;
    if (applyHealPlan(cmd)) return;
    if (rest.trim() && applyHelpPlan(cmd, rest)) return;
    session.armSlash(cmd, rest);
    setDraft('');
    openWizard(cmd, rest);
    openPanel(cmd, rest);
  }

  function fire(cmd: SlashCmd, value = '') {
    if (needsGigScreen(cmd, value)) {
      session.disarmSlash();
      setDraft('');
      nav('/gig');
      return;
    }
    if (applyNpcPlan(cmd, value)) return;
    if (applyCombatPlan(cmd, value)) return;
    if (needsCombatScreen(cmd) && cmd.id !== 'npc' && cmd.id !== 'npc-clear') {
      session.armSlash(cmd, value);
      setDraft('');
      nav('/play');
      return;
    }
    if (applyHealPlan(cmd)) return;
    if (applyHelpPlan(cmd, value)) return;
    for (const line of expandSlash(cmd, value)) session.send(line, { echo: true });
    session.disarmSlash();
    setDraft('');
    openWizard(cmd, value);
    openPanel(cmd, value);
  }

  return (
    <InputRow
      mode={session.inputMode}
      modeOpen={session.modeOpen}
      value={draft}
      onChange={(value) => {
        const ready = armableSlash(value);
        if (ready) {
          if (needsCombatScreen(ready.cmd)) {
            setDraft(value);
            return;
          }
          arm(ready.cmd, ready.target);
          return;
        }
        setDraft(value);
      }}
      onFill={setDraft}
      history={rememberedCmds()}
      onMode={session.setInputMode}
      onToggleModes={() => session.setModeOpen(!session.modeOpen)}
      onSend={() => {
        if (armed) {
          if (needsRestartConfirm(armed, target)) {
            if (restart) arm(restart);
            return;
          }
          pushRemembered(target.trim() ? `${completeSlash('', armed)} ${target.trim()}` : completeSlash('', armed));
          fire(armed, target);
          return;
        }
        if (draft.trim()) pushRemembered(draft);
        const slash = parseSlashLine(draft);
        if (slash && needsRestartConfirm(slash.cmd, slash.target)) {
          if (restart) arm(restart);
          return;
        }
        if (slash) {
          if (needsCombatScreen(slash.cmd) || slash.cmd.id === 'help') {
            fire(slash.cmd, slash.target);
            return;
          }
          openWizard(slash.cmd, slash.target);
          openPanel(slash.cmd, slash.target);
          session.speak(draft);
          setDraft('');
          return;
        }
        if (sendPlain) {
          sendPlain(draft);
          setDraft('');
          return;
        }
        session.speak(draft);
        setDraft('');
      }}
      onTarget={(value) => {
        if (armed && isRestartSwitch(value) && restart) {
          arm(restart);
          return;
        }
        if (armed?.id === 'chargen-restart' && restartReady(value)) {
          fire(armed, value);
          return;
        }
        if (armed && chargenReady(value)) {
          fire(armed, value);
          return;
        }
        if (armed && (armed.id === 'jobs' || armed.id.startsWith('jobs-')) && jobsReady(value)) {
          fire(armed, value);
          return;
        }
        if (armed && (armed.id === 'market' || armed.id.startsWith('market-')) && marketReady(value)) {
          fire(armed, value);
          return;
        }
        if ((armed?.id === 'npc-spawn' || (armed?.id === 'npc' && session.staff)) && spawnReady(value)) {
          fire(armed, value);
          return;
        }
        if (armed?.id === 'npc' && !session.staff && value.trim()) {
          fire(armed, value);
          return;
        }
        if (armed?.id === 'help' && helpReady(value, session.staff)) {
          fire(armed, value);
          return;
        }
        session.setSlashTarget(value);
      }}
      slashHits={slashHits}
      armed={armed}
      target={target}
      locks={chips}
      onArm={arm}
      onDisarm={() => session.disarmSlash()}
      placeholder={placeholder}
    />
  );
}

export function PlayTabs({
  streetLabel = 'STREET',
  staff = false,
  back,
}: {
  streetLabel?: string;
  staff?: boolean;
  back?: DeskBackLink | false;
}) {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  const link = back === false ? null : back ?? deskBackOf(loc.pathname);
  const closeModes = useSession((s) => s.setModeOpen);
  const logout = useSession((s) => s.logout);
  const needsChargen = useSession((s) => s.needsChargen);
  const sheet = useSession((s) => s.sheet);
  const activity = useSession((s) => s.activity);
  const items = operativeTabs({
    streetLabel,
    staff,
    chargen: inChargen(playableGate(needsChargen, sheet)),
  });
  const current = items.find((item) => dockActive(loc.pathname, item.to)) ?? items[0];
  const live = awayActivity(activity, loc.pathname) > 0;

  return (
    <nav className="slide-stack">
      {open ? <SlideVeil onClose={() => setOpen(false)} /> : null}
      {open ? (
        <div className="modes">
          {items.map((item) => {
            const mark = tabActivity(item.to, activity);
            return (
              <Row
                key={item.to}
                left={item.label}
                right={activityHint(item.hint, mark)}
                selected={item.to === current.to}
                danger={mark > 0}
                onClick={() => {
                  setOpen(false);
                  if (item.action === 'quit') {
                    logout();
                    nav('/');
                    return;
                  }
                  nav(item.to);
                }}
              />
            );
          })}
        </div>
      ) : null}
      {link ? <DeskBack {...link} /> : null}
      <button
        type="button"
        className={live ? 'dock live' : 'dock'}
        onClick={() => {
          closeModes(false);
          setOpen((value) => !value);
        }}
      >
        <span>{current.label}</span>
        <span>{open ? '▴' : '▾'}</span>
      </button>
    </nav>
  );
}
