import { Navigate, useNavigate } from 'react-router-dom';
import { gigBarCopy, gigBeat, gigDeskActs } from '../protocol/gig-loop';
import { useSession } from '../state/session';
import { LookHead, PlayTabs, Row, ScrollPane, StatusBar, StreetInput } from '../ui/chrome';

export function Gig() {
  const nav = useNavigate();
  const session = useSession();
  const gig = session.gig;
  const beat = gigBeat(gig);
  const bar = gig ? gigBarCopy(gig) : null;
  const acts = gigDeskActs(beat);

  if (beat === 'done') {
    return <Navigate to="/gig/done" replace />;
  }

  return (
    <div className="shell">
      <StatusBar
        invert={Boolean(gig)}
        left="◈ GIG"
        mid={gig ? gig.tier.toUpperCase() : 'IDLE'}
        right={gig ? `${gig.node}/${gig.nodesMax}` : '—'}
      />
      <ScrollPane>
        <LookHead label="CONTRACT" count={gig ? 1 : 0} />
        {gig && bar ? (
          <>
            <Row left={bar.title} sub={bar.sub} />
            {gig.blurb ? <p className="why">{gig.blurb}</p> : null}
            {gig.targetName ? <Row left="TARGET" right={gig.targetName} /> : null}
            {gig.bossName ? <Row left="PRINCIPAL" right={gig.bossName} sub={`DS ${gig.bossDs}`} /> : null}
            {gig.objective ? <Row left="OBJECTIVE" right={gig.objective.toUpperCase()} /> : null}
          </>
        ) : (
          <p className="why">No contract on the wire. Pull one, then drop in.</p>
        )}
        <LookHead label="ACTS" count={acts.length} />
        {acts.map((act) => (
          <Row
            key={act.send}
            left={act.label}
            right="▸"
            sub={act.sub}
            onClick={() => {
              session.send(act.send);
              if (act.send !== '+gig') session.send('look');
              if (
                act.send === '+gig/enter' ||
                act.send === '+gig/leave' ||
                act.send === '+gig/push'
              ) {
                nav('/play');
              }
              if (act.send === '+gig/abandon') {
                useSession.setState({ gig: null });
                nav('/play');
              }
              if (act.send === '+gig/turnin') nav('/gig/done');
            }}
          />
        ))}
      </ScrollPane>
      <StreetInput />
      <PlayTabs streetLabel={gig ? 'SCENE' : 'STREET'} staff={session.staff} back={{ label: 'STREET', to: '/play' }} />
    </div>
  );
}
