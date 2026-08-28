# Sprawl client

Mobile-first web client for **Sprawl Goons: Upgraded** on UrsaMU. It is a retro terminal RPG, not a MUD client.

## Run

```bash
npm install
npm test
npm run typecheck
npm run dev
```

Open http://127.0.0.1:5173 and jack in to a running Terminal Velocity game:

- HTTP `http://127.0.0.1:4303`
- WebSocket `ws://127.0.0.1:4302?clientType=web`

Host values persist in `localStorage` (`sprawl.host`, `sprawl.ws`). They are not on the sign-in screen.

## Screens

| Route | Wireframe |
|---|---|
| `/` | 6a boot |
| `/chargen` | 6b seven-step chargen |
| `/play` | 4a + 5c scene |
| `/combat` | 6c |
| `/roll` | 6d |
| `/sheet` | 2b |
| `/gear` | 6f |
| `/market` | 6g |
| `/deck` | 6e |
| `/hack` | 2c |
| `/map` | 2d |
| `/comms` | 6i |
| `/staff` | 6j |
| `/gig/done` | 7c |

Gigs reuse `/play` with a private-scene status bar (7a–7b).

## Not in this build

Catalog browser, vehicles, drugs, location detail, settings UI, and the gig job board were not designed yet.
