import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { afterLinkPath, playableGate } from './protocol/chargen-gate';
import { dossierPath } from './protocol/dock';
import { Boot } from './screens/Boot';
import { Chargen } from './screens/Chargen';
import { Comms } from './screens/Comms';
import { Console } from './screens/Console';
import { Deck } from './screens/Deck';
import { Gear } from './screens/Gear';
import { Gig } from './screens/Gig';
import { GigDone } from './screens/GigDone';
import { Haunts } from './screens/Haunts';
import { Map } from './screens/Map';
import { Market } from './screens/Market';
import { Play } from './screens/Play';
import { Sheet } from './screens/Sheet';
import { Staff } from './screens/Staff';
import { Dossier } from './screens/Dossier';
import { Wiki } from './screens/Wiki';
import { useSession } from './state/session';
import { Bulletin } from './ui/Bulletin';

function Gate({ children }: { children: ReactNode }) {
  const linked = useSession((s) => s.linked);
  if (!linked) return <Navigate to="/" replace />;
  return children;
}

function ChargenGate({ children }: { children: ReactNode }) {
  const linked = useSession((s) => s.linked);
  const needsChargen = useSession((s) => s.needsChargen);
  const sheet = useSession((s) => s.sheet);
  if (!linked) return <Navigate to="/" replace />;
  const gate = playableGate(needsChargen, sheet);
  if (gate === 'ready' || gate === 'submitted') {
    return <Navigate to={afterLinkPath(gate)} replace />;
  }
  return children;
}

function RestartToDossier() {
  const gen = useSession((s) => s.chargenGen);
  const needed = useSession((s) => s.needsChargen === 'needed');
  const nav = useNavigate();
  const seen = useRef(0);
  useEffect(() => {
    if (!gen || gen === seen.current || !needed) return;
    seen.current = gen;
    nav(dossierPath(true), { replace: true });
  }, [gen, needed, nav]);
  return null;
}

function SheetGate({ children }: { children: ReactNode }) {
  const linked = useSession((s) => s.linked);
  const needsChargen = useSession((s) => s.needsChargen);
  const sheet = useSession((s) => s.sheet);
  if (!linked) return <Navigate to="/" replace />;
  if (playableGate(needsChargen, sheet) === 'needed') {
    return <Navigate to="/chargen" replace />;
  }
  return children;
}

function PathWatch() {
  const path = useLocation().pathname;
  const seenPath = useSession((s) => s.seenPath);
  useLayoutEffect(() => {
    seenPath(path);
  }, [path, seenPath]);
  return null;
}


function applyHostsFromQuery(): void {
  if (typeof window === 'undefined') return;
  const q = new URLSearchParams(window.location.search);
  const api = q.get('api') || q.get('host');
  const ws = q.get('ws');
  if (api || ws) {
    const cur = useSession.getState();
    useSession.getState().setHosts(
      api || cur.host,
      ws || cur.wsHost,
    );
  }
}

function isEmbed(): boolean {
  if (typeof window === 'undefined') return false;
  const q = new URLSearchParams(window.location.search);
  if (q.has('embed')) return true;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function App() {
  useLayoutEffect(() => {
    applyHostsFromQuery();
  }, []);
  return (
    <div className={isEmbed() ? 'app embed' : 'app'}>
      <div className="stage">
        <PathWatch />
        <RestartToDossier />
        <Routes>
          <Route path="/" element={<Boot />} />
          <Route path="/chargen" element={<ChargenGate><Chargen /></ChargenGate>} />
          <Route path="/play" element={<Gate><Play /></Gate>} />
          <Route path="/console" element={<Gate><Console /></Gate>} />
          <Route path="/combat" element={<Navigate to="/play" replace />} />
          <Route path="/roll" element={<Navigate to="/play" replace />} />
          <Route path="/sheet" element={<SheetGate><Sheet /></SheetGate>} />
          <Route path="/inventory" element={<SheetGate><Gear /></SheetGate>} />
          <Route path="/gear" element={<Navigate to="/inventory" replace />} />
          <Route path="/market" element={<Gate><Market /></Gate>} />
          <Route path="/deck" element={<Gate><Deck /></Gate>} />
          <Route path="/hack" element={<Navigate to="/deck" replace />} />
          <Route path="/map" element={<Gate><Map /></Gate>} />
          <Route path="/haunts" element={<Gate><Haunts /></Gate>} />
          <Route path="/comms" element={<Gate><Comms /></Gate>} />
          <Route path="/staff" element={<Gate><Staff /></Gate>} />
          <Route path="/gig" element={<Gate><Gig /></Gate>} />
          <Route path="/gig/done" element={<Gate><GigDone /></Gate>} />
          <Route path="/dossier" element={<Gate><Dossier /></Gate>} />
          <Route path="/wiki" element={<Gate><Wiki /></Gate>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Bulletin />
      </div>
    </div>
  );
}
