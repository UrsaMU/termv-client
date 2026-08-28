import { stripTerminal } from './ansi';

export type BoardItem = {
  id: string;
  num: number;
  title: string;
  category: string;
  posts: number;
  unread: number;
};

export type BoardReply = {
  num: number;
  from: string;
  body: string;
  date: number;
};

export type BoardPost = {
  id: string;
  num: number;
  subject: string;
  from: string;
  body: string;
  date: number;
  sticky: boolean;
  replies: BoardReply[];
};

export type BoardCompose = {
  subject: string;
  body: string;
};

export function parseBoard(raw: unknown): BoardItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  const id = String(rec.id ?? '').trim();
  const title = stripTerminal(String(rec.title ?? rec.name ?? '')).trim();
  const num = Number(rec.num ?? rec.number);
  if (!id || !title || !Number.isFinite(num) || num <= 0) return null;
  return {
    id,
    num,
    title,
    category: stripTerminal(String(rec.category ?? '')).trim().toUpperCase() || 'BOARD',
    posts: Number(rec.postCount ?? rec.posts) || 0,
    unread: Number(rec.unreadCount ?? rec.unread) || 0,
  };
}

export function parseBoardList(decoded: unknown): BoardItem[] {
  const items = Array.isArray(decoded)
    ? decoded
    : decoded && typeof decoded === 'object' && Array.isArray((decoded as { items?: unknown }).items)
      ? (decoded as { items: unknown[] }).items
      : [];
  return items.flatMap((row) => {
    const board = parseBoard(row);
    return board ? [board] : [];
  });
}

export function parseBoardReply(raw: unknown): BoardReply | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  const body = stripTerminal(String(rec.body ?? rec.message ?? rec.text ?? '')).trim();
  const num = Number(rec.num ?? rec.number);
  if (!body || !Number.isFinite(num) || num <= 0) return null;
  return {
    num,
    from: stripTerminal(String(rec.authorName ?? rec.author ?? rec.from ?? '')).trim() || 'OPS',
    body,
    date: typeof rec.createdAt === 'number' ? rec.createdAt : Number(rec.createdAt ?? rec.date) || 0,
  };
}

export function parseBoardPost(raw: unknown): BoardPost | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  const subject = stripTerminal(String(rec.subject ?? rec.title ?? '')).trim();
  const num = Number(rec.num ?? rec.number);
  if (!subject || !Number.isFinite(num) || num <= 0) return null;
  const replies = Array.isArray(rec.replies)
    ? rec.replies.flatMap((row) => {
        const reply = parseBoardReply(row);
        return reply ? [reply] : [];
      })
    : [];
  return {
    id: String(rec.id ?? `bp-${num}`),
    num,
    subject,
    from: stripTerminal(String(rec.authorName ?? rec.author ?? rec.from ?? '')).trim() || 'OPS',
    body: stripTerminal(String(rec.body ?? rec.message ?? rec.text ?? '')),
    date: typeof rec.createdAt === 'number' ? rec.createdAt : Number(rec.createdAt ?? rec.date) || 0,
    sticky: rec.sticky === true,
    replies,
  };
}

export function parseBoardPosts(decoded: unknown): BoardPost[] {
  const items = Array.isArray(decoded)
    ? decoded
    : decoded && typeof decoded === 'object' && Array.isArray((decoded as { posts?: unknown }).posts)
      ? (decoded as { posts: unknown[] }).posts
      : [];
  return sortBoardPosts(
    items.flatMap((row) => {
      const post = parseBoardPost(row);
      return post ? [post] : [];
    }),
  );
}

export function sortBoardPosts(posts: BoardPost[]): BoardPost[] {
  return [...posts].sort((a, b) => {
    if (a.sticky !== b.sticky) return a.sticky ? -1 : 1;
    return a.num - b.num;
  });
}

export function boardPostReady(draft: Pick<BoardCompose, 'subject' | 'body'>): boolean {
  return Boolean(draft.subject.trim() && draft.body.trim());
}

export function boardReplyReady(note: string): boolean {
  return Boolean(note.trim());
}

export function unreadBoardCount(boards: BoardItem[]): number {
  return boards.reduce((sum, row) => sum + (row.unread > 0 ? row.unread : 0), 0);
}

export function markBoardRead(boards: BoardItem[], id: string): BoardItem[] {
  return boards.map((row) => (row.id === id ? { ...row, unread: 0 } : row));
}
