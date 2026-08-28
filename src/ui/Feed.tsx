import type { AttackAct } from '../protocol/combat';
import type { FeedEntry } from '../protocol/feed';
import type { PingPayload } from '../protocol/frames';
import type { EntityRow, LookList } from '../protocol/look';
import { Art, LookCard, Row } from './chrome';
import { RollTape } from './RollTape';

export function Feed({
  entries,
  selfName,
  onSuggest,
  onPick,
  onAct,
}: {
  entries: FeedEntry[];
  selfName?: string;
  onSuggest: (cmd: string) => void;
  onPick?: (item: EntityRow, list: LookList) => boolean | void;
  onAct?: (act: AttackAct) => void;
}) {
  const lastRoll = [...entries].reverse().find((entry) => entry.kind === 'roll')?.id;
  return (
    <>
      {entries.map((entry) => {
        if (entry.kind === 'roll') {
          return entry.roll ? (
            <RollTape key={entry.id} roll={entry.roll} live={entry.id === lastRoll} />
          ) : (
            <div key={entry.id} className="roll-tape">
              <div className="sum">{entry.body}</div>
            </div>
          );
        }
        if (entry.kind === 'gm' || entry.kind === 'pending-gm') {
          return (
            <div key={entry.id} className={entry.kind === 'pending-gm' ? 'gm pending' : 'gm'}>
              <div className="tag">{entry.kind === 'pending-gm' ? '>> GM · WORKING' : '>> GM'}</div>
              <div className="body">{entry.body}</div>
              {entry.kind === 'gm' && entry.suggests?.length ? (
                <>
                  <div className="section">SUGGESTS</div>
                  {entry.suggests.map((item) => (
                    <Row
                      key={item.cmd}
                      left={item.label}
                      right={item.cost}
                      onClick={() => onSuggest(item.cmd)}
                    />
                  ))}
                </>
              ) : null}
            </div>
          );
        }
        if (entry.kind === 'ping' && entry.ping) {
          return <PingCard key={entry.id} card={entry.ping} />;
        }
        if (entry.kind === 'examine') {
          const look = entry.look ?? {
            name: entry.speaker ?? 'LOOK',
            description: entry.body,
            mediaUrl: entry.mediaUrl,
            lists: [],
          };
          return (
            <LookCard key={entry.id} look={look} acts={entry.acts} onCmd={onSuggest} onPick={onPick} onAct={onAct} />
          );
        }
        if (entry.kind === 'system') {
          return (
            <div key={entry.id} className="chat sys">
              {entry.body}
            </div>
          );
        }
        const mine = Boolean(
          selfName && entry.speaker && entry.speaker.toUpperCase() === selfName.toUpperCase(),
        );
        return (
          <div key={entry.id} className={mine ? 'chat mine' : 'chat'}>
            {entry.speaker ? <div className="chat-who">{entry.speaker}</div> : null}
            <div className="chat-body">{entry.body}</div>
          </div>
        );
      })}
    </>
  );
}

function PingCard({ card }: { card: PingPayload }) {
  const live = card.connected ? 'LIVE' : 'OFFLINE';
  return (
    <div className="look-card" data-look="ping">
      <div className="slash-head">
        <span>{'>> /PING'}</span>
        <span className="n">{live}</span>
      </div>
      <Art src={card.image} kind="room" />
      <Row
        left={card.name}
        right={card.staff ? 'STAFF' : card.idle}
        sub={live}
      />
      {card.fields.map((field) => (
        <Row key={field.key} left={field.label.toUpperCase()} right={field.value} />
      ))}
    </div>
  );
}
