import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { useSession } from './state/session';
import { PALETTE } from './theme/tokens';
import './styles.css';

document.documentElement.dataset.palette = PALETTE;

const root = document.getElementById('root');
if (!root) throw new Error('missing #root');

if (import.meta.env.DEV) {
  const host = window as unknown as {
    __session: typeof useSession;
    __PREVIEW__?: Partial<ReturnType<typeof useSession.getState>>;
  };
  host.__session = useSession;
  if (host.__PREVIEW__) useSession.setState(host.__PREVIEW__);
}

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
