import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { authReady, type AuthMode } from '../protocol/auth';
import { bangError } from '../protocol/console';
import { afterLinkPath } from '../protocol/chargen-gate';
import { parseSplash, splashSrc, splashUrl } from '../protocol/splash';
import { useSession } from '../state/session';
import { Art, Segments, Slab, StatusBar } from '../ui/chrome';

export function Boot() {
  const nav = useNavigate();
  const { jackIn, register, error, busy, linked, needsChargen, host } = useSession();
  const [mode, setMode] = useState<AuthMode>('login');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [art, setArt] = useState('/splash.jpg');
  const ready = authReady(mode, { handle, password: pass, email });

  useEffect(() => {
    const ac = new AbortController();
    void fetch(splashUrl(host), { signal: ac.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((raw) => {
        const src = splashSrc(host, parseSplash(raw));
        if (src) setArt(src);
      })
      .catch(() => {
        /* bundled /splash.jpg */
      });
    return () => ac.abort();
  }, [host]);

  if (linked && needsChargen !== 'unknown') {
    return <Navigate to={afterLinkPath(needsChargen)} replace />;
  }

  async function submit() {
    if (mode === 'register') {
      await register(handle.trim(), email.trim(), pass);
    } else {
      await jackIn(handle.trim(), pass);
    }
    const next = useSession.getState();
    if (!next.linked) return;
    nav(afterLinkPath(next.needsChargen));
  }

  return (
    <div className="shell boot">
      <StatusBar left="TERMV" mid="UNLINKED" right="2d6" />
      <div className="invert-title">
        <h1>{`>> TERMINAL VELOCITY`}</h1>
        <p>STREET OPERATORS</p>
      </div>
      <Art kind="skyline" src={art} />
      <Segments
        value={mode}
        items={[
          { id: 'login', label: 'LOGIN' },
          { id: 'register', label: 'REGISTER' },
        ]}
        onChange={(id) => setMode(id as AuthMode)}
      />
      <label className="field">
        <span>HANDLE</span>
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          autoComplete="username"
          maxLength={64}
        />
      </label>
      {mode === 'register' ? (
        <label className="field">
          <span>EMAIL</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            maxLength={254}
          />
        </label>
      ) : null}
      <label className="field">
        <span>PASSKEY</span>
        <input
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && ready) void submit();
          }}
        />
      </label>
      <Slab onClick={() => void submit()} disabled={busy || !ready}>
        {busy ? 'LINKING…' : mode === 'register' ? 'CREATE HANDLE_' : 'JACK IN_'}
      </Slab>
      <div className={error ? 'err bang' : 'err'} aria-live="assertive">
        {error ? bangError(error) : null}
      </div>
      <p className="legal">
        Powered by{' '}
        <a href="https://github.com/UrsaMU/ursamu" target="_blank" rel="noreferrer">
          URSAMU
        </a>
      </p>
    </div>
  );
}
