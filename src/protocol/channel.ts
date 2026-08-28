import { stripTerminal } from './ansi';
import type { WireMessage } from './frames';

export type ChannelInfo = {
  id: string;
  name: string;
  alias: string;
  lock: string;
  header: string;
};

export type ChannelPost = {
  id: string;
  channel: string;
  from: string;
  body: string;
  at: number;
  mode: 'say' | 'pose' | 'semi';
};

export type ChannelRow = ChannelInfo & {
  preview: string;
  unread: number;
  at: string;
};

export function channelKey(name: string): string {
  return stripTerminal(name).trim().toLowerCase();
}

export function isDefinedChannel(name: string): boolean {
  return Boolean(channelKey(name));
}

export function aliasFor(raw: string, name: string): string {
  const given = raw.trim().toLowerCase();
  if (given) return given.replace(/[^a-z0-9]/g, '').slice(0, 8) || given.slice(0, 8);
  const base = channelKey(name).replace(/[^a-z0-9]/g, '');
  return base.slice(0, 3) || 'ch';
}

export function parseChannel(raw: unknown): ChannelInfo | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  const name = stripTerminal(String(rec.name ?? '')).trim();
  if (!isDefinedChannel(name)) return null;
  const lock = String(rec.lock ?? '');
  if (/admin|wizard/i.test(lock) && !/connected/i.test(lock)) return null;
  return {
    id: String(rec.id ?? channelKey(name)),
    name,
    alias: aliasFor(typeof rec.alias === 'string' ? rec.alias : '', name),
    lock,
    header: stripTerminal(String(rec.header ?? rec.tag ?? '')).trim() || name.toUpperCase(),
  };
}

export function parseChannelList(decoded: unknown): ChannelInfo[] {
  const items = Array.isArray(decoded)
    ? decoded
    : decoded && typeof decoded === 'object'
      ? ((decoded as { items?: unknown[]; channels?: unknown[] }).items ??
          (decoded as { channels?: unknown[] }).channels ??
          [])
      : [];
  return items.flatMap((row) => {
    const chan = parseChannel(row);
    return chan ? [chan] : [];
  });
}

export function parseChannelPost(raw: unknown, fallbackChannel = ''): ChannelPost | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  const channel = stripTerminal(String(rec.channel ?? rec.chanName ?? fallbackChannel)).trim();
  if (!isDefinedChannel(channel)) return null;
  const body = stripTerminal(String(rec.body ?? rec.message ?? rec.text ?? '')).trim();
  if (!body) return null;
  const mode = rec.mode === 'pose' || rec.channelMode === 'pose'
    ? 'pose'
    : rec.mode === 'semi' || rec.channelMode === 'semi'
      ? 'semi'
      : 'say';
  return {
    id: String(rec.id ?? `cp-${channelKey(channel)}-${rec.at ?? rec.timestamp ?? rec.date ?? body}`),
    channel,
    from: stripTerminal(String(rec.from ?? rec.playerName ?? rec.name ?? '')).trim(),
    body,
    at: typeof rec.at === 'number' ? rec.at : Number(rec.at ?? rec.timestamp ?? rec.date) || 0,
    mode,
  };
}

export function parseChannelHistory(decoded: unknown, channel: string): ChannelPost[] {
  const items = Array.isArray(decoded)
    ? decoded
    : decoded && typeof decoded === 'object' && Array.isArray((decoded as { items?: unknown }).items)
      ? (decoded as { items: unknown[] }).items
      : [];
  return items.flatMap((row) => {
    const post = parseChannelPost(row, channel);
    return post ? [post] : [];
  });
}

export function channelFromWire(message: WireMessage): ChannelPost | null {
  const ui = message.data.ui;
  if (!ui || typeof ui !== 'object') return null;
  const rec = ui as Record<string, unknown>;
  if (String(rec.type ?? '') !== 'chat') return null;
  if (String(rec.kind ?? '') !== 'channel') return null;
  return parseChannelPost({
    channel: rec.channel,
    name: rec.name,
    text: rec.text,
    at: rec.at,
    channelMode: rec.channelMode,
    id: rec.id,
  });
}

export function channelWireBreaks(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '%r');
}

export function channelSendLine(alias: string, text: string, mode: 'say' | 'pose' = 'say'): string {
  const who = alias.trim();
  const body = text.trim();
  if (!who || !body) return '';
  if (mode === 'pose') {
    const pose = body.startsWith(':') ? body.slice(1).trim() : body;
    return `${who} :${channelWireBreaks(pose)}`;
  }
  return `${who} ${channelWireBreaks(body)}`;
}

export function channelJoinLine(alias: string, name: string): string {
  return `addcom ${alias}=${name}`;
}

export function postsForChannel(posts: ChannelPost[], channel: string): ChannelPost[] {
  const key = channelKey(channel);
  if (!key) return [];
  return posts.filter((post) => channelKey(post.channel) === key);
}

export function channelRows(channels: ChannelInfo[], posts: Record<string, ChannelPost[]>): ChannelRow[] {
  return channels.map((chan) => {
    const log = posts[channelKey(chan.name)] ?? [];
    const last = log[log.length - 1];
    return {
      ...chan,
      preview: (last?.body ?? '').split('\n')[0] ?? '',
      unread: 0,
      at: last?.from ?? '',
    };
  });
}
