import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { overlayHostiles } from '../protocol/combat';
import { NPC_CATALOG } from '../protocol/npcs';
import { useSession } from '../state/session';
import { PlayTabs, Row, ScrollPane, Segments, StatusBar } from '../ui/chrome';
import { JobsFrames, JobsList } from './JobsPane';

export function Staff() {
  const nav = useNavigate();
  const session = useSession();
  const [tab, setTab] = useState<'jobs' | 'grant' | 'npcs' | 'art'>('jobs');
  const here = overlayHostiles(session.room, session.combatTarget);
  const pending = session.jobPending;

  useEffect(() => {
    void session.setJobFolder('cgen');
  }, [session.setJobFolder]);

  if (!session.staff) {
    return (
      <div className="shell">
        <StatusBar left="STAFF" mid="LOCKED" right="—" />
        <div className="blurb">No staff flag on this account.</div>
        <PlayTabs />
      </div>
    );
  }

  return (
    <div className="shell">
      <StatusBar
        left="STAFF"
        mid={tab.toUpperCase()}
        right={pending ? `CGEN ${pending}` : `${session.jobs.length}`}
      />
      <Segments
        value={tab}
        items={[
          { id: 'jobs', label: pending ? `JOBS ${pending}` : 'JOBS' },
          { id: 'grant', label: 'GRANT' },
          { id: 'npcs', label: here.length ? `NPCS ${here.length}` : 'NPCS' },
          { id: 'art', label: 'ROOM ART' },
        ]}
        onChange={(id) => setTab(id as typeof tab)}
      />
      <ScrollPane>
        {tab === 'jobs' ? <JobsList /> : null}
        {tab === 'grant' ? (
          <>
            <div className="section">QUICK GRANT</div>
            <Segments
              items={[
                { id: 'cash', label: 'CASH' },
                { id: 'gear', label: 'GEAR' },
                { id: 'ap', label: 'AP' },
                { id: 'adv', label: 'ADVANCE' },
              ]}
              onChange={(id) => session.send(`+grant/${id}`)}
            />
          </>
        ) : null}
        {tab === 'npcs' ? (
          <>
            <div className="section">HERE</div>
            {here.length ? (
              here.map((row) => (
                <Row
                  key={row.id || row.slug}
                  left={row.name}
                  right={`${row.ds}/${row.dsMax || row.ds}`}
                  sub={row.note}
                  danger={!row.dead}
                  onClick={() => {
                    session.lookHostile(row);
                    nav('/play');
                  }}
                />
              ))
            ) : (
              <div className="blurb">NONE HERE · SPAWN FROM THE CATALOG.</div>
            )}
            {here.length ? (
              <Row left="CLEAR HERE" right="▸" danger onClick={() => session.clearNpc()} />
            ) : null}
            <div className="section">CATALOG</div>
            {NPC_CATALOG.map((row) => (
              <Row
                key={row.slug}
                left={row.name}
                right={`DS${row.ds} ▸`}
                sub={row.shortDesc || row.loadout}
                onClick={() => session.spawnNpc(row.slug)}
              />
            ))}
          </>
        ) : null}
        {tab === 'art' ? (
          <Row left="GIG ROOMS" right="PUT" onClick={() => session.send('+staff/gigart')} />
        ) : null}
      </ScrollPane>
      {tab === 'jobs' ? <JobsFrames staff /> : null}
      <PlayTabs staff />
    </div>
  );
}
