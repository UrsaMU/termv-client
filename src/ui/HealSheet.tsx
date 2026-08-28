import { healActs, type HealAct } from '../protocol/heal';
import { useSession } from '../state/session';
import { PopupFrame, Row } from './chrome';

export function HealSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const session = useSession();
  const sheet = session.sheet;
  const acts = sheet ? healActs(sheet, session.gear.items) : [];
  const fight = session.fight && /^(heal|lazarus|rest|clinic|stabilize)$/i.test(session.fight.verb)
    ? session.fight
    : null;

  return (
    <PopupFrame className="pack-sheet" title="PATCH" open={open} onClose={onClose}>
      {sheet ? (
        <>
          <Row
            left="RES"
            right={`${sheet.resilience}/${sheet.resilienceMax}`}
            danger={sheet.resilienceMax > 0 && sheet.resilience / sheet.resilienceMax <= 0.3}
          />
          {sheet.critical ? (
            <Row
              left={`CRITICAL · ${sheet.critical.location.toUpperCase()}`}
              sub={sheet.critical.effect}
              danger
            />
          ) : null}
          {fight?.note ? <div className="blurb">{fight.note.toUpperCase()}</div> : null}
          {acts.map((act) => (
            <Row
              key={act.id}
              left={act.label}
              right={act.ready ? '▸' : act.why.toUpperCase()}
              sub={act.hint}
              onClick={() => {
                if (!act.ready) return;
                session.healSelf(act.id as HealAct);
              }}
            />
          ))}
        </>
      ) : (
        <div className="blurb">NO SHEET.</div>
      )}
    </PopupFrame>
  );
}
