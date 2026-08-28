import { useEffect } from 'react';
import { wikiBodyText } from '../protocol/wiki';
import { useSession } from '../state/session';
import { PlayTabs, Row, ScrollPane, StatusBar } from '../ui/chrome';

export function Wiki() {
  const session = useSession();
  const pages = session.wikiPages;
  const open = session.wikiPage;

  useEffect(() => {
    void session.loadWiki();
  }, [session.loadWiki]);

  return (
    <div className="shell">
      <StatusBar
        left="WIKI"
        mid={open ? open.title.toUpperCase() : 'INDEX'}
        right={`${pages.length}`}
      />
      <ScrollPane>
        {open ? (
          <>
            <Row left="INDEX" right="◂" onClick={() => session.closeWiki()} />
            <div className="nameblock">
              <h2>{open.title}</h2>
              <p>{open.path}</p>
            </div>
            <pre className="popup-body">{wikiBodyText(open.body) || '(empty page)'}</pre>
          </>
        ) : (
          <>
            {pages.map((page) => (
              <Row
                key={page.path}
                left={page.title.toUpperCase()}
                right={page.tags[0]?.toUpperCase() ?? '▸'}
                sub={page.path}
                onClick={() => void session.openWiki(page.path)}
              />
            ))}
            {pages.length === 0 ? (
              <div className="blurb">No wiki pages on this grid.</div>
            ) : null}
          </>
        )}
      </ScrollPane>
      <PlayTabs staff={session.staff} />
    </div>
  );
}
