import { useNavigate } from 'react-router-dom';
import { useSession } from '../state/session';
import { PlayTabs, Row, ScrollPane, Segments, Slab, StatusBar } from '../ui/chrome';

export function GigDone() {
  const nav = useNavigate();
  const session = useSession();
  const gig = session.gig;
  const sheet = session.sheet;
  if (!gig || gig.status !== 'complete') {
    return (
      <div className="shell">
        <StatusBar left="GIG" mid="WAIT" right="—" />
        <div className="blurb">No closed scene.</div>
        <PlayTabs staff={session.staff} />
      </div>
    );
  }

  const by = gig.payoutBy || 0;
  const ap = gig.payoutAp || 0;

  function backStreet() {
    useSession.setState({ gig: null });
    session.send('look');
    nav('/play');
  }

  return (
    <div className="shell">
      <StatusBar invert left="◈ PAID" mid={gig.tier.toUpperCase()} right={`${gig.node}/${gig.nodesMax}`} />
      <ScrollPane>
        <Row left="CONTRACT" right={gig.tier.toUpperCase()} sub={gig.title} />
        {gig.targetName ? <Row left="TARGET" right={gig.targetName} /> : null}
        <Row left="PAYOUT" right={`${by} b¥`} sub={ap ? `+${ap} AP banked` : 'no AP'} />
        {sheet ? (
          <Row
            left="SHEET"
            right={`RES ${sheet.resilience} / ${sheet.resilienceMax} · LV${sheet.level}`}
          />
        ) : null}
        <Row
          left="NEXT"
          right="STREET"
          sub={gig.nextHint || 'MARKET · HAUNTS · MAP · pull another run'}
        />
      </ScrollPane>
      <Slab onClick={backStreet}>BACK TO THE STREET ▸</Slab>
      <Segments
        items={[
          { id: 'market', label: 'MARKET' },
          { id: 'haunts', label: 'HAUNTS' },
          { id: 'map', label: 'MAP' },
          { id: 'gig', label: 'NEXT GIG' },
        ]}
        onChange={(id) => {
          useSession.setState({ gig: null });
          if (id === 'market') nav('/market');
          else if (id === 'haunts') nav('/haunts');
          else if (id === 'map') nav('/map');
          else if (id === 'gig') nav('/gig');
          else backStreet();
        }}
      />
      <Segments
        items={[
          { id: 'ap', label: 'SPEND AP' },
          { id: 'patch', label: 'PATCH UP' },
        ]}
        onChange={(id) => {
          if (id === 'ap') session.send('+advance');
          if (id === 'patch') session.send('+rest');
        }}
      />
      <PlayTabs streetLabel="SCENE" staff={session.staff} />
    </div>
  );
}
