import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import districts from '../data/flow-districts.json';
import type { FlowDistrict } from '../protocol/frames';
import { useSession } from '../state/session';
import { Art, PlayTabs, ScrollPane, Slab, StatusBar } from '../ui/chrome';

type District = FlowDistrict;

function isOpen(d: District): boolean {
  return Boolean(d.open ?? d.roomId);
}

function hereDistrict(d: District, districtLabel: string, roomName: string): boolean {
  const label = districtLabel.trim().toLowerCase();
  const room = roomName.trim().toLowerCase();
  const name = d.name.trim().toLowerCase();
  const slug = d.slug.trim().toLowerCase();
  if (label && (label === name || label === slug || label.includes(name))) return true;
  if (room && (room === name || room === slug)) return true;
  return false;
}

export function Map() {
  const session = useSession();
  const nav = useNavigate();
  useEffect(() => {
    if (session.linked) session.send('+flow');
  }, [session.linked, session.send]);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState('harbor-keys');
  const source = session.flow.length ? session.flow : (districts as District[]);
  const rows = useMemo(
    () =>
      source.filter(
        (d) =>
          !query ||
          d.name.toLowerCase().includes(query.toLowerCase()) ||
          d.blurb.toLowerCase().includes(query.toLowerCase()) ||
          d.slug.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, source],
  );
  const current = rows.find((d) => d.slug === picked) ?? rows[0];
  const roomName = session.room?.name ?? '';
  const canJack = current ? isOpen(current) : false;
  const openCount = rows.filter(isOpen).length;

  return (
    <div className="shell">
      <StatusBar
        left="FLOW"
        mid={`${openCount}/${rows.length} OPEN`}
        right={current?.grid || '—'}
      />
      <label className="field">
        <span>SEARCH</span>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="district" />
      </label>
      <ScrollPane>
        {rows.map((d, i) => {
          const you = hereDistrict(d, session.district, roomName);
          const open = isOpen(d);
          return (
            <button key={d.slug} type="button" onClick={() => setPicked(d.slug)} style={{ width: '100%', padding: 0 }}>
              <Art kind="district" src={d.image}>
                <div className={you ? 'caption you' : 'caption'}>
                  <span>
                    {String(i + 1).padStart(2, '0')} · {d.name.toUpperCase()}
                    <span className="sub">
                      {open ? 'OPEN · ' : 'DARK · '}
                      {d.blurb}
                    </span>
                  </span>
                  <span>{you ? `${d.grid || '—'} · YOU` : open ? d.grid || 'LIVE' : 'LOCK'}</span>
                </div>
              </Art>
            </button>
          );
        })}
      </ScrollPane>
      {canJack ? (
        <Slab
          onClick={() => {
            session.send(`+flow go ${current?.slug ?? ''}`);
            nav('/play');
          }}
        >
          JACK IN · {current?.name.toUpperCase() ?? '—'} ▸
        </Slab>
      ) : (
        <Slab disabled>
          DARK SECTOR · NO HARDLINE
        </Slab>
      )}
      <PlayTabs staff={session.staff} />
    </div>
  );
}
