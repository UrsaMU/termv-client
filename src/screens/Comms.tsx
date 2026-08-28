import { useEffect, useState } from 'react';
import { postsForChannel, type ChannelPost } from '../protocol/channel';
import { boardPostReady } from '../protocol/boards';
import { composeReady, type MailFolder } from '../protocol/mail';
import { useSession } from '../state/session';
import { LookHead, PlayTabs, PopupFrame, Row, ScrollPane, Segments, Slab, SlideVeil, StatusBar, StreetInput } from '../ui/chrome';
import { JobsFrames, JobsList } from './JobsPane';

const FOLDERS: MailFolder[] = ['inbox', 'sent', 'trash'];

export function Comms() {
  const session = useSession();
  const [folderOpen, setFolderOpen] = useState(false);
  const tab = session.commsTab;
  const channels = session.channelMeta;
  const mail = session.mail;
  const open = session.openMail;
  const draft = session.mailCompose;
  const folder = session.mailFolder;
  const unread = session.mailUnread;
  const pending = session.jobPending;
  const chan = session.activeChannel;
  const board = session.openBoard;

  useEffect(() => {
    if (tab === 'boards') void session.loadBoards();
  }, [tab, session.loadBoards]);

  if (chan) return <ChannelDesk />;
  if (board) return <BoardDesk />;

  const mid =
    tab === 'jobs'
      ? pending
        ? `CGEN ${pending}`
        : `${session.jobs.length}`
      : tab === 'mail'
        ? unread
          ? `MAIL ${unread}`
          : 'MAIL'
        : tab === 'boards'
          ? `${session.boards.length} BRD`
          : `${channels.length} CHAN`;

  return (
    <div className="shell">
      <StatusBar left="COMMS" mid={tab.toUpperCase()} right={mid} />
      <Segments
        value={tab}
        items={[
          { id: 'channels', label: 'CHANNELS' },
          { id: 'mail', label: unread ? `MAIL ${unread}` : 'MAIL' },
          { id: 'boards', label: 'BOARDS' },
          { id: 'jobs', label: pending ? `JOBS ${pending}` : 'JOBS' },
        ]}
        onChange={(id) => {
          setFolderOpen(false);
          session.setCommsTab(id as typeof tab);
        }}
      />
      <ScrollPane>
        {tab === 'channels' ? (
          <>
            <LookHead label="CHANNELS" count={channels.length} />
            {channels.map((item) => (
              <Row
                key={item.id || item.name}
                left={`#${item.name.toUpperCase()}`}
                right={item.unread ? String(item.unread).padStart(2, '0') : item.alias.toUpperCase()}
                sub={item.preview || 'NO BUFFER'}
                unread={item.unread > 0}
                onClick={() => void session.openChannel(item.id || item.name)}
              />
            ))}
            {channels.length === 0 ? <div className="blurb">No channels on this grid.</div> : null}
          </>
        ) : null}
        {tab === 'mail' ? (
          <>
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
                        void session.setMailFolder(id);
                      }}
                    />
                  ))}
                </div>
              ) : null}
              <LookHead
                label={`${folder.toUpperCase()} ${folderOpen ? '▴' : '▾'}`}
                count={folder === 'inbox' ? unread : mail.length}
                onClick={() => setFolderOpen((value) => !value)}
              />
            </div>
            <Row left="COMPOSE" right="▸" onClick={() => session.openCompose()} />
            {mail.map((item) => (
              <Row
                key={item.id}
                left={item.starred ? `★ ${item.subject}` : item.subject}
                right={item.state.toUpperCase()}
                sub={folder === 'sent' ? `TO · ${item.to.join(', ') || '—'}` : item.from}
                unread={item.state === 'unread'}
                selected={open?.id === item.id}
                onClick={() => void session.readMail(item.id)}
              />
            ))}
            {mail.length === 0 ? <div className="blurb">No messages in {folder}.</div> : null}
          </>
        ) : null}
        {tab === 'boards' ? (
          <>
            <LookHead label="BOARDS" count={session.boards.length} />
            {session.boards.map((item) => (
              <Row
                key={item.id}
                left={item.title.toUpperCase()}
                right={item.unread ? String(item.unread).padStart(2, '0') : String(item.posts)}
                sub={item.category}
                unread={item.unread > 0}
                onClick={() => void session.selectBoard(item.id)}
              />
            ))}
            {session.boards.length === 0 ? <div className="blurb">No boards on this grid.</div> : null}
          </>
        ) : null}
        {tab === 'jobs' ? <JobsList /> : null}
      </ScrollPane>
      {session.error && tab !== 'jobs' ? <div className="err">{session.error}</div> : null}
      {tab === 'jobs' ? <JobsFrames staff={session.staff} /> : null}
      <PopupFrame title={open?.subject ?? 'MAIL'} open={Boolean(open)} onClose={session.closeMail}>
        {open ? (
          <>
            <div className="popup-meta">
              {folder === 'sent' ? `TO · ${open.to.join(', ') || '—'}` : `FROM · ${open.from}`}
              {open.starred ? ' · STARRED' : ''}
            </div>
            <pre className="popup-body">{open.body || '—'}</pre>
            {folder === 'trash' ? (
              <>
                <Row left="RESTORE" right="▸" onClick={() => void session.restoreMail(open.id)} />
                <Row left="PURGE" danger onClick={() => void session.trashMail(open.id)} />
              </>
            ) : folder === 'sent' ? (
              <Row left="TRASH" danger onClick={() => void session.trashMail(open.id)} />
            ) : (
              <>
                <Row left="REPLY" right="▸" onClick={() => session.replyMail()} />
                <Row
                  left={open.starred ? 'UNSTAR' : 'STAR'}
                  onClick={() => void session.starMail(open.id)}
                />
                <Row left="TRASH" danger onClick={() => void session.trashMail(open.id)} />
              </>
            )}
          </>
        ) : null}
      </PopupFrame>
      <PopupFrame title="COMPOSE" open={Boolean(draft)} onClose={session.closeCompose}>
        {draft ? (
          <>
            <label className="field">
              <span>TO</span>
              <input
                value={draft.to}
                onChange={(e) => session.setCompose({ ...draft, to: e.target.value })}
                autoComplete="off"
                placeholder="handle"
              />
            </label>
            <label className="field">
              <span>SUBJECT</span>
              <input
                value={draft.subject}
                onChange={(e) => session.setCompose({ ...draft, subject: e.target.value })}
                autoComplete="off"
              />
            </label>
            <label className="field">
              <span>BODY</span>
              <textarea
                value={draft.body}
                onChange={(e) => session.setCompose({ ...draft, body: e.target.value })}
              />
            </label>
            <Slab onClick={() => void session.sendMail()} disabled={!composeReady(draft)}>
              SEND ▸
            </Slab>
          </>
        ) : null}
      </PopupFrame>
      <PlayTabs staff={session.staff} />
    </div>
  );
}

function ChannelDesk() {
  const session = useSession();
  const chan = session.activeChannel!;
  const posts = postsForChannel(
    Object.values(session.comms).flat(),
    chan.name,
  );

  return (
    <div className="shell">
      <StatusBar left="COMMS" mid="CHAN" right={chan.name.toUpperCase()} />
      <div className="street-stack">
      <LookHead label={`CHAN · ${chan.header || chan.name.toUpperCase()}`} count={posts.length} />
      <ScrollPane tail pinKey={posts.at(-1)?.id} className="chat-log chan-log">
        {posts.length ? (
          posts.map((post) => <ChannelLine key={post.id} post={post} selfName={session.alias} />)
        ) : (
          <div className="console-empty">NO BUFFER · SAY SOMETHING ON {chan.name.toUpperCase()}</div>
        )}
      </ScrollPane>
      </div>
      {session.error ? <div className="err">{session.error}</div> : null}
      <div className="chan-input">
        <StreetInput
          placeholder={`#${chan.alias.toUpperCase()}`}
          sendPlain={(text) => {
            const mode = session.inputMode === 'pose' || session.inputMode === 'emote' ? 'pose' : 'say';
            session.sendChannel(text, mode);
          }}
        />
      </div>
      <PlayTabs
        staff={session.staff}
        back={{ label: 'CHANNELS', onClick: () => session.closeChannel() }}
      />
    </div>
  );
}

function ChannelLine({ post, selfName }: { post: ChannelPost; selfName?: string }) {
  const mine = Boolean(selfName && post.from && post.from.toUpperCase() === selfName.toUpperCase());
  const body = post.mode === 'pose' || post.mode === 'semi' ? post.body : post.body;
  return (
    <div className={mine ? 'chat chan mine' : 'chat chan'}>
      <div className="chat-who">{post.from || 'CHAN'}</div>
      <div className="chat-body">{body}</div>
    </div>
  );
}

function BoardDesk() {
  const session = useSession();
  const board = session.openBoard!;
  const post = session.openBoardPost;
  const draft = session.boardCompose;
  const [note, setNote] = useState('');

  return (
    <div className="shell">
      <StatusBar left="COMMS" mid="BOARD" right={board.title.toUpperCase()} />
      <LookHead label={`BOARD · ${board.title.toUpperCase()}`} count={session.boardPosts.length} />
      <ScrollPane>
        <Row left="COMPOSE" right="▸" onClick={() => session.openBoardCompose()} />
        {session.boardPosts.map((item) => (
          <Row
            key={item.id}
            left={`${item.sticky ? '★ ' : ''}${item.num}. ${item.subject}`}
            right={item.from}
            sub={item.replies.length ? `${item.replies.length} REPL` : undefined}
            selected={post?.id === item.id}
            onClick={() => session.readBoardPost(item.id)}
          />
        ))}
        {session.boardPosts.length === 0 ? <div className="blurb">No posts on this board.</div> : null}
      </ScrollPane>
      {session.error ? <div className="err">{session.error}</div> : null}
      <PopupFrame title={post?.subject ?? 'POST'} open={Boolean(post)} onClose={session.closeBoardPost}>
        {post ? (
          <>
            <div className="popup-read">
              <div className="popup-meta">{`FROM · ${post.from} · #${post.num}`}</div>
              <pre className="popup-body">{post.body || '—'}</pre>
              {post.replies.map((entry) => (
                <div key={`${post.id}-${entry.num}`}>
                  <div className="popup-meta">{`${entry.from} · #${entry.num}`}</div>
                  <pre className="popup-body">{entry.body}</pre>
                </div>
              ))}
            </div>
            <label className="field">
              <span>REPLY</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </label>
            <Row
              left="POST REPLY"
              right="▸"
              onClick={() => {
                void session.sendBoardReply(note).then((ok) => {
                  if (ok) setNote('');
                });
              }}
            />
          </>
        ) : null}
      </PopupFrame>
      <PopupFrame title="COMPOSE" open={Boolean(draft)} onClose={session.closeBoardCompose}>
        {draft ? (
          <>
            <label className="field">
              <span>SUBJECT</span>
              <input
                value={draft.subject}
                onChange={(e) => session.setBoardCompose({ ...draft, subject: e.target.value })}
                autoComplete="off"
              />
            </label>
            <label className="field">
              <span>BODY</span>
              <textarea
                value={draft.body}
                onChange={(e) => session.setBoardCompose({ ...draft, body: e.target.value })}
              />
            </label>
            <Slab onClick={() => void session.sendBoardPost()} disabled={!boardPostReady(draft)}>
              POST ▸
            </Slab>
          </>
        ) : null}
      </PopupFrame>
      <PlayTabs
        staff={session.staff}
        back={post || draft ? false : { label: 'BOARDS', onClick: () => session.closeBoard() }}
      />
    </div>
  );
}
