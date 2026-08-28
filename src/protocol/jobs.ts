import { stripTerminal } from './ansi';

export type JobFolder = 'open' | 'cgen' | 'closed' | 'all';

export type JobStatus = 'new' | 'open' | 'closed' | 'cancelled' | 'resolved';

export type JobComment = {
  id: string;
  author: string;
  text: string;
  date: number;
  staffOnly: boolean;
  action: string;
};

export type JobItem = {
  id: string;
  number: number;
  title: string;
  from: string;
  submitterId: string;
  bucket: string;
  status: JobStatus;
  priority: string;
  assigned: string;
  body: string;
  date: number;
  comments: JobComment[];
};

export type JobCompose = {
  title: string;
  body: string;
  bucket: string;
};

export const JOB_BUCKETS = [
  'BUG',
  'BUILD',
  'CGEN',
  'SUGGESTION',
  'TYPO',
  'LOGS',
  'PLOT',
  'PRP',
  'PVP',
  'ROSTER',
  'XP',
  'WIKI',
  'SPHERE',
  'INFLUENCE',
] as const;

export type JobBucket = (typeof JOB_BUCKETS)[number];

export function jobBucketOf(raw: string): JobBucket {
  const key = raw.trim().toUpperCase();
  return (JOB_BUCKETS as readonly string[]).includes(key) ? (key as JobBucket) : 'SPHERE';
}

const OPEN_STATUSES = new Set<JobStatus>(['new', 'open']);
const CLOSED_STATUSES = new Set<JobStatus>(['closed', 'cancelled', 'resolved']);

export function jobStatusOf(raw: unknown): JobStatus {
  const value = String(raw ?? '').toLowerCase();
  if (value === 'open') return 'open';
  if (value === 'closed') return 'closed';
  if (value === 'cancelled' || value === 'canceled') return 'cancelled';
  if (value === 'resolved') return 'resolved';
  return 'new';
}

export function parseJobComment(raw: unknown, index = 0): JobComment | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  const text = stripTerminal(String(rec.text ?? rec.message ?? rec.body ?? ''));
  if (!text) return null;
  return {
    id: String(rec.id ?? `jc-${index}`),
    author: stripTerminal(String(rec.authorName ?? rec.author ?? rec.from ?? 'STAFF')).trim() || 'STAFF',
    text,
    date: typeof rec.timestamp === 'number' ? rec.timestamp : Number(rec.timestamp ?? rec.date) || 0,
    staffOnly: rec.staffOnly === true || rec.published === false,
    action: String(rec.action ?? '').trim(),
  };
}

export function parseJob(raw: unknown): JobItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  const id = String(rec.id ?? '').trim();
  const number = Number(rec.number);
  const title = stripTerminal(String(rec.title ?? '')).trim();
  if (!id || !title || !Number.isFinite(number) || number <= 0) return null;
  const comments = Array.isArray(rec.comments)
    ? rec.comments.flatMap((row, index) => {
        const comment = parseJobComment(row, index);
        return comment ? [comment] : [];
      })
    : [];
  const bucket = String(rec.bucket ?? rec.category ?? '')
    .trim()
    .toUpperCase();
  return {
    id,
    number,
    title,
    from: stripTerminal(String(rec.submitterName ?? rec.fromName ?? rec.from ?? '')).trim() || 'OPS',
    submitterId: String(rec.submittedBy ?? rec.submitterId ?? rec.fromId ?? '')
      .replace(/^#/, '')
      .trim(),
    bucket: bucket || 'REQUEST',
    status: jobStatusOf(rec.status),
    priority: String(rec.priority ?? 'normal').toLowerCase() || 'normal',
    assigned: stripTerminal(String(rec.assigneeName ?? rec.assignedTo ?? '')).trim(),
    body: stripTerminal(String(rec.description ?? rec.body ?? rec.message ?? '')),
    date: typeof rec.createdAt === 'number' ? rec.createdAt : Number(rec.createdAt ?? rec.date) || 0,
    comments,
  };
}

export function parseJobList(decoded: unknown): JobItem[] {
  const items = Array.isArray(decoded)
    ? decoded
    : decoded && typeof decoded === 'object' && Array.isArray((decoded as { items?: unknown }).items)
      ? (decoded as { items: unknown[] }).items
      : [];
  return items.flatMap((row) => {
    const job = parseJob(row);
    return job ? [job] : [];
  });
}

export function jobIsOpen(job: Pick<JobItem, 'status'>): boolean {
  return OPEN_STATUSES.has(job.status);
}

export function jobIsCgen(job: Pick<JobItem, 'bucket'>): boolean {
  return job.bucket.toUpperCase() === 'CGEN';
}

export function filterJobsByFolder(jobs: JobItem[], folder: JobFolder): JobItem[] {
  if (folder === 'all') return jobs;
  if (folder === 'cgen') return jobs.filter(jobIsCgen);
  if (folder === 'closed') return jobs.filter((job) => CLOSED_STATUSES.has(job.status));
  return jobs.filter(jobIsOpen);
}

export function openJobCount(jobs: JobItem[]): number {
  return jobs.filter(jobIsOpen).length;
}

export function cgenJobCount(jobs: JobItem[]): number {
  return jobs.filter((job) => jobIsCgen(job) && jobIsOpen(job)).length;
}

export function newJobCount(jobs: JobItem[]): number {
  return jobs.filter((job) => job.status === 'new').length;
}

export function parseJobArg(raw: string): { number: number; note: string } | null {
  const line = raw.trim();
  if (!line) return null;
  const eq = line.indexOf('=');
  const left = (eq === -1 ? line : line.slice(0, eq)).trim();
  const note = eq === -1 ? '' : line.slice(eq + 1).trim();
  const digits = left.replace(/^job-/i, '');
  const number = Number.parseInt(digits, 10);
  if (!Number.isFinite(number) || number <= 0) return null;
  return { number, note };
}

export function jobsListLine(folder = ''): string {
  const key = folder.trim().toLowerCase();
  if (key === 'cgen') return '+job/bucket CGEN';
  if (!key || key === 'open' || key === 'all') return '+jobs';
  return `+jobs/${key}`;
}

export function jobReadLine(number: number): string {
  return `+job ${number}`;
}

export function jobApproveLine(
  job: Pick<JobItem, 'number' | 'from' | 'bucket'> | number,
  note = '',
): string {
  const text = note.trim();
  const number = typeof job === 'number' ? job : job.number;
  return text ? `+job/approve ${number}=${text}` : `+job/approve ${number}`;
}

/** CGEN tickets also need +chargen/approve so the sheet unlocks. */
export function jobChargenApproveLine(
  job: Pick<JobItem, 'from' | 'bucket' | 'submitterId'>,
  note = '',
): string | null {
  if (!jobIsCgen(job)) return null;
  const id = String(job.submitterId ?? '').replace(/^#/, '').trim();
  const name = job.from.trim();
  const who = id ? `#${id}` : name && name !== 'OPS' ? name : '';
  if (!who) return null;
  const text = note.trim();
  return text ? `+chargen/approve ${who}=${text}` : `+chargen/approve ${who}`;
}

export function jobReplyLine(number: number, note: string): string {
  return `+request/comment ${number}=${note.trim()}`;
}

export function jobCommentLine(number: number, note: string): string {
  return `+job/comment ${number}=${note.trim()}`;
}

export function jobOpsNoteLine(number: number, note: string): string {
  return `+job/note ${number}=${note.trim()}`;
}

export function visibleJobComments(comments: JobComment[], staff: boolean): JobComment[] {
  return staff ? comments : comments.filter((comment) => !comment.staffOnly);
}

export function jobDenyLine(
  job: Pick<JobItem, 'number' | 'from' | 'bucket'> | number,
  note = '',
): string {
  const text = note.trim();
  if (typeof job === 'number') {
    return text ? `+job/deny ${job}=${text}` : `+job/deny ${job}`;
  }
  if (jobIsCgen(job) && job.from) {
    return text ? `+chargen/reject ${job.from}=${text}` : `+chargen/reject ${job.from}`;
  }
  return text ? `+job/deny ${job.number}=${text}` : `+job/deny ${job.number}`;
}

export function commentReady(note: string): boolean {
  return Boolean(note.trim());
}

export function requestReady(draft: Pick<JobCompose, 'title' | 'body'>): boolean {
  return Boolean(draft.title.trim() && draft.body.trim());
}
