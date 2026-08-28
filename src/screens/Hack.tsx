import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hackCmd, jackOutCmd } from '../protocol/cmds';
import { hackLocksFromRoom } from '../protocol/hack';
import { useSession } from '../state/session';
import { PlayTabs, Row, ScrollPane, Segments, Slab, StatusBar } from '../ui/chrome';

export function Hack() {
  const nav = useNavigate();
  const session = useSession();
  const net = session.net;
  const [dice, setDice] = useState<number[]>([]);
  const [flicker, setFlicker] = useState(false);
  const [picked, setPicked] = useState('');
  const locks = hackLocksFromRoom(session.room);
  const target = locks.find((row) => row.slug === picked || row.name === picked) ?? locks[0] ?? null;

  useEffect(() => {
    if (!flicker) return;
    const id = window.setTimeout(() => {
      setDice(session.roll?.dice ?? []);
      setFlicker(false);
    }, 480);
    return () => window.clearTimeout(id);
  }, [flicker, session.roll]);

  const total = dice.reduce((sum, n) => sum + n, 0);

  return (
    <div className="shell">
      <StatusBar left={net.hull} mid={`FW ${net.firewall}`} right={`HEAT ${session.heat}`} />
      <div className="target">
        <span>{target ? target.name.toUpperCase() : 'NO LOCK'}</span>
        <span className="ds">{target ? `DS ${target.ds}` : '—'}</span>
      </div>
      <div className="section">HACKABLE LOCKS HERE</div>
      <ScrollPane>
        {locks.length ? (
          locks.map((row) => (
            <Row
              key={row.slug}
              left={row.name}
              right={`DS ${row.ds}`}
              sub={row.locked ? 'LOCKED' : 'OPEN'}
              selected={target?.slug === row.slug}
              danger={row.locked}
              onClick={() => setPicked(row.slug)}
            />
          ))
        ) : (
          <div className="blurb">NO HACKABLE LOCKS IN THIS ROOM.</div>
        )}
        <div className="section">
          RAM {net.ram} / {net.ramMax}
        </div>
        <div className="ram">
          {Array.from({ length: net.ramMax }, (_, i) => (
            <i key={i} className={i < net.ram ? 'on' : undefined} />
          ))}
        </div>
        {net.software.map((prog) => (
          <Row key={prog.name} left={prog.name} right={prog.effect} selected={!prog.obsolete} />
        ))}
      </ScrollPane>
      <Slab
        onClick={() => {
          if (!target) return;
          setFlicker(true);
          session.send(hackCmd(target.slug));
        }}
        disabled={!target}
      >
        {target ? `HACK · ${target.name.toUpperCase()} · DS ${target.ds} ▸` : 'HACK · NO LOCK'}
      </Slab>
      {dice.length || flicker ? (
        <div className={flicker ? 'dice flicker' : 'dice'}>
          {(dice.length ? dice : [0, 0, 0, 0]).map((die, i) => (
            <i key={i} className={die === 1 ? 'one' : undefined}>
              {flicker ? '?' : die}
            </i>
          ))}
          <i>{flicker ? '' : total}</i>
        </div>
      ) : null}
      {dice.includes(6) ? <Row left="6 → EXPLOIT BANKED · BACK DOOR" selected /> : null}
      {dice.includes(1) ? <Row left="1 → RESPONSE · MALWARE I" danger /> : null}
      <Segments
        items={[
          { id: 'ex', label: `EXPLOITS ${net.exploits.length}` },
          { id: 'console', label: 'CONSOLE' },
          { id: 'jack', label: 'JACK OUT' },
        ]}
        onChange={(id) => {
          if (id === 'console') nav('/deck');
          if (id === 'jack') {
            session.send(jackOutCmd());
            nav('/play');
          }
        }}
      />
      <PlayTabs staff={session.staff} />
    </div>
  );
}
