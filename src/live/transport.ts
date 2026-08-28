import { stripTerminal } from '../protocol/ansi';
import { AUTH_LOGIN, AUTH_REGISTER } from '../protocol/auth';
import { parseMail, parseMailList, type MailFolder, type MailItem } from '../protocol/mail';
import { parseJob, parseJobList, type JobItem } from '../protocol/jobs';
import {
  parseChannelHistory,
  parseChannelList,
  type ChannelInfo,
  type ChannelPost,
} from '../protocol/channel';
import { parseBoardList, parseBoardPost, parseBoardPosts, type BoardItem, type BoardPost } from '../protocol/boards';
import type { WireMessage } from '../protocol/frames';
import { parseWikiList, parseWikiPage, type WikiPage, type WikiStub } from '../protocol/wiki';

export type { MailItem } from '../protocol/mail';
export type { JobItem } from '../protocol/jobs';
export type { ChannelInfo, ChannelPost } from '../protocol/channel';
export type { BoardItem, BoardPost } from '../protocol/boards';
export type { WikiPage, WikiStub } from '../protocol/wiki';

export type CommsPost = ChannelPost;

export type AuthResult = { token: string; flags?: string; id?: string };

export class TransportError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'TransportError';
  }
}

export class LiveLink {
  token: string | null = null;
  private socket: WebSocket | null = null;

  constructor(
    public httpBase: string,
    public wsBase: string,
  ) {}

  async login(name: string, password: string): Promise<AuthResult> {
    return this.auth(AUTH_LOGIN, { username: name, password });
  }

  async register(name: string, email: string, password: string): Promise<AuthResult> {
    return this.auth(AUTH_REGISTER, { username: name, email, password });
  }

  private async auth(
    path: string,
    body: Record<string, string>,
  ): Promise<AuthResult> {
    const res = await fetch(`${this.httpBase}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const decoded: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const message =
        decoded && typeof decoded === 'object' && 'error' in decoded
          ? String((decoded as { error: unknown }).error)
          : `auth failed ${res.status}`;
      throw new TransportError(message, res.status);
    }
    if (decoded && typeof decoded === 'object') {
      const rec = decoded as Record<string, unknown>;
      const token = rec.token ?? rec.access_token;
      if (typeof token === 'string' && token.length > 0) {
        this.token = token;
        const flags = Array.isArray(rec.flags)
          ? rec.flags.map(String).join(' ')
          : typeof rec.flags === 'string'
            ? rec.flags
            : undefined;
        return {
          token,
          flags,
          id: typeof rec.id === 'string' ? rec.id : undefined,
        };
      }
    }
    throw new TransportError('auth response missing token');
  }

  async listChannels(): Promise<ChannelInfo[]> {
    const res = await fetch(`${this.httpBase}/api/v1/channels`);
    if (!res.ok) throw new TransportError(`channels ${res.status}`, res.status);
    return parseChannelList(await res.json().catch(() => null));
  }

  async history(chan: ChannelInfo): Promise<ChannelPost[]> {
    if (!this.token || !chan.id) return [];
    const res = await fetch(
      `${this.httpBase}/api/v1/channels/${encodeURIComponent(chan.id)}/history?limit=40`,
      { headers: { Authorization: `Bearer ${this.token}` } },
    );
    if (!res.ok) return [];
    return parseChannelHistory(await res.json().catch(() => null), chan.name);
  }

  async listBoards(): Promise<BoardItem[]> {
    if (!this.token) return [];
    const res = await fetch(`${this.httpBase}/api/v1/boards`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!res.ok) return [];
    return parseBoardList(await res.json().catch(() => null));
  }

  async listBoardPosts(id: string): Promise<BoardPost[]> {
    if (!this.token || !id) return [];
    const res = await fetch(`${this.httpBase}/api/v1/boards/${encodeURIComponent(id)}/posts?limit=40`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!res.ok) return [];
    return parseBoardPosts(await res.json().catch(() => null));
  }

  async createBoardPost(id: string, subject: string, body: string): Promise<BoardPost> {
    if (!this.token) throw new TransportError('not linked');
    const res = await fetch(`${this.httpBase}/api/v1/boards/${encodeURIComponent(id)}/posts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, body }),
    });
    const decoded: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const message =
        decoded && typeof decoded === 'object' && 'error' in decoded
          ? String((decoded as { error: unknown }).error)
          : `board post ${res.status}`;
      throw new TransportError(message, res.status);
    }
    const post = parseBoardPost(decoded);
    if (!post) throw new TransportError('board post missing record');
    return post;
  }

  async replyBoardPost(id: string, num: number, body: string): Promise<void> {
    if (!this.token) throw new TransportError('not linked');
    const res = await fetch(
      `${this.httpBase}/api/v1/boards/${encodeURIComponent(id)}/posts/${num}/replies`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      },
    );
    if (!res.ok) {
      const decoded: unknown = await res.json().catch(() => null);
      const message =
        decoded && typeof decoded === 'object' && 'error' in decoded
          ? String((decoded as { error: unknown }).error)
          : `board reply ${res.status}`;
      throw new TransportError(message, res.status);
    }
  }

  async markBoardRead(id: string): Promise<void> {
    if (!this.token || !id) return;
    await fetch(`${this.httpBase}/api/v1/boards/${encodeURIComponent(id)}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}` },
    }).catch(() => null);
  }

  async listMail(folder: MailFolder = 'inbox'): Promise<MailItem[]> {
    if (!this.token) return [];
    const path = folder === 'sent' ? '/api/v1/mail/sent' : `/api/v1/mail?folder=${folder}`;
    const res = await fetch(`${this.httpBase}${path}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!res.ok) return [];
    return parseMailList(await res.json().catch(() => null), folder);
  }

  async getMail(id: string, folder: MailFolder = 'inbox'): Promise<MailItem | null> {
    if (!this.token || !id) return null;
    const res = await fetch(`${this.httpBase}/api/v1/mail/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!res.ok) return null;
    return parseMail(await res.json().catch(() => null), folder);
  }

  async sendMail(to: string[], subject: string, message: string): Promise<void> {
    if (!this.token) throw new TransportError('not linked');
    const res = await fetch(`${this.httpBase}/api/v1/mail`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, message }),
    });
    if (!res.ok) {
      const decoded: unknown = await res.json().catch(() => null);
      const messageText =
        decoded && typeof decoded === 'object' && 'error' in decoded
          ? String((decoded as { error: unknown }).error)
          : `mail send ${res.status}`;
      throw new TransportError(messageText, res.status);
    }
  }

  async patchMail(id: string, patch: { folder?: 'inbox' | 'trash'; starred?: boolean }): Promise<void> {
    if (!this.token) throw new TransportError('not linked');
    const res = await fetch(`${this.httpBase}/api/v1/mail/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new TransportError(`mail patch ${res.status}`, res.status);
  }

  async deleteMail(id: string): Promise<void> {
    if (!this.token) throw new TransportError('not linked');
    const res = await fetch(`${this.httpBase}/api/v1/mail/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!res.ok) throw new TransportError(`mail delete ${res.status}`, res.status);
  }

  async listJobs(): Promise<JobItem[]> {
    if (!this.token) return [];
    const res = await fetch(`${this.httpBase}/api/v1/jobs?limit=200`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!res.ok) throw new TransportError(`jobs ${res.status}`, res.status);
    return parseJobList(await res.json().catch(() => null));
  }

  async getJob(id: string): Promise<JobItem | null> {
    if (!this.token || !id) return null;
    const res = await fetch(`${this.httpBase}/api/v1/jobs/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!res.ok) return null;
    return parseJob(await res.json().catch(() => null));
  }

  async createJob(title: string, description: string, category = 'request'): Promise<JobItem> {
    if (!this.token) throw new TransportError('not linked');
    const res = await fetch(`${this.httpBase}/api/v1/jobs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, category }),
    });
    const decoded: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const message =
        decoded && typeof decoded === 'object' && 'error' in decoded
          ? String((decoded as { error: unknown }).error)
          : `job create ${res.status}`;
      throw new TransportError(message, res.status);
    }
    const job = parseJob(decoded);
    if (!job) throw new TransportError('job create missing record');
    return job;
  }

  async patchJob(id: string, patch: { status?: string; title?: string; description?: string }): Promise<JobItem | null> {
    if (!this.token) throw new TransportError('not linked');
    const res = await fetch(`${this.httpBase}/api/v1/jobs/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new TransportError(`job patch ${res.status}`, res.status);
    return parseJob(await res.json().catch(() => null));
  }

  async commentJob(id: string, text: string, staffOnly = false): Promise<void> {
    if (!this.token) throw new TransportError('not linked');
    const res = await fetch(`${this.httpBase}/api/v1/jobs/${encodeURIComponent(id)}/comment`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, staffOnly }),
    });
    if (!res.ok) {
      const decoded: unknown = await res.json().catch(() => null);
      const message =
        decoded && typeof decoded === 'object' && 'error' in decoded
          ? String((decoded as { error: unknown }).error)
          : `job comment ${res.status}`;
      throw new TransportError(message, res.status);
    }
  }

  async listWiki(): Promise<WikiStub[]> {
    const headers: HeadersInit = {};
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    const res = await fetch(`${this.httpBase}/api/v1/wiki`, { headers });
    if (!res.ok) return [];
    return parseWikiList(await res.json().catch(() => null));
  }

  async getWiki(path: string): Promise<WikiPage | null> {
    const slug = path.trim().replace(/^\/+/, '');
    if (!slug) return null;
    const headers: HeadersInit = {};
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    const res = await fetch(`${this.httpBase}/api/v1/wiki/${slug.split('/').map(encodeURIComponent).join('/')}`, {
      headers,
    });
    if (!res.ok) return null;
    return parseWikiPage(await res.json().catch(() => null), slug);
  }

  connect(token: string, onMessage: (msg: WireMessage) => void, onError: (err: Error) => void): void {
    this.close();
    const socket = new WebSocket(wsUri(this.wsBase));
    this.socket = socket;
    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({ type: 'auth', token }));
    });
    socket.addEventListener('message', (event) => {
      onMessage(parseWire(String(event.data)));
    });
    socket.addEventListener('error', () => {
      onError(new TransportError('socket error'));
    });
    socket.addEventListener('close', () => {
      if (this.socket === socket) this.socket = null;
    });
  }

  send(line: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new TransportError('not linked');
    }
    this.socket.send(JSON.stringify({ msg: line }));
  }

  close(): void {
    this.socket?.close();
    this.socket = null;
  }
}

export function parseWire(raw: string): WireMessage {
  try {
    const decoded: unknown = JSON.parse(raw);
    if (!decoded || typeof decoded !== 'object') {
      return { text: stripTerminal(raw), data: {} };
    }
    const rec = decoded as Record<string, unknown>;
    const data =
      rec.data && typeof rec.data === 'object' && !Array.isArray(rec.data)
        ? (rec.data as Record<string, unknown>)
        : {};
    return { text: stripTerminal(String(rec.msg ?? '')), data };
  } catch {
    return { text: stripTerminal(raw), data: {} };
  }
}

export function wsUri(raw: string): string {
  const url = new URL(raw);
  if (url.searchParams.get('clientType')) return url.toString();
  url.searchParams.set('clientType', 'web');
  return url.toString();
}


