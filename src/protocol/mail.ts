import { stripTerminal } from './ansi';

export type MailFolder = 'inbox' | 'sent' | 'trash';

export type MailCompose = {
  to: string;
  subject: string;
  body: string;
};

export type MailItem = {
  id: string;
  subject: string;
  from: string;
  fromRef: string;
  to: string[];
  body: string;
  date: number;
  state: 'read' | 'unread';
  folder: MailFolder;
  starred: boolean;
};

export function mailStateOf(rec: Record<string, unknown>): 'read' | 'unread' {
  if (rec.read === true || rec.read === 'true' || rec.read === 'read') return 'read';
  const state = String(rec.state ?? '').toLowerCase();
  if (state === 'read') return 'read';
  return 'unread';
}

export function fromLabel(raw: string): string {
  const clean = stripTerminal(raw)
    .replace(/<#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})>/g, '')
    .trim();
  if (!clean || clean === '#0' || clean === '0') return 'OPS';
  return clean.replace(/^#/, '');
}

export function parseMail(raw: unknown, folder: MailFolder = 'inbox'): MailItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  const id = String(rec.id ?? '').trim();
  const subject = stripTerminal(String(rec.subject ?? rec.title ?? rec.header ?? '')).trim();
  if (!id || !subject) return null;
  const namedTo = Array.isArray(rec.toNames) ? rec.toNames : null;
  const toRaw = Array.isArray(rec.to) ? rec.to : [];
  const recFolder = rec.folder === 'trash' ? 'trash' : folder;
  return {
    id,
    subject,
    from: fromLabel(String(rec.fromName ?? rec.from ?? rec.sender ?? '')),
    fromRef: String(rec.from ?? '').trim(),
    to: (namedTo ?? toRaw).map((entry) => fromLabel(String(entry))),
    body: stripTerminal(String(rec.message ?? rec.body ?? rec.text ?? '')),
    date: typeof rec.date === 'number' ? rec.date : Number(rec.date) || 0,
    state: mailStateOf(rec),
    folder: recFolder,
    starred: rec.starred === true,
  };
}

export function parseMailList(decoded: unknown, folder: MailFolder = 'inbox'): MailItem[] {
  const items = Array.isArray(decoded)
    ? decoded
    : decoded && typeof decoded === 'object' && Array.isArray((decoded as { items?: unknown }).items)
      ? (decoded as { items: unknown[] }).items
      : [];
  return items.flatMap((row) => {
    const mail = parseMail(row, folder);
    return mail ? [mail] : [];
  });
}

export function replySubject(subject: string): string {
  const trimmed = subject.trim();
  return /^re:\s/i.test(trimmed) ? trimmed : `Re: ${trimmed}`;
}

export function replyAddress(item: Pick<MailItem, 'from' | 'fromRef'>): string {
  const name = item.from.trim();
  if (name && name !== 'OPS' && !/^#?\d+$/.test(name)) return name;
  const ref = item.fromRef.trim();
  if (ref && ref !== '#0' && ref !== '0') return ref.startsWith('#') ? ref : `#${ref}`;
  if (name === 'OPS' || ref === '#0' || ref === '0') return '#0';
  return name || ref;
}

export function replyDraft(item: Pick<MailItem, 'from' | 'fromRef' | 'subject'>): MailCompose {
  return { to: replyAddress(item), subject: replySubject(item.subject), body: '' };
}

export function composeReady(draft: MailCompose): boolean {
  return Boolean(draft.to.trim() && draft.subject.trim() && draft.body.trim());
}

export function splitRecipients(raw: string): string[] {
  return raw
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}
