import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CATALOG,
  CHARGEN_STEPS,
  STAT_CAP,
  STAT_FLOOR,
  STAT_KEYS,
  STEP_META,
  applyStep,
  canAdvance,
  cashFromLog,
  chargenCmd,
  chargenStepOffset,
  composeDraftLook,
  clearDraft,
  emptyDraft,
  loadDraft,
  resumeStepIndex,
  DESC_MAX,
  NOTE_MIN,
  pointsLeft,
  rollCatalog,
  saveDraft,
  statMark,
  type ChargenDraft,
  type ChargenStep,
} from '../protocol/chargen';
import { useSession } from '../state/session';
import { LookHead, PlayTabs, Row, ScrollPane, Segments, Slab, StatusBar, StreetInput } from '../ui/chrome';

function sendLines(send: (line: string) => void, raw: string): void {
  for (const line of raw.split('\n')) {
    if (line.trim()) send(line);
  }
}

export function Chargen() {
  const nav = useNavigate();
  const session = useSession();
  const send = session.send;
  const linked = session.linked;
  const [draft, setDraft] = useState<ChargenDraft>(() => loadDraft());
  const [stepIndex, setStepIndex] = useState(() => resumeStepIndex(draft));
  const [wipeArmed, setWipeArmed] = useState(false);
  const [descDirty, setDescDirty] = useState(false);
  const chargenGen = session.chargenGen;
  const done = draft.status === 'submitted';
  const step = CHARGEN_STEPS[stepIndex];
  const meta = STEP_META[step];
  const ready = canAdvance(draft, step);

  useEffect(() => {
    if (!linked) return;
    if (session.needsChargen === 'submitted' || session.needsChargen === 'ready') return;
    if (draft.status === 'submitted' || draft.status === 'approved') return;
    send('+chargen/start');
  }, [linked, send, session.needsChargen, draft.status]);

  useEffect(() => {
    const cash = cashFromLog(session.consoleLog);
    if (cash == null) return;
    setDraft((prev) => {
      if (prev.cash === cash) return prev;
      const next = { ...prev, cash };
      saveDraft(next);
      return next;
    });
  }, [session.consoleLog]);

  useEffect(() => {
    if (!chargenGen) return;
    setDraft(emptyDraft());
    setStepIndex(0);
    setWipeArmed(false);
    setDescDirty(false);
  }, [chargenGen]);

  useEffect(() => {
    if (!done) return;
    setStepIndex(CHARGEN_STEPS.length - 1);
  }, [done]);

  useEffect(() => {
    const text = session.lookDesc.trim();
    if (!text) return;
    setDraft((prev) => {
      if (prev.desc === text) return prev;
      const next = { ...prev, desc: text };
      saveDraft(next);
      return next;
    });
    setDescDirty(false);
  }, [session.lookDesc]);

  function update(next: ChargenDraft) {
    setDraft(next);
    saveDraft(next);
  }

  function goTo(index: number, base = draft) {
    const next = Math.max(0, Math.min(CHARGEN_STEPS.length - 1, index));
    setStepIndex(next);
    update({ ...base, step: CHARGEN_STEPS[next] });
  }

  function push(next: ChargenDraft, nextStep: ChargenStep, value?: string) {
    update(next);
    if (!linked) return;
    const line = chargenCmd(next, nextStep, value);
    if (line) sendLines(send, line);
  }

  function bump(key: (typeof STAT_KEYS)[number], delta: number) {
    const next = draft.stats[key] + delta;
    if (next < STAT_FLOOR || next > STAT_CAP) return;
    if (delta > 0 && pointsLeft(draft) <= 0) return;
    update({ ...draft, stats: { ...draft.stats, [key]: next } });
  }

  const list = useMemo(() => {
    if (step === 'background') return CATALOG.backgrounds;
    if (step === 'belongings') return CATALOG.belongings;
    if (step === 'quirks') return CATALOG.quirks;
    if (step === 'affectations') return CATALOG.affectations;
    if (step === 'augs') return CATALOG.augs;
    if (step === 'aug-origin') return CATALOG.augOrigins;
    return [];
  }, [step]);

  const rolled = step === 'belongings' || step === 'quirks' || step === 'affectations' ||
    step === 'background' || step === 'augs';

  const picked = useMemo(() => {
    if (step === 'belongings') {
      return draft.belongings.map((slug) => {
        const row = list.find((item) => item.slug === slug);
        return row ?? { slug, name: slug.replace(/^rolled-/, 'ROLL '), roll: '' };
      });
    }
    return list.filter((row) => {
      if (step === 'background') return draft.background === row.slug;
      if (step === 'augs') return draft.augs.includes(row.slug);
      if (step === 'aug-origin') return draft.augOrigin === row.slug;
      if (step === 'quirks') return draft.quirks.includes(row.slug);
      if (step === 'affectations') return draft.affectations.includes(row.slug);
      return false;
    });
  }, [list, step, draft]);

  function catalogRow(row: (typeof list)[number], selected: boolean) {
    const right =
      'edge' in row && row.edge
        ? row.edge.name
        : 'roll' in row
          ? String(row.roll)
          : '';
    return (
      <Row
        key={row.slug}
        left={row.name}
        right={right}
        sub={'blurb' in row ? row.blurb : 'edge' in row ? row.edge.blurb : undefined}
        selected={selected}
        onClick={() => {
          const next = applyStep(draft, step, row.slug);
          if (step === 'augs') update(next);
          else push(next, step, row.slug);
        }}
      />
    );
  }

  function generateLook() {
    const text = composeDraftLook(draft, { name: session.alias || 'They' });
    update(applyStep(draft, 'desc', text));
    setDescDirty(true);
  }

  function rollTable() {
    if (step === 'belongings') {
      if (draft.belongings.length >= 3) return;
      push(applyStep(draft, step, 'roll'), step, 'roll');
      return;
    }
    if (step === 'augs') {
      update(applyStep(draft, step, 'roll'));
      return;
    }
    const pick = rollCatalog(list as Array<{ slug: string }>);
    push(applyStep(draft, step, pick.slug), step, pick.slug);
  }

  return (
    <div className="shell">
      <StatusBar
        left={`STEP ${stepIndex + 1} / ${CHARGEN_STEPS.length}`}
        mid={draft.status.toUpperCase()}
        right={`${pointsLeft(draft)} PTS`}
      />
      <div className="slash-head">
        <span>{'>> CHARGEN'}</span>
        <span className="n">{meta.title}</span>
        <span className="chargen-acts">
          <button
            type="button"
            className={wipeArmed ? 'chargen-out wipe' : 'chargen-out'}
            onClick={() => {
              if (!wipeArmed) {
                setWipeArmed(true);
                return;
              }
              if (linked) send('+chargen/restart confirm');
              else {
                clearDraft();
                goTo(0, emptyDraft());
              }
              setWipeArmed(false);
            }}
          >
            {wipeArmed ? 'CONFIRM' : 'RESTART'}
          </button>
        </span>
      </div>
      <div className="progress">
        {CHARGEN_STEPS.map((id, i) => (
          <i key={id} className={done || i <= stepIndex ? 'on' : undefined} />
        ))}
      </div>
      <div className="blurb">
        <strong>{done ? 'APPLICATION IN' : meta.title}</strong>
        <div>
          {done ? 'Staff has the CGEN job. Street is open while you wait.' : meta.blurb}
        </div>
      </div>
      {done ? (
        <Slab
          onClick={() => {
            session.setNeedsChargen(
              session.sheet?.status === 'LIVE' || session.sheet?.status === 'APPROVED'
                ? 'ready'
                : 'submitted',
            );
            nav('/play');
          }}
        >
          STREET ▸
        </Slab>
      ) : null}
      {!done && step === 'cash' ? (
        <div className="chargen-pin">
          <LookHead label="STARTING CASH" />
          <Row left="b¥" right={draft.cash != null ? `${draft.cash}` : 'UNROLLED'} />
          <Slab
            onClick={() => {
              if (linked) send(chargenCmd(draft, 'cash'));
              else {
                const cash =
                  (Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1) * 100;
                update({ ...draft, cash });
              }
            }}
          >
            ROLL 2d6 × 100 ▸
          </Slab>
        </div>
      ) : null}
      {!done && step === 'note' ? (
        <div className="chargen-pin">
          <LookHead label="CHARACTER BG" />
          <label className="field">
            <span>
              {(draft.note ?? '').trim().length < NOTE_MIN
                ? `${NOTE_MIN - (draft.note ?? '').trim().length} to go`
                : 'ready'}
            </span>
            <textarea
              className="chargen-note"
              value={draft.note ?? ''}
              placeholder="Who you were before the chrome."
              disabled={draft.status === 'submitted'}
              onKeyDown={(e) => e.stopPropagation()}
              onChange={(e) => update(applyStep(draft, 'note', e.target.value))}
            />
          </label>
        </div>
      ) : null}
      {!done && step === 'desc' ? (
        <div className="chargen-pin">
          <LookHead label="STREET LOOK" />
          <label className="field">
            <span>
              {(draft.desc ?? '').trim()
                ? `${(draft.desc ?? '').length} / ${DESC_MAX}`
                : 'generate or write'}
            </span>
            <textarea
              className="chargen-note"
              value={draft.desc ?? ''}
              placeholder="What people see when they look at you."
              onKeyDown={(e) => e.stopPropagation()}
              onChange={(e) => {
                setDescDirty(true);
                update(applyStep(draft, 'desc', e.target.value));
              }}
            />
          </label>
        </div>
      ) : null}
      {!done && (rolled || picked.length) ? (
        <div className="chargen-pin">
          {rolled ? (
            <Slab onClick={rollTable} disabled={step === 'belongings' && draft.belongings.length >= 3}>
              ROLL THE TABLE ▸
            </Slab>
          ) : null}
          {step === 'belongings' ? (
            <LookHead label="KEPT" count={draft.belongings.length} />
          ) : null}
          {picked.map((row) => catalogRow(row, true))}
        </div>
      ) : null}
      <ScrollPane>
        {!done && step === 'stats'
          ? STAT_KEYS.map((key) => (
              <div key={key} className={draft.stats[key] > STAT_FLOOR ? 'row selected' : 'row'}>
                <span className="left">{statMark(key)}</span>
                <span className="right">
                  <button type="button" onClick={() => bump(key, -1)}>
                    −
                  </button>{' '}
                  {draft.stats[key]}{' '}
                  <button type="button" onClick={() => bump(key, 1)}>
                    ＋
                  </button>
                </span>
              </div>
            ))
          : null}
        {!done && step === 'stats' ? (
          <p className="why">Floor is 0. Spend all 4. {pointsLeft(draft)} left.</p>
        ) : null}
        {!done && step === 'augs' ? (
          <Row
            left="NONE"
            right="MEAT"
            sub="Stay un-chromed this pass."
            selected={Boolean(draft.augNone)}
            onClick={() => update(applyStep(draft, 'augs', 'none'))}
          />
        ) : null}
        {!done
          ? list
              .filter((row) => !picked.some((pick) => pick.slug === row.slug))
              .map((row) => catalogRow(row, false))
          : null}
      </ScrollPane>
      {!done && step === 'desc' ? (
        <Slab onClick={generateLook}>GENERATE ▸</Slab>
      ) : null}
      {!done ? (
      <Segments
        value={step}
        items={[
          { id: 'back', label: '‹ BACK', disabled: stepIndex === 0 },
          {
            id: 'next',
            label: `NEXT · ${step === 'augs' && !draft.augs.length ? 'NOTE' : meta.next} ›`,
            disabled: !ready || draft.status === 'submitted',
          },
        ]}
        onChange={(id) => {
          setWipeArmed(false);
          if (id === 'back') {
            goTo(chargenStepOffset(draft, stepIndex, -1));
            return;
          }
          if (id === 'next' && ready) {
            if (step === 'stats' && linked) sendLines(send, chargenCmd(draft, 'stats'));
            if (step === 'note') {
              const line = chargenCmd(draft, 'note');
              if (linked && line) send(line);
              const text = composeDraftLook(draft, { name: session.alias || 'They' });
              setDescDirty(true);
              goTo(stepIndex + 1, applyStep(draft, 'desc', text));
              return;
            }
            if (step === 'desc') {
              if (linked) {
                sendLines(send, chargenCmd(draft, 'stats'));
                const aug = chargenCmd(draft, 'augs');
                if (aug) send(aug);
                const note = chargenCmd(draft, 'note');
                if (note) send(note);
                if (descDirty) {
                  const line = chargenCmd(draft, 'desc');
                  if (line) send(line);
                }
                send('+chargen/submit');
                session.setCommsTab('jobs');
                void session.setJobFolder('cgen');
                window.setTimeout(() => {
                  void session.fileCgenJob();
                }, 500);
              }
              update({ ...draft, status: 'submitted', step: 'desc' });
              session.setNeedsChargen('submitted');
              nav('/play');
              window.setTimeout(() => send('look'), 200);
              return;
            }
            goTo(chargenStepOffset(draft, stepIndex, 1));
          }
        }}
      />
      ) : null}
      <StreetInput />
      <PlayTabs staff={session.staff} />
    </div>
  );
}
