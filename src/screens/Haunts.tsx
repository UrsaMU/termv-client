import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { HauntPlace } from '../protocol/frames';
import { useSession } from '../state/session';
import { Art, PlayTabs, ScrollPane, Slab, StatusBar } from '../ui/chrome';

function isOpen(h: HauntPlace): boolean {
  return Boolean(h.open ?? h.roomId);
}

export function Haunts() {
  const session = useSession();
  const nav = useNavigate();
  useEffect(() => {
    if (session.linked) session.send('+haunt');
  }, [session.linked, session.send]);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState('');
  const source = session.haunts;
  const rows = useMemo(
    () =>
      source.filter(
        (h) =>
          !query ||
          h.name.toLowerCase().includes(query.toLowerCase()) ||
          h.kind.toLowerCase().includes(query.toLowerCase()) ||
          h.blurb.toLowerCase().includes(query.toLowerCase()) ||
          h.slug.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, source],
  );
  const current = rows.find((h) => h.slug === picked) ?? rows[0];
  const canSlide = current ? isOpen(current) : false;
  const openCount = rows.filter(isOpen).length;

  return (
    <div className="shell">
      <StatusBar
        left="HAUNTS"
        mid={`${openCount}/${rows.length} OPEN`}
        right={current?.kind.toUpperCase() || '—'}
      />
      <label className="field">
        <span>SEARCH</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="dive · booth · clinic…"
        />
      </label>
      <ScrollPane>
        {rows.length === 0 ? (
          <p className="muted" style={{ padding: '0.75rem' }}>
            No haunts on the board yet. Staff cuts floors in admin · Haunts.
          </p>
        ) : (
          rows.map((h, i) => {
            const open = isOpen(h);
            return (
              <button
                key={h.slug}
                type="button"
                onClick={() => setPicked(h.slug)}
                style={{ width: '100%', padding: 0 }}
              >
                <Art kind="district" src={h.image}>
                  <div className={current?.slug === h.slug ? 'caption you' : 'caption'}>
                    <span>
                      {String(i + 1).padStart(2, '0')} · {h.name.toUpperCase()}
                      <span className="sub">
                        {h.kind.toUpperCase()} · {open ? 'OPEN · ' : 'DARK · '}
                        {h.blurb}
                      </span>
                    </span>
                    <span>{open ? 'LIVE' : 'LOCK'}</span>
                  </div>
                </Art>
              </button>
            );
          })
        )}
      </ScrollPane>
      {canSlide ? (
        <Slab
          onClick={() => {
            session.send(`+haunt go ${current?.slug ?? ''}`);
            nav('/play');
          }}
        >
          SLIDE IN · {current?.name.toUpperCase() ?? '—'} ▸
        </Slab>
      ) : (
        <Slab disabled>
          {rows.length ? 'DARK FLOOR · NO LINK' : 'NO HAUNTS'}
        </Slab>
      )}
      <PlayTabs staff={session.staff} />
    </div>
  );
}
