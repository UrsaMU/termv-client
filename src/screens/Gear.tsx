import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  gearActions,
  gearCmd,
  gearItemRef,
  gearSub,
  isAmmoHost,
  isLooseAmmo,
  isLooseMod,
  modAttachLine,
  packAmmo,
  packGuns,
  packMods,
} from '../protocol/gear';
import { isLazarusItem } from '../protocol/heal';
import { groupedGear, useSession } from '../state/session';
import {
  Art,
  Gauge,
  LookHead,
  PlayTabs,
  PopupFrame,
  Row,
  ScrollPane,
  Segments,
  Slab,
  StatusBar,
  StreetInput,
} from '../ui/chrome';
import type { GearItem } from '../protocol/frames';

type Mode = 'acts' | 'give' | 'unmod';
type GuideAct = 'mod' | 'load' | 'load-onto';
type Guide = { act: GuideAct; host: string; label: string } | null;

export function Gear() {
  const nav = useNavigate();
  const session = useSession();
  const sheet = session.sheet;
  const pack = session.gear.items;
  const groups = groupedGear(pack);
  const load = session.gear.load || sheet?.load || 0;
  const loadMax = session.gear.loadMax || sheet?.loadMax || 10;
  const [picked, setPicked] = useState<string | null>(null);
  const [giveTo, setGiveTo] = useState('');
  const [mode, setMode] = useState<Mode>('acts');
  const [guide, setGuide] = useState<Guide>(null);
  const overloaded = load > loadMax;
  const selected = pack.find((item) => item.name === picked) ?? null;
  const acts = selected ? gearActions(selected, pack) : [];
  const ammoBox = packAmmo(pack);
  const looseMods = packMods(pack);
  const guns = packGuns(pack);
  const guideChoices = guide?.act === 'load' ? ammoBox : guide?.act === 'load-onto' ? guns : looseMods;

  useEffect(() => {
    if (session.linked) session.refreshGear();
  }, [session.linked, session.refreshGear]);

  useEffect(() => {
    setGiveTo('');
    setMode('acts');
  }, [picked]);

  function run(act: (typeof acts)[number]['id'], extra = '') {
    if (!selected) return;
    if (act === 'use' && isLazarusItem(selected)) {
      session.healSelf('lazarus');
      setPicked(null);
      setMode('acts');
      return;
    }
    const ref = gearItemRef(selected, pack);
    const line = gearCmd(act, ref, extra);
    if (!line) return;
    session.useGear(act, ref, extra);
    if (act === 'drop') session.send('look');
    setPicked(null);
    setMode('acts');
    setGiveTo('');
  }

  function startGuide(act: GuideAct) {
    if (!selected) return;
    setGuide({ act, host: gearItemRef(selected, pack), label: selected.name });
    setPicked(null);
    setMode('acts');
  }

  function finishGuide(piece: GearItem) {
    if (!guide) return;
    if (guide.act === 'mod') {
      const extra = gearItemRef(piece, pack);
      if (!modAttachLine(guide.host, piece)) return;
      session.useGear('mod', guide.host, extra);
      setGuide(null);
      return;
    }
    const gun = guide.act === 'load-onto' ? gearItemRef(piece, pack) : guide.host;
    const ammo = guide.act === 'load-onto' ? guide.host : gearItemRef(piece, pack);
    if (!gearCmd('load', gun, ammo)) return;
    session.useGear('load', gun, ammo);
    setGuide(null);
  }

  return (
    <div className="shell">
      <StatusBar left="INVENTORY" mid={overloaded ? 'OVER' : 'PACK'} right={`${load}/${loadMax}`} />
      <div className="look-card">
        <div className="slash-head">
          <span>{'>> /INV'}</span>
          <span className="n">{overloaded ? 'OVER' : 'PACK'}</span>
        </div>
        <Art kind="district" />
      </div>
      <Gauge
        label="LOADOUT"
        value={`${load} / ${loadMax}`}
        ratio={loadMax ? load / loadMax : 0}
        danger={overloaded}
      />
      {overloaded ? <div className="warn">over capacity → penalty on every action</div> : null}
      <ScrollPane>
        {(['wielded', 'worn', 'carried'] as const).map((group) => (
          <section key={group}>
            <LookHead label={group.toUpperCase()} count={groups[group].length} />
            {groups[group].map((item) => (
              <Row
                key={`${group}-${item.name}`}
                left={item.name}
                right={String(item.load)}
                sub={gearSub(item)}
                selected={picked === item.name}
                onClick={() => {
                  if (guide) {
                    if (guide.act === 'mod' && isLooseMod(item)) finishGuide(item);
                    else if (guide.act === 'load' && isLooseAmmo(item)) finishGuide(item);
                    else if (guide.act === 'load-onto' && isAmmoHost(item)) finishGuide(item);
                    return;
                  }
                  setPicked(item.name);
                }}
              />
            ))}
            {groups[group].length === 0 ? <div className="blurb">empty</div> : null}
          </section>
        ))}
      </ScrollPane>
      <PopupFrame
        className="pack-sheet"
        title={guide?.act === 'load' ? 'LOAD' : guide?.act === 'load-onto' ? 'LOAD ONTO' : 'MOD'}
        open={Boolean(guide)}
        onClose={() => setGuide(null)}
      >
        {guide ? (
          <>
            <Row left={guide.label} right="HOST" />
            <LookHead
              label={guide.act === 'mod' ? 'LOOSE MODS' : guide.act === 'load-onto' ? 'GUNS' : 'AMMO'}
              count={guideChoices.length}
            />
            {guideChoices.map((item) => (
              <Row
                key={item.slug || item.name}
                left={item.name}
                right={guide.act === 'mod' ? 'ATTACH ▸' : 'LOAD ▸'}
                sub={item.kind ? item.kind.toUpperCase() : undefined}
                onClick={() => finishGuide(item)}
              />
            ))}
            {guideChoices.length === 0 ? (
              <div className="blurb">
                {guide.act === 'mod'
                  ? 'No loose mods in the pack. Buy one at market.'
                  : guide.act === 'load-onto'
                    ? 'No gun in pack.'
                    : 'No ammo in pack. Buy a box at market.'}
              </div>
            ) : null}
          </>
        ) : null}
      </PopupFrame>
      <PopupFrame
        className="stall-card"
        title={selected?.name ?? 'ITEM'}
        open={Boolean(selected)}
        onClose={() => {
          setPicked(null);
          setMode('acts');
        }}
      >
        {selected ? (
          <>
            <Art />
            <div className="nameblock">
              <h2>{selected.name}</h2>
              <p>
                {`${selected.slot.toUpperCase()} · LOAD ${selected.load}`}
                {selected.kind ? ` · ${selected.kind.toUpperCase()}` : ''}
                {selected.magMax != null ? ` · MAG ${selected.mag ?? 0}/${selected.magMax}` : ''}
              </p>
            </div>
            {selected.ammo ? (
              <Row left={`AMMO · ${selected.ammo.name}`} right="UNLOAD ▸" onClick={() => run('unload')} />
            ) : selected.magMax != null ? (
              <div className="popup-meta">AMMO · STANDARD</div>
            ) : null}
            {selected.fittings.length ? <div className="section">FITTED</div> : null}
            {selected.fittings.map((fit) => (
              <Row
                key={fit.slug || fit.name}
                left={fit.name}
                right="UNMOD ▸"
                sub={fit.effect || (fit.bonus != null ? `+${fit.bonus}` : fit.tags.join(' / '))}
                onClick={() => run('unmod', fit.slug || fit.name)}
              />
            ))}
            {mode === 'give' ? (
              <>
                <label className="field">
                  <span>TO</span>
                  <input
                    value={giveTo}
                    onChange={(e) => setGiveTo(e.target.value)}
                    autoComplete="off"
                    placeholder="handle"
                  />
                </label>
                <Slab disabled={!giveTo.trim()} onClick={() => run('give', giveTo)}>
                  GIVE ▸
                </Slab>
              </>
            ) : null}
            {mode === 'unmod' ? (
              <>
                <div className="section">FITTINGS</div>
                {selected.fittings.map((fit) => (
                  <Row
                    key={fit.slug || fit.name}
                    left={fit.name}
                    right="▸"
                    onClick={() => run('unmod', fit.slug || fit.name)}
                  />
                ))}
              </>
            ) : null}
            {mode === 'acts'
              ? acts.map((act) => (
                  <Row
                    key={act.id}
                    left={act.label}
                    right="▸"
                    danger={act.id === 'drop'}
                    onClick={() => {
                      if (act.id === 'give') {
                        setMode('give');
                        return;
                      }
                      if (act.id === 'load') {
                        startGuide(isLooseAmmo(selected) && !isAmmoHost(selected) ? 'load-onto' : 'load');
                        return;
                      }
                      if (act.id === 'mod') {
                        startGuide('mod');
                        return;
                      }
                      if (act.id === 'unmod') {
                        setMode('unmod');
                        return;
                      }
                      run(act.id);
                    }}
                  />
                ))
              : null}
          </>
        ) : null}
      </PopupFrame>
      <Segments
        items={[
          { id: 'market', label: 'MARKET' },
          { id: 'chrome', label: 'CHROME' },
        ]}
        onChange={(id) => {
          if (id === 'market') nav('/market');
          if (id === 'chrome') session.send('+aug');
        }}
      />
      <StreetInput />
      <PlayTabs staff={session.staff} />
    </div>
  );
}
