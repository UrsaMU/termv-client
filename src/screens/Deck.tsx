import { useEffect, useState } from 'react';
import { hackCmd } from '../protocol/cmds';
import { hackLocksFromRoom } from '../protocol/hack';
import { useSession } from '../state/session';
import { Art, PlayTabs, Row, ScrollPane, Slab, StatusBar } from '../ui/chrome';

export function Deck() {
  const session = useSession();
  const net = session.net;
  const [dice, setDice] = useState<number[]>([]);
  const [flicker, setFlicker] = useState(false);
  const [picked, setPicked] = useState('');
  const locks = hackLocksFromRoom(session.room);
  const target = locks.find((row) => row.slug === picked || row.name === picked) ?? locks[0] ?? null;

  useEffect(() => {
    if (session.linked) session.send('+hack');
  }, [session.linked, session.send]);

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
      <StatusBar left="DECK" mid={net.hull} right={`HEAT ${session.heat}`} />
      <ScrollPane>
        <Art />
        <Row left={net.hull} right={`FIREWALL ${net.firewall} · AI COG ${net.aiCog}`} />
        <div className="section">RAM · pool = COG {session.sheet?.stats.cognition ?? 3} + RAM</div>
        <div className="ram">
          {Array.from({ length: net.ramMax }, (_, i) => (
            <i key={i} className={i < net.ram ? 'on' : undefined} />
          ))}
        </div>
        <div className="section">
          SOFTWARE · {net.slots} / {net.slotsMax} SLOTS
        </div>
        <Row left="LOAD ＋" right="›" onClick={() => session.send('+hack/load')} />
        {net.software.map((prog) => (
          <Row key={prog.name} left={prog.name} right={prog.effect} selected={!prog.obsolete} />
        ))}
        <div className="section">EXPLOIT BANK · {net.exploits.length}</div>
        {net.exploits.map((ex) => (
          <Row
            key={ex.name}
            left={ex.name}
            right="USE"
            sub={ex.note}
            onClick={() => session.send(`+hack/exploit ${ex.name}`)}
          />
        ))}
        {net.penalties.map((pen) => (
          <Row key={pen.name} left={pen.name} sub={pen.note} danger />
        ))}
        <div className="section">HACKABLE LOCKS HERE</div>
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
      <PlayTabs staff={session.staff} />
    </div>
  );
}
