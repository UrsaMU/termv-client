export const NOTICE_TTL_MS = 60_000;

export type NoticeKind = 'mail' | 'jobs' | 'alert' | 'system' | 'payout';

export type NoticeDraft = {
  kind: NoticeKind;
  title: string;
  body: string;
  to?: string;
};

export type BulletinFold = {
  capturing: boolean;
  motdLines: string[];
  lastLogin?: string;
  notices: NoticeDraft[];
  feed: string[];
};

export type MotdBulletin = {
  title: string;
  body: string;
};

const MAIL_UNREAD = /^you have (\d+) unread mail/i;
const MAIL_NEW = /(?:^mail:|new mail|received mail)/i;
const JOBS_REPLY = /^>?JOBS:.*replied on #\d+/i;
const LAST_LOGIN = /^last login:\s*(.+)/i;
const WELCOME_BACK = /^welcome back\b/i;
const MOTD_HEAD = /message of the day/i;
const MOTD_RULE = /^-{5,}$/;
const FAILED = /(\d+)\s+failed login attempt/i;
const SPRAWL_NOTE = /^\[sprawl\]\s*(.+)/i;

export function emptyFold(): BulletinFold {
  return { capturing: false, motdLines: [], notices: [], feed: [] };
}

export function unreadMailCount(items: Array<{ state: string }>): number {
  return items.filter((item) => item.state === 'unread').length;
}

export function mailNotice(count: number): NoticeDraft | null {
  if (count <= 0) return null;
  return {
    kind: 'mail',
    title: 'MAIL',
    body: `${String(count).padStart(2, '0')} UNREAD`,
    to: '/comms',
  };
}

export function jobNotice(count: number, to = '/comms'): NoticeDraft | null {
  if (count <= 0) return null;
  return {
    kind: 'jobs',
    title: 'JOBS',
    body: `${String(count).padStart(2, '0')} NEW`,
    to,
  };
}

export function foldBulletin(prev: BulletinFold, lines: string[]): BulletinFold {
  let capturing = prev.capturing;
  const motdLines = [...prev.motdLines];
  let lastLogin = prev.lastLogin;
  const notices = [...prev.notices];
  const feed: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (MOTD_HEAD.test(line)) {
      capturing = true;
      continue;
    }
    if (capturing && MOTD_RULE.test(line)) {
      capturing = false;
      continue;
    }
    if (capturing) {
      motdLines.push(line);
      continue;
    }
    const last = line.match(LAST_LOGIN);
    if (last) {
      lastLogin = last[1]?.trim() || lastLogin;
      continue;
    }
    if (WELCOME_BACK.test(line)) continue;
    const mail = line.match(MAIL_UNREAD);
    if (mail) {
      const count = Number(mail[1]);
      const note = mailNotice(count);
      if (note && !notices.some((n) => n.kind === 'mail')) notices.push(note);
      continue;
    }
    if (MAIL_NEW.test(line)) {
      if (!notices.some((n) => n.kind === 'mail')) {
        notices.push({ kind: 'mail', title: 'MAIL', body: 'NEW MESSAGE', to: '/comms' });
      }
      continue;
    }
    if (JOBS_REPLY.test(line)) {
      if (!notices.some((n) => n.kind === 'jobs')) {
        notices.push({ kind: 'jobs', title: 'JOBS', body: 'REPLY', to: '/comms' });
      }
      feed.push(line);
      continue;
    }
    const failed = line.match(FAILED);
    if (failed) {
      notices.push({
        kind: 'alert',
        title: 'AUTH',
        body: `${failed[1]} FAILED LOGIN${failed[1] === '1' ? '' : 'S'}`,
      });
      continue;
    }
    const sprawl = line.match(SPRAWL_NOTE);
    if (sprawl) {
      notices.push({ kind: 'system', title: 'SPRAWL', body: sprawl[1].toUpperCase() });
      continue;
    }
    feed.push(line);
  }

  return { capturing, motdLines, lastLogin, notices, feed };
}

export function buildMotd(fold: BulletinFold): MotdBulletin | null {
  const body = fold.motdLines.join('\n').trim();
  if (!body) return null;
  return { title: 'MOTD', body };
}
