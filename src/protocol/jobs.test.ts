import { describe, expect, it } from 'vitest';
import {
  cgenJobCount,
  commentReady,
  filterJobsByFolder,
  jobBucketOf,
  JOB_BUCKETS,
  jobApproveLine,
  jobChargenApproveLine,
  jobCommentLine,
  jobDenyLine,
  jobOpsNoteLine,
  jobReplyLine,
  jobIsCgen,
  jobIsOpen,
  jobReadLine,
  jobsListLine,
  newJobCount,
  openJobCount,
  parseJob,
  parseJobArg,
  parseJobList,
  requestReady,
  visibleJobComments,
} from './jobs';

const cgen = {
  id: 'job-5',
  number: 5,
  title: 'CGEN pending: KESS (nodejacker)',
  bucket: 'CGEN',
  status: 'new',
  submittedBy: '12',
  submitterName: 'KESS',
  description: 'STATUS: PENDING STAFF APPROVAL\nNote: ran the docks.',
  comments: [
    {
      id: 'jc-1',
      authorName: 'OPS',
      text: 'waiting',
      timestamp: 1700000000000,
      staffOnly: false,
    },
  ],
  createdAt: 1700000000000,
  updatedAt: 1700000100000,
};

const bug = {
  id: 'job-2',
  number: 2,
  title: 'Street lamp flicker',
  category: 'BUG',
  status: 'open',
  submitterName: 'glitch.exe',
  description: 'Harbor Keys lamp loops.',
  comments: [],
  createdAt: 1,
  updatedAt: 1,
};

const done = {
  id: 'job-1',
  number: 1,
  title: 'old cgen',
  bucket: 'CGEN',
  status: 'closed',
  submitterName: 'RUST',
  description: 'done',
  comments: [],
  createdAt: 1,
  updatedAt: 1,
};

describe('parseJob', () => {
  it('reads a /api/v1/jobs record', () => {
    const job = parseJob(cgen);
    expect(job).toEqual({
      id: 'job-5',
      number: 5,
      title: 'CGEN pending: KESS (nodejacker)',
      from: 'KESS',
      submitterId: '12',
      bucket: 'CGEN',
      status: 'new',
      priority: 'normal',
      assigned: '',
      body: 'STATUS: PENDING STAFF APPROVAL\nNote: ran the docks.',
      date: 1700000000000,
      comments: [
        {
          id: 'jc-1',
          author: 'OPS',
          text: 'waiting',
          date: 1700000000000,
          staffOnly: false,
          action: '',
        },
      ],
    });
  });

  it('prefers bucket over category and strips ansi', () => {
    const job = parseJob({
      id: 'job-9',
      number: 9,
      title: '%chBUG%cn lamp',
      category: 'request',
      bucket: 'BUG',
      status: 'open',
      fromName: 'gLitch.exe',
      description: '%crred%cn text',
    });
    expect(job?.title).toBe('BUG lamp');
    expect(job?.bucket).toBe('BUG');
    expect(job?.from).toBe('gLitch.exe');
    expect(job?.body).toBe('red text');
  });

  it('drops records with no id, number, or title', () => {
    expect(parseJob({ title: 'no id', number: 1 })).toBeNull();
    expect(parseJob({ id: 'job-1', title: 'no num' })).toBeNull();
    expect(parseJob({ id: 'job-1', number: 1 })).toBeNull();
    expect(parseJob(null)).toBeNull();
  });
});

describe('parseJobList', () => {
  it('keeps valid rows only from an array or { items }', () => {
    expect(parseJobList([cgen, { title: 'drop' }]).map((j) => j.number)).toEqual([5]);
    expect(parseJobList({ items: [bug] }).map((j) => j.id)).toEqual(['job-2']);
  });
});

describe('folders', () => {
  it('splits open / cgen / closed and counts pending CGEN', () => {
    const jobs = parseJobList([cgen, bug, done]);
    expect(filterJobsByFolder(jobs, 'open').map((j) => j.number)).toEqual([5, 2]);
    expect(filterJobsByFolder(jobs, 'cgen').map((j) => j.number)).toEqual([5, 1]);
    expect(filterJobsByFolder(jobs, 'closed').map((j) => j.number)).toEqual([1]);
    expect(filterJobsByFolder(jobs, 'all').map((j) => j.number)).toEqual([5, 2, 1]);
    expect(openJobCount(jobs)).toBe(2);
    expect(cgenJobCount(jobs)).toBe(1);
    expect(newJobCount(jobs)).toBe(1);
    expect(jobIsOpen(jobs[0]!)).toBe(true);
    expect(jobIsCgen(jobs[0]!)).toBe(true);
    expect(jobIsCgen(jobs[1]!)).toBe(false);
  });
});

describe('parseJobArg', () => {
  it('splits <#>=<note> the way +job/approve does', () => {
    expect(parseJobArg('5=Looks good')).toEqual({ number: 5, note: 'Looks good' });
    expect(parseJobArg('  12  ')).toEqual({ number: 12, note: '' });
    expect(parseJobArg('job-5=ok')).toEqual({ number: 5, note: 'ok' });
    expect(parseJobArg('nope')).toBeNull();
    expect(parseJobArg('')).toBeNull();
  });
});

describe('command lines', () => {
  it('builds +job / +jobs / +chargen reject for CGEN deny', () => {
    const job = parseJob(cgen)!;
    expect(jobsListLine('')).toBe('+jobs');
    expect(jobsListLine('cgen')).toBe('+job/bucket CGEN');
    expect(jobReadLine(5)).toBe('+job 5');
    expect(jobApproveLine(5, 'Looks good')).toBe('+job/approve 5=Looks good');
    expect(jobApproveLine(5, '')).toBe('+job/approve 5');
    expect(jobApproveLine(job, '')).toBe('+job/approve 5');
    expect(jobChargenApproveLine(job, '')).toBe('+chargen/approve #12');
    expect(jobChargenApproveLine(job, 'ok')).toBe('+chargen/approve #12=ok');
    expect(jobChargenApproveLine(parseJob(done)!, '')).toBe('+chargen/approve RUST');
    expect(jobChargenApproveLine(parseJob(bug)!, '')).toBeNull();
    expect(jobReplyLine(5, 'need more note')).toBe('+request/comment 5=need more note');
    expect(jobCommentLine(5, 'need more note')).toBe('+job/comment 5=need more note');
    expect(jobOpsNoteLine(5, 'check bg')).toBe('+job/note 5=check bg');
    expect(jobDenyLine(job, 'thin bg')).toBe('+chargen/reject KESS=thin bg');
    expect(jobDenyLine(parseJob(bug)!, 'wont fix')).toBe('+job/deny 2=wont fix');
    expect(jobDenyLine(2, 'later')).toBe('+job/deny 2=later');
  });
});

describe('jobBucketOf', () => {
  it('keeps a known bucket and falls back to SPHERE', () => {
    expect(JOB_BUCKETS).toContain('CGEN');
    expect(jobBucketOf('cgen')).toBe('CGEN');
    expect(jobBucketOf('REQUEST')).toBe('SPHERE');
    expect(jobBucketOf('')).toBe('SPHERE');
  });
});

describe('ready checks', () => {
  it('needs a note to comment or deny, title+body to request', () => {
    expect(commentReady('ok')).toBe(true);
    expect(commentReady('   ')).toBe(false);
    expect(requestReady({ title: 'lamp', body: 'flickers' })).toBe(true);
    expect(requestReady({ title: 'lamp', body: '' })).toBe(false);
  });
});

describe('comment visibility', () => {
  it('treats published:false as staff-only and hides it from players', () => {
    const job = parseJob({
      ...cgen,
      comments: [
        { id: 'jc-1', authorName: 'KESS', text: 'more note', published: true },
        { id: 'jc-2', authorName: 'OPS', text: 'internal', published: false },
        { id: 'jc-3', authorName: 'OPS', text: 'ops', staffOnly: true },
      ],
    });
    expect(job?.comments.map((row) => row.staffOnly)).toEqual([false, true, true]);
    expect(visibleJobComments(job!.comments, false).map((row) => row.text)).toEqual(['more note']);
    expect(visibleJobComments(job!.comments, true).map((row) => row.text)).toEqual([
      'more note',
      'internal',
      'ops',
    ]);
  });
});
