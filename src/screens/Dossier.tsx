import { useSession } from '../state/session';
import { PlayTabs, Row, ScrollPane, StatusBar } from '../ui/chrome';

export function Dossier() {
  const session = useSession();
  const card = session.ping;
  const mine = !card?.id || card.name.toUpperCase() === session.alias.toUpperCase();

  if (!card) {
    return (
      <div className="shell">
        <StatusBar left="PING" mid="WAIT" right={session.alias} />
        <div className="blurb">No dossier yet. /ping a handle.</div>
        <PlayTabs staff={session.staff} />
      </div>
    );
  }

  return (
    <div className="shell">
      <StatusBar
        left="PING"
        mid={card.connected ? 'LIVE' : 'OFFLINE'}
        right={card.staff ? 'STAFF' : card.idle}
      />
      <ScrollPane>
        <div className="nameblock">
          <h2>{card.name}</h2>
          <p>{card.connected ? 'ON THE GRID' : 'OFFLINE'} · {card.idle}</p>
        </div>
        {card.fields.length === 0 ? (
          <div className="blurb">
            {mine
              ? 'Empty card. /ping/set pronouns=they/them or &ping-quote me=…'
              : 'No ping fields on this handle.'}
          </div>
        ) : null}
        {card.fields.map((field) => (
          <Row key={field.key} left={field.label.toUpperCase()} right={field.value} />
        ))}
        {mine ? (
          <div className="blurb">
            Set with /ping/set field=value or &ping-field me=value.
          </div>
        ) : null}
      </ScrollPane>
      <PlayTabs staff={session.staff} />
    </div>
  );
}
