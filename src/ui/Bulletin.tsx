import { useNavigate } from 'react-router-dom';
import { useSession } from '../state/session';
import { NoticeStack, PopupFrame } from './chrome';

export function Bulletin() {
  const nav = useNavigate();
  const linked = useSession((s) => s.linked);
  const motd = useSession((s) => s.motd);
  const motdOpen = useSession((s) => s.motdOpen);
  const notices = useSession((s) => s.notices);
  const dismissMotd = useSession((s) => s.dismissMotd);
  const dismissNotice = useSession((s) => s.dismissNotice);

  if (!linked) return null;

  return (
    <>
      <PopupFrame title={motd?.title ?? 'MOTD'} open={Boolean(motdOpen && motd)} onClose={dismissMotd}>
        <pre className="popup-body">{motd?.body}</pre>
      </PopupFrame>
      <NoticeStack
        items={notices}
        onDismiss={dismissNotice}
        onOpen={(item) => {
          if (item.kind === 'mail') useSession.getState().setCommsTab('mail');
          if (item.kind === 'jobs') useSession.getState().setCommsTab('jobs');
          if (item.to) nav(item.to);
        }}
      />
    </>
  );
}
