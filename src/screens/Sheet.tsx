import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { chargenCmd, loadDraft, STAT_ABBR, STAT_KEYS, statMark } from '../protocol/chargen';
import { useSession } from '../state/session';
import { Art, Dots, Gauge, PlayTabs, Row, ScrollPane, StatusBar } from '../ui/chrome';
import { HealSheet } from '../ui/HealSheet';

export function Sheet() {
  const nav = useNavigate();
  const session = useSession();
  const [patchOpen, setPatchOpen] = useState(false);
  const sheet = session.sheet;
  const liveGear = session.gear.items;
  const gear = liveGear.length
    ? liveGear
    : (sheet?.gear ?? []).map((item) => ({
        ...item,
        kind: '',
        mods: '',
        ammo: null,
        fittings: [],
      }));
  const load = session.gear.load || sheet?.load || 0;
  const loadMax = session.gear.loadMax || sheet?.loadMax || 0;

  useEffect(() => {
    if (!session.linked) return;
    session.send('+sheet');
    session.send('+gear');
    const live = sheet && STAT_KEYS.some((key) => (sheet.stats[key] ?? 0) > 0);
    const draft = loadDraft();
    const local = STAT_KEYS.some((key) => (draft.stats[key] ?? 0) > 0);
    if (!live && local) {
      session.send(chargenCmd(draft, 'stats'));
      session.send('+sheet');
    }
  }, [session.linked, session.send]);

  if (!sheet) {
    return (
      <div className="shell">
        <StatusBar left="SHEET" mid="WAIT" right={session.alias} />
        <div className="blurb">Waiting for sheet…</div>
        <PlayTabs staff={session.staff} />
      </div>
    );
  }

  const role = (sheet.background || sheet.role || 'GOON').toUpperCase();
  const draft = loadDraft();
  const stats = STAT_KEYS.some((key) => (sheet.stats[key] ?? 0) > 0)
    ? sheet.stats
    : draft.stats;

  return (
    <div className="shell">
      <StatusBar left={sheet.name} mid={sheet.status} right={`LV${sheet.level}`} />
      <ScrollPane>
        <Art kind="portrait" />
        <div className="nameblock">
          <h2>{sheet.name}</h2>
          <p>
            {role} · LV{sheet.level} · {sheet.status}
          </p>
        </div>
        {sheet.status === 'SUBMITTED' ? (
          <div className="blurb">APPLICATION IN · staff has the CGEN job.</div>
        ) : null}
        {sheet.status === 'REVISION' ? (
          <div className="blurb">REVISION · staff kicked this back.</div>
        ) : null}
        <Gauge
          label="RESILIENCE"
          value={`${sheet.resilience} / ${sheet.resilienceMax}`}
          ratio={sheet.resilienceMax ? sheet.resilience / sheet.resilienceMax : 0}
          danger={sheet.resilienceMax > 0 && sheet.resilience / sheet.resilienceMax <= 0.3}
          onClick={() => setPatchOpen(true)}
        />
        <Gauge
          label="LOADOUT"
          value={`${load} / ${loadMax || sheet.loadMax}`}
          ratio={(loadMax || sheet.loadMax) ? load / (loadMax || sheet.loadMax) : 0}
          danger={load > (loadMax || sheet.loadMax)}
          onClick={() => nav('/inventory')}
        />
        <Row left="CASH" right={`${sheet.cash} b¥`} />
        <Row left="AP" right={`${sheet.ap} · LIFE ${sheet.apTotal}`} />
        {STAT_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className="row"
            onClick={() => {
              session.send(`+roll ${STAT_ABBR[key]}`);
              nav('/play');
            }}
          >
            <span className="left">{statMark(key)}</span>
            <span className="right">
              {stats[key] ?? 0} <Dots value={stats[key] ?? 0} />
            </span>
          </button>
        ))}
        {sheet.critical ? (
          <Row
            left={`CRITICAL · ${sheet.critical.location.toUpperCase()} sev${sheet.critical.severity}`}
            sub={sheet.critical.effect}
            danger
            onClick={() => setPatchOpen(true)}
          />
        ) : null}
        <Row left="EDGE" right={sheet.edge.toUpperCase() || '—'} />
        {sheet.note ? (
          <>
            <div className="section">NOTE</div>
            <pre className="popup-body">{sheet.note}</pre>
          </>
        ) : null}
        {sheet.affectations.length ? (
          <>
            <div className="section">LOOK</div>
            {sheet.affectations.map((item) => (
              <Row key={item} left={item} />
            ))}
          </>
        ) : null}
        {sheet.quirks.length ? (
          <>
            <div className="section">QUIRKS</div>
            {sheet.quirks.map((item) => (
              <Row key={item} left={item} />
            ))}
          </>
        ) : null}
        <Row
          left="INVENTORY"
          right={`${gear.length} ▸`}
          onClick={() => nav('/inventory')}
        />
        <Row left="AUGMENTATIONS" right={`${sheet.augs.length}`} />
        {sheet.augs.map((item) => (
          <Row key={item.slug || item.name} left={item.name} />
        ))}
      </ScrollPane>
      <HealSheet open={patchOpen} onClose={() => setPatchOpen(false)} />
      <PlayTabs staff={session.staff} />
    </div>
  );
}
