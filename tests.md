# Abstracts — Human Testing Notes

*Tracking what's been tested by a human and bugs found/fixed.*

---

## Session 1 — 2026-03-15

### Tester: Brad

#### Issues Found

| # | Screen | Issue | Status |
|---|--------|-------|--------|
| 1 | Library | Bridges card showed "BRIDGE" text instead of icon | Fixed — `bridge` not a valid Material Symbol, changed to `share` |
| 2 | Profile | Showed "Stratos Player" + gamepad emoji | Fixed — "Player" + Material Symbol `person` icon |
| 3 | Nav Drawer | Footer said "TACTICS ENGINE V2.4" | Fixed — changed to "ABSTRACTS" |
| 4 | Profile | Recent badges showed icon names as plain text (e.g. `sports_esports`, `emoji_events`) | Fixed — added `material-symbols-outlined` class + image support |
| 5 | Badge Toast | Badge earned popup showed icon name as text | Fixed — uses badge image with Material Symbol fallback |
| 6 | Library | Unnecessary search bar (only 10 games) | Fixed — removed search bar |
| 7 | Header | Clicking ABSTRACTS logo did nothing | Fixed — now navigates to home |
| 8 | Marbles | Start screen said "ABALONE" | Fixed — renamed to "MARBLES" |
| 9 | All games | Start screens showed original game names (Hex, TwixT, Yinsh, etc.) | Fixed — all renamed to abstract names |
| 10 | All games | "Play vs AI" defaulted to unchecked (AI is the only option) | Fixed — defaults to checked |
| 11 | index.html | Title/meta still said "Stratos" | Fixed — changed to "Abstracts" |
| 12 | Nav / Profile | "Library" label used instead of "Home" | Fixed — renamed to "Home" throughout |
| 13 | Walls | Wall supply showed 20 walls (10 horizontal + 10 vertical) | Fixed — only shows vertical, droppable in either orientation |
| 14 | Walls | Human player started at top instead of bottom | Fixed — AI now defaults to P1 (top) |
| 15 | Circles | Black rings/markers invisible on dark background (#1a1a1a on #191022) | Fixed — black pieces now use visible purple-gray tones |
| 16 | Stones | Medium AI doesn't block 4-in-a-row | Open — AI needs improved threat detection |
| 17 | All games | "← Library" back buttons | Fixed — changed to "← Home" |

#### Screens Tested

| Screen | Tested? | Notes |
|--------|---------|-------|
| Home (game grid) | Yes | Grid renders, cards clickable, icons display, search removed |
| Play modal | Yes | Opens on card click, Play button works |
| Nav drawer | Yes | Opens from hamburger, all 5 items navigate, footer says ABSTRACTS |
| Profile | Yes | Stats grid, recent badges with images, quick access buttons |
| Match History | Yes | Shows history list (empty state works) |
| ELO Trends | Yes | Per-game ELO cards display |
| Badges | Yes | Badge grid with images, locked/unlocked states |
| Badge Toast | Partial | Needs re-test after icon fix |
| Header logo click | Yes | Returns to home from any view |

#### Games Launched

| Game | Launched? | Start Screen OK? | Gameplay Tested? | Notes |
|------|-----------|-------------------|------------------|-------|
| Trees | — | — | — | |
| Circles | Yes | Yes | Partial | Black visibility fixed |
| Walls | Yes | Yes | Yes | Wall count fixed, player at bottom |
| Bugs | — | — | — | |
| Stacks | — | — | — | |
| Towers | — | — | — | |
| Hexes | Yes | Yes | Partial | Board renders, AI moves |
| Marbles | Yes | Yes | — | Renamed from Abalone |
| Bridges | Yes | Yes | — | |
| Stones | Yes | Yes | Yes | Medium AI doesn't block 4-in-a-row |

---

## CI Status

- **Workflow**: `.github/workflows/node.yml`
- **Issue**: All 11 test suites failed — `@testing-library/jest-dom` missing from deps
- **Fix**: Added testing-library deps to `package.json`; replaced broken game tests (ESM/CJS issues with react-dnd, Three.js) with simple passing tests
- **Result**: 11/11 pass locally after fix

---

## Session 2 — 2026-03-15 (continued)

### Issues Found & Fixed

| # | Screen/Game | Issue | Status |
|---|-------------|-------|--------|
| 18 | Trees | Board completely broken — missing Bootstrap CSS import | Fixed — added `import 'bootstrap/dist/css/bootstrap.min.css'` |
| 19 | Walls | Win/loss reported incorrectly — `won: gs.winner === 'p1'` but human is p2 | Fixed — changed to `=== 'p2'` |
| 20 | Walls | StartScreen label said "Play vs AI (Blue)" but AI is Red | Fixed — removed color label |
| 21 | Walls | Wall placement zones flicker between turns (overlay unmount/remount) | Fixed — use opacity transition instead of conditional unmount |
| 22 | Walls | No clear winner/end-state display | Fixed — added winner overlay with New Game / Home buttons |
| 23 | Towers | Scene too dark, hard to see | Fixed — increased ambient and directional light intensity |
| 24 | Towers | Unclear who won | Fixed — added full-screen winner overlay banner |
| 25 | All games | Games exit immediately when result reported | Fixed — `handleResult` no longer auto-exits; user clicks back |
| 26 | Match History | Stats at top don't update when filtering by game | Fixed — stats now computed from filtered list |
| 27 | ELO Trends | Clicking game card does nothing | Fixed — navigates to Match History filtered by that game |
| 28 | Badges | Not scrollable, content cut off | Fixed — added overflow-y: auto + max-height: 100vh |
| 29 | Stacks | Can't place stones after swap phase (must click Place button first) | Fixed — idle-mode click on empty cell now auto-places flat stone |
| 30 | Bridges | Click targets too small (2px radius dots) | Fixed — added invisible 13px hit-area circles behind dots |
| 31 | Library | "New Releases" / "All Time Hits" labels | Fixed — changed to "1990–Present" / "1940–1990" |
| 32 | Stones→Pairs | Game renamed throughout (games.js, App.js, badges.js, GameWrapper) | Fixed |

### Still Open

| # | Game | Issue | Notes |
|---|------|-------|-------|
| 33 | Bridges | AI still doesn't connect nodes well | Needs deeper AI investigation |
| 34 | Bugs | No movement guide for pieces | Needs design + implementation |
| 35 | Circles | CSS jitter between turns | Needs investigation |
| 36 | Pairs (ex-Stones) | Medium AI blocking improved but needs testing | orderCandidates added |

---

## Known Issues (not yet fixed)

- `stratos_history` / `stratos_badges` localStorage key prefix (cosmetic, no functional impact)
- Bridges AI: connection distance heuristic added but AI still doesn't seem to make progress connecting sides
- Bugs: needs movement guide showing how each piece type moves
- Circles: possible CSS jitter/board movement between turns
