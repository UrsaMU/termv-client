# Agent Instructions

## Package Manager
Use **npm**: `npm install`, `npm test`, `npm run typecheck`, `npm run dev`

## File-Scoped Commands
| Task | Command |
|------|---------|
| Typecheck | `npx tsc --noEmit` |
| Test | `npx vitest run src/protocol/stick-scroll.test.ts` |

## Commit Attribution
AI commits MUST include:
```
Co-Authored-By: Grok <noreply@x.ai>
```

## Stick-scroll
- Street (`/play`) always stick-scrolls.
- Any window with a command input whose output lands in that pane (street, console, channel) uses `<ScrollPane tail>`.
- `pinToTail(true, ...)` never unsticks. AIM/BURST/AUTO on an NPC look card must pin combat/roll into the street feed.
- Looking at a thing (down NPC, corpse, gear, van) is street feed output. It must stick-scroll with the rest of the log — no inner scroll on the look card, no overlay.
- NPC attack buttons send `+attack` only. Do not follow with `look`.

## Live
See `README.md`. Game HTTP `4303`, WS `4302`. Plugin: `../ursamu/packages/sprawl`.
