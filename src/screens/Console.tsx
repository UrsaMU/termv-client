import { consoleTone } from '../protocol/console';
import { useSession } from '../state/session';
import { PlayTabs, ScrollPane, StatusBar, StreetInput } from '../ui/chrome';

export function Console() {
  const session = useSession();

  return (
    <div className="shell">
      <StatusBar
        left="CONSOLE"
        mid={`${String(session.consoleLog.length).padStart(2, '0')} LINES`}
        right={session.alias || '—'}
      />
      <div className="slash-head">
        <span>{'>> TTY'}</span>
        <span className="n">MUD</span>
      </div>
      <ScrollPane tail pinKey={session.consoleLog.at(-1)?.id} className="console-log">
        {session.consoleLog.length ? (
          session.consoleLog.map((line) => (
            <div
              key={line.id}
              className={['console-line', consoleTone(line.body)].filter((tone) => tone !== 'plain').join(' ')}
            >
              {line.body}
            </div>
          ))
        ) : (
          <div className="console-empty">NO BUFFER · POSE OR LOOK TO PLAY THE TTY</div>
        )}
      </ScrollPane>
      <StreetInput />
      <PlayTabs staff={session.staff} />
    </div>
  );
}
