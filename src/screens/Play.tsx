import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { overlayHostiles } from '../protocol/combat';
import { clockStamp, formatHeat } from '../protocol/format';
import { gigBarCopy, gigBeat } from '../protocol/gig-loop';
import { useSession } from '../state/session';
import { PlayTabs, ScrollPane, StatusBar, StreetInput } from '../ui/chrome';
import { Feed } from '../ui/Feed';

export function Play() {
  const session = useSession();
  const [now, setNow] = useState(clockStamp());

  useEffect(() => {
    const id = window.setInterval(() => setNow(clockStamp()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const gig = session.gig;
  const beat = gigBeat(gig);
  const bar = gig ? gigBarCopy(gig) : null;
  const hostiles = overlayHostiles(session.room, session.combatTarget);

  if (beat === 'done') {
    return <Navigate to="/gig/done" replace />;
  }

  return (
    <div className="shell">
      <StatusBar
        invert={Boolean(gig)}
        left={gig ? '◈ GIG' : session.district}
        mid={session.alias || now}
        right={gig ? `${gig.tier.toUpperCase()} · ${gig.node}/${gig.nodesMax}` : formatHeat(session.heat)}
      />
      <div className="street-stack">
      {gig && bar ? (
        <div className="gig-bar">
          <div className="t">{bar.title}</div>
          <div className="s">{bar.sub}</div>
          <div className="progress">
            {Array.from({ length: gig.nodesMax }, (_, i) => (
              <i key={i} className={i < gig.node ? 'on' : undefined} />
            ))}
          </div>
        </div>
      ) : null}
      <ScrollPane tail pinKey={session.feed.at(-1)?.id}>
        <Feed
          entries={session.feed}
          selfName={session.alias}
          onSuggest={(cmd) => session.send(cmd)}
          onPick={(item, list) => {
            if (list.label === 'HOSTILES') {
              const hit = hostiles.find((row) => row.id === item.id || row.name === item.label);
              if (!hit) return false;
              session.lookHostile(hit);
              return true;
            }
            return false;
          }}
          onAct={(act) => {
            session.selectHostile(act.target);
            if (act.mode === 'reload') {
              session.setCombatMode('reload');
              return;
            }
            session.setCombatMode(act.mode);
            session.attackHostile();
          }}
        />
      </ScrollPane>
      </div>
      {gig && beat === 'run' ? (
        <p className="why">Clear the room. Take the exit when the path opens.</p>
      ) : null}
      <StreetInput />
      <PlayTabs streetLabel={gig ? 'SCENE' : 'STREET'} staff={session.staff} />
    </div>
  );
}
