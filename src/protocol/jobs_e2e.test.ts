import { describe, expect, it } from 'vitest';
import {
  commentReady,
  filterJobsByFolder,
  jobApproveLine,
  jobChargenApproveLine,
  jobCommentLine,
  jobDenyLine,
  jobOpsNoteLine,
  jobReplyLine,
  parseJob,
  parseJobList,
  requestReady,
  visibleJobComments,
} from './jobs';

const runnerJob = {
  id: 'job-5',
  number: 5,
  title: 'Harbor lamp',
  bucket: 'BUG',
  status: 'open',
  submittedBy: '12',
  submitterName: 'KESS',
  description: 'Harbor Keys lamp loops.',
  comments: [
    { id: 'jc-1', authorName: 'KESS', text: 'still looping', published: true },
    { id: 'jc-2', authorName: 'OPS', text: 'check the ballast', published: true },
    { id: 'jc-3', authorName: 'OPS', text: 'maybe a known art bug', staffOnly: true },
  ],
  createdAt: 1,
  updatedAt: 1,
};

const cgenJob = {
  id: 'job-8',
  number: 8,
  title: 'CGEN pending: KESS (nodejacker)',
  bucket: 'CGEN',
  status: 'new',
  submittedBy: '12',
  submitterName: 'KESS',
  description: 'STATUS: PENDING STAFF APPROVAL\nNote: ran the docks.',
  comments: [],
  createdAt: 1,
  updatedAt: 1,
};

describe('jobs e2e use-cases', () => {
  it('player files a request then replies on their own ticket', () => {
    expect(requestReady({ title: 'Harbor lamp', body: 'Harbor Keys lamp loops.' })).toBe(true);
    expect(jobReplyLine(5, 'still looping')).toBe('+request/comment 5=still looping');
    expect(commentReady('still looping')).toBe(true);
    const job = parseJob(runnerJob)!;
    expect(visibleJobComments(job.comments, false).map((row) => row.text)).toEqual([
      'still looping',
      'check the ballast',
    ]);
  });

  it('player never sees an ops note', () => {
    const job = parseJob(runnerJob)!;
    expect(job.comments.find((row) => row.text === 'maybe a known art bug')?.staffOnly).toBe(true);
    expect(visibleJobComments(job.comments, false).some((row) => row.staffOnly)).toBe(false);
  });

  it('staff posts a runner-visible reply and a hidden ops note', () => {
    expect(jobCommentLine(5, 'check the ballast')).toBe('+job/comment 5=check the ballast');
    expect(jobOpsNoteLine(5, 'maybe a known art bug')).toBe('+job/note 5=maybe a known art bug');
    const job = parseJob(runnerJob)!;
    const staffView = visibleJobComments(job.comments, true);
    expect(staffView.map((row) => `${row.staffOnly ? 'OPS' : 'PUB'} ${row.text}`)).toEqual([
      'PUB still looping',
      'PUB check the ballast',
      'OPS maybe a known art bug',
    ]);
  });

  it('staff approves a CGEN ticket and unlocks the sheet', () => {
    const job = parseJob(cgenJob)!;
    expect(jobApproveLine(job, 'Looks good')).toBe('+job/approve 8=Looks good');
    expect(jobChargenApproveLine(job, 'Looks good')).toBe('+chargen/approve #12=Looks good');
  });

  it('staff deny needs a note and kicks CGEN back', () => {
    expect(commentReady('')).toBe(false);
    const job = parseJob(cgenJob)!;
    expect(jobDenyLine(job, 'thin bg')).toBe('+chargen/reject KESS=thin bg');
    expect(jobDenyLine(parseJob(runnerJob)!, 'wont fix')).toBe('+job/deny 5=wont fix');
  });

  it('folders split open / cgen / closed for both desks', () => {
    const jobs = parseJobList([
      runnerJob,
      cgenJob,
      { ...cgenJob, id: 'job-1', number: 1, status: 'closed', title: 'old cgen' },
    ]);
    expect(filterJobsByFolder(jobs, 'open').map((row) => row.number)).toEqual([5, 8]);
    expect(filterJobsByFolder(jobs, 'cgen').map((row) => row.number)).toEqual([8, 1]);
    expect(filterJobsByFolder(jobs, 'closed').map((row) => row.number)).toEqual([1]);
  });
});
