import { useEffect, useMemo, useState } from 'react';
import { formatCash } from '../protocol/format';
import { sheetIsLive } from '../protocol/frames';
import {
  MARKET_TABS,
  canAfford,
  filterMarket,
  marketBuyLine,
  marketDescribe,
  marketInfoLine,
  marketKindLabel,
  marketStockOk,
} from '../protocol/market';
import { useSession } from '../state/session';
import { Art, PlayTabs, PopupFrame, Row, ScrollPane, Segments, Slab, StatusBar } from '../ui/chrome';

export function Market() {
  const session = useSession();
  const cash = session.market.cash || session.sheet?.cash || 0;
  const load = session.gear.load || session.sheet?.load || 0;
  const loadMax = session.gear.loadMax || session.sheet?.loadMax || 10;
  const live = session.sheet ? sheetIsLive(session.sheet.status) : false;
  const catalog = session.market.items;
  const [tab, setTab] = useState<(typeof MARKET_TABS)[number]>('GUNS');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!session.linked) return;
    session.send('+market');
  }, [session.linked, session.send]);

  const rows = useMemo(() => filterMarket(catalog, tab, query), [catalog, tab, query]);
  const selected = catalog.find((item) => item.slug === picked) ?? null;
  const unaffordable = selected ? !canAfford(cash, selected.price, qty) : false;
  const afterCash = selected ? cash - selected.price * qty : cash;
  const afterLoad = selected ? load + qty : load;
  const onShelf = selected ? marketStockOk(selected.stock) : false;

  function openItem(slug: string) {
    setPicked(slug);
    setQty(1);
    session.send(marketInfoLine(slug), { echo: true });
  }

  function buy() {
    if (!selected || !onShelf || unaffordable || !live) return;
    session.send(marketBuyLine(selected.slug, qty));
    session.send('+market');
    session.send('+gear');
    session.send('+sheet');
    setPicked(null);
    setQty(1);
  }

  return (
    <div className="shell">
      <StatusBar left={session.district} mid="MARKET" right={formatCash(cash)} />
      <Segments
        value={tab}
        items={MARKET_TABS.map((id) => ({ id, label: id }))}
        onChange={(id) => {
          setTab(id as (typeof MARKET_TABS)[number]);
          setPicked(null);
        }}
      />
      <label className="field">
        <span>SEARCH</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="name · slug"
          autoComplete="off"
        />
      </label>
      <ScrollPane>
        {rows.map((item) => (
          <Row
            key={item.slug}
            left={item.name}
            right={marketStockOk(item.stock) ? formatCash(item.price) : item.stock.toUpperCase()}
            sub={item.spec}
            selected={picked === item.slug}
            onClick={() => openItem(item.slug)}
          />
        ))}
        {rows.length === 0 ? <div className="blurb">No stock in {tab.toLowerCase()}.</div> : null}
      </ScrollPane>
      <PopupFrame
        className="stall-card"
        title={selected?.name ?? 'STALL'}
        open={Boolean(selected)}
        onClose={() => {
          setPicked(null);
          setQty(1);
        }}
      >
        {selected ? (
          <>
            <Art src={selected.image || undefined} />
            <div className="nameblock">
              <h2>{selected.name}</h2>
              <p>
                {marketKindLabel(selected)} · {formatCash(selected.price)}
              </p>
            </div>
            <pre className="popup-body stall-copy">
              {marketDescribe({
                name: selected.name,
                category: selected.category,
                kind: selected.kind,
                blurb: selected.blurb,
              })}
            </pre>
            {selected.stats.length ? (
              <div className="popup-meta">
                {selected.stats.map((stat) => `${stat.label} ${stat.value}`).join(' · ')}
              </div>
            ) : selected.spec ? (
              <div className="popup-meta">{selected.spec}</div>
            ) : null}
            {selected.tags.length ? (
              <div className="popup-meta">{selected.tags.map((tag) => tag.toUpperCase()).join(' · ')}</div>
            ) : null}
            {!marketStockOk(selected.stock) ? (
              <div className="blurb">out of reach · {selected.stock}</div>
            ) : null}
            {!live ? <div className="blurb">Need a live sheet to buy.</div> : null}
            <div className="segments">
              <button type="button" onClick={() => setQty((n) => Math.max(1, n - 1))}>
                −
              </button>
              <button type="button">{qty}</button>
              <button type="button" onClick={() => setQty((n) => n + 1)}>
                ＋
              </button>
            </div>
            <Slab disabled={!onShelf || unaffordable || !live} onClick={buy}>
              {unaffordable
                ? `NEED ${formatCash(selected.price * qty)}`
                : `BUY · ${formatCash(selected.price * qty)}`}
            </Slab>
            <div className="popup-meta stall-after">
              {`AFTER · ${formatCash(Math.max(0, afterCash))} · LOAD ${afterLoad}/${loadMax}`}
            </div>
          </>
        ) : null}
      </PopupFrame>
      <PlayTabs staff={session.staff} />
    </div>
  );
}
