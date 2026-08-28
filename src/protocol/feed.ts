import { stripTerminal } from './ansi';
import {
  formatRollLine,
  rollFromData,
  sprawlFromWire,
  type PingPayload,
  type RollPayload,
  type WireMessage,
} from './frames';
import type { AttackAct } from './combat';
import type { ExamineView } from './look';

export type FeedKind = 'pose' | 'roll' | 'gm' | 'system' | 'pending-gm' | 'examine' | 'ping';

export type GmSuggest = {
  label: string;
  cmd: string;
  cost: string;
};

export type FeedEntry = {
  id: string;
  kind: FeedKind;
  speaker?: string;
  body: string;
  roll?: RollPayload;
  suggests?: GmSuggest[];
  mediaUrl?: string;
  look?: ExamineView;
  acts?: AttackAct[];
  ping?: PingPayload;
};

let feedSeq = 0;

export function nextFeedId(): string {
  feedSeq += 1;
  return `f${feedSeq}`;
}

export function resetFeedIds(): void {
  feedSeq = 0;
}

export function speechFromWire(message: WireMessage): FeedEntry | null {
  const ui = asUi(message.data.ui);
  if (!ui || ui.type !== 'chat') return null;
  if (ui.kind === 'channel') return null;
  const name = stripTerminal(String(ui.name ?? ''));
  const text = stripTerminal(String(ui.text ?? ''));
  if (!name && !text) return null;
  const kind = String(ui.kind ?? 'say');
  if (kind === 'pose' || kind === 'semi') {
    return {
      id: nextFeedId(),
      kind: 'pose',
      speaker: name,
      body: kind === 'semi' ? `${name}${text}` : text,
    };
  }
  if (kind === 'ooc') {
    return { id: nextFeedId(), kind: 'system', body: `[OOC] ${name}: ${text}` };
  }
  return {
    id: nextFeedId(),
    kind: 'pose',
    speaker: name,
    body: `says, “${text}”`,
  };
}

export function rollEntryFromWire(message: WireMessage): FeedEntry | null {
  const frame = sprawlFromWire(message);
  if (!frame || frame.kind !== 'roll') return null;
  const roll = rollFromData(frame.data);
  if (!roll) return null;
  return {
    id: nextFeedId(),
    kind: 'roll',
    body: formatRollLine(roll),
    roll,
  };
}

export function gmEntry(body: string, suggests: GmSuggest[] = []): FeedEntry {
  return {
    id: nextFeedId(),
    kind: 'gm',
    speaker: 'GM',
    body,
    suggests,
  };
}

export function pendingGmEntry(): FeedEntry {
  return {
    id: nextFeedId(),
    kind: 'pending-gm',
    speaker: 'GM',
    body: 'working…',
  };
}

export function examineEntry(view: ExamineView, acts: AttackAct[] = []): FeedEntry {
  return {
    id: nextFeedId(),
    kind: 'examine',
    speaker: view.name,
    body: view.description,
    mediaUrl: view.mediaUrl,
    look: view,
    acts: acts.length ? acts : undefined,
  };
}

export function pingEntry(card: PingPayload): FeedEntry {
  return {
    id: nextFeedId(),
    kind: 'ping',
    speaker: card.name,
    body: card.fields.map((f) => `${f.label}: ${f.value}`).join('\n'),
    mediaUrl: card.image,
    ping: card,
  };
}

export function rollEntry(roll: RollPayload): FeedEntry {
  return {
    id: nextFeedId(),
    kind: 'roll',
    body: formatRollLine(roll),
    roll,
  };
}

function asUi(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== 'object') return null;
  const rec = value as Record<string, unknown>;
  return {
    type: String(rec.type ?? ''),
    kind: String(rec.kind ?? ''),
    name: String(rec.name ?? ''),
    text: String(rec.text ?? ''),
  };
}
