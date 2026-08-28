import { useEffect, useState } from 'react';
import {
  commentReady,
  filterJobsByFolder,
  JOB_BUCKETS,
  jobBucketOf,
  jobIsOpen,
  requestReady,
  visibleJobComments,
  type JobFolder,
} from '../protocol/jobs';
import { useSession } from '../state/session';
import { LookHead, PopupFrame, Row, Slab, SlideVeil } from '../ui/chrome';

const FOLDERS: JobFolder[] = ['open', 'cgen', 'closed', 'all'];

export function JobsList() {
  const session = useSession();
  const [folderOpen, setFolderOpen] = useState(false);
  const jobs = filterJobsByFolder(session.jobs, session.jobFolder);
  const folder = session.jobFolder;
  const open = session.openJob;
  const pending = session.jobPending;

  useEffect(() => {
    void session.loadJobs();
  }, [session.loadJobs]);

  return (
    <div className="slide-stack">
      {folderOpen ? <SlideVeil onClose={() => setFolderOpen(false)} /> : null}
      {folderOpen ? (
        <div className="modes">
          {FOLDERS.map((id) => (
            <Row
              key={id}
              left={id.toUpperCase()}
              selected={id === folder}
              onClick={() => {
                setFolderOpen(false);
                void session.setJobFolder(id);
              }}
            />
          ))}
        </div>
      ) : null}
      <LookHead
        label={`${folder.toUpperCase()} ${folderOpen ? '▴' : '▾'}`}
        count={folder === 'cgen' ? pending || jobs.length : jobs.length}
        onClick={() => setFolderOpen((value) => !value)}
      />
      <Row left="COMPOSE" right="▸" onClick={() => session.openJobCompose()} />
      {jobs.map((item) => (
        <Row
          key={item.id}
          left={`#${item.number} ${item.title}`}
          right={item.status.toUpperCase()}
          sub={`${item.from} · ${item.bucket}`}
          unread={item.status === 'new'}
          selected={open?.id === item.id}
          onClick={() => void session.readJob(item.id)}
        />
      ))}
      {jobs.length === 0 ? <div className="blurb">No jobs in {folder}.</div> : null}
    </div>
  );
}

export function JobsFrames({ staff = false }: { staff?: boolean }) {
  const session = useSession();
  const [note, setNote] = useState('');
  const [bucketOpen, setBucketOpen] = useState(false);
  const open = session.openJob;
  const draft = session.jobCompose;

  useEffect(() => {
    setNote('');
  }, [open?.id]);

  useEffect(() => {
    if (!draft) setBucketOpen(false);
  }, [draft]);

  return (
    <>
      {session.error ? <div className="err">{session.error}</div> : null}
      <PopupFrame title={open ? `#${open.number} ${open.title}` : 'JOB'} open={Boolean(open)} onClose={session.closeJob}>
        {open ? (
          <>
            <div className="popup-read">
            <div className="popup-meta">
              {`FROM · ${open.from} · ${open.bucket} · ${open.status.toUpperCase()}`}
              {open.assigned ? ` · ${open.assigned}` : ''}
            </div>
            <pre className="popup-body">{open.body || '—'}</pre>
            {visibleJobComments(open.comments, staff).map((entry) => (
              <div key={entry.id}>
                <div className="popup-meta">
                  {entry.staffOnly
                    ? `${entry.author} · STAFF ONLY`
                    : `${entry.author}${entry.action ? ` · ${entry.action}` : ''}`}
                </div>
                <pre className="popup-body">{entry.text}</pre>
              </div>
            ))}
            </div>
            <label className="field">
              <span>NOTE</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </label>
            <Row
              left="REPLY"
              right="▸"
              onClick={() => {
                void session.commentJob(open.id, note, false).then((ok) => {
                  if (ok) setNote('');
                });
              }}
            />
            {staff ? (
              <Row
                left="OPS NOTE"
                onClick={() => {
                  void session.commentJob(open.id, note, true).then((ok) => {
                    if (ok) setNote('');
                  });
                }}
              />
            ) : null}
            {staff && jobIsOpen(open) ? (
              <>
                <Row left="APPROVE" right="▸" onClick={() => void session.approveJob(open.id, note)} />
                <Row
                  left="DENY"
                  danger
                  onClick={() => {
                    if (!commentReady(note)) return;
                    void session.denyJob(open.id, note);
                  }}
                />
              </>
            ) : null}
          </>
        ) : null}
      </PopupFrame>
      <PopupFrame title="COMPOSE" open={Boolean(draft)} onClose={session.closeJobCompose}>
        {draft ? (
          <>
            <label className="field">
              <span>TITLE</span>
              <input
                value={draft.title}
                onChange={(e) => session.setJobCompose({ ...draft, title: e.target.value })}
                autoComplete="off"
              />
            </label>
            {bucketOpen ? (
              <div className="modes">
                {JOB_BUCKETS.map((id) => (
                  <Row
                    key={id}
                    left={id}
                    selected={id === jobBucketOf(draft.bucket)}
                    onClick={() => {
                      setBucketOpen(false);
                      session.setJobCompose({ ...draft, bucket: id });
                    }}
                  />
                ))}
              </div>
            ) : null}
            <LookHead
              label={`${jobBucketOf(draft.bucket)} ${bucketOpen ? '▴' : '▾'}`}
              onClick={() => setBucketOpen((value) => !value)}
            />
            <label className="field">
              <span>BODY</span>
              <textarea
                value={draft.body}
                onChange={(e) => session.setJobCompose({ ...draft, body: e.target.value })}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </label>
            <Slab onClick={() => void session.sendJobRequest()} disabled={!requestReady(draft)}>
              FILE ▸
            </Slab>
          </>
        ) : null}
      </PopupFrame>
    </>
  );
}
