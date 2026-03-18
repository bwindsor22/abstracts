# Abstracts — Implementation Status

*Last updated: 2026-03-14*

---

## Portal Infrastructure

| Component | Status | Notes |
|---|---|---|
| `portal/package.json` | ✅ Done | Merged all deps (react-dnd, three.js, @r3f, tensorflow, yaml) |
| `portal/public/index.html` | ✅ Done | Space Grotesk + Material Symbols Outlined fonts |
| `portal/src/App.js` | ✅ Done | State-based routing, GameWrapper integration, badge checks |
| `portal/src/App.css` | ✅ Done | Design tokens, fluid glow background |
| `portal/src/components/GameWrapper.jsx` | ✅ Done | Lazy-loads all 10 games, passes onBack/onResult |
| `portal/src/data/games.js` | ✅ Done | 10 games with Material Symbols icons (no emoji) |
| `portal/src/data/badges.js` | ✅ Done | 13 badges (all with artwork) |
| `portal/src/utils/storage.js` | ✅ Done | localStorage, ELO per game, badge tracking |
| `portal/src/components/Header.jsx` | ✅ Done | ABSTRACTS branding, hamburger |
| `portal/src/components/NavDrawer.jsx` | ✅ Done | Full-screen nav overlay |
| `portal/src/components/BadgeToast.jsx` | ✅ Done | Slide-up earned-badge notification |
| `portal/src/views/Library.jsx` | ✅ Done | Game grid landing |
| `portal/src/views/MatchHistory.jsx` | ✅ Done | History list |
| `portal/src/views/EloTrends.jsx` | ✅ Done | ELO chart per game |
| `portal/src/views/Badges.jsx` | ✅ Done | 21 badges display |
| `portal/src/views/Profile.jsx` | ✅ Done | Stats overview |
| `npm install` | ✅ Done | 1421 packages, no errors |

---

## Games — Integration Status

| Game | Props | Dark Theme | Controls | Notes |
|---|---|---|---|---|
| hexes | ✅ `onBack, onResult` | ✅ Dark purple | ✅ | Timeless Classic |
| marbles | ✅ `onBack, onResult` | ✅ Dark purple | ✅ | Timeless Classic |
| bridges | ✅ `onBack, onResult` | ✅ Dark purple | ✅ | Timeless Classic |
| stones | ✅ `onBack, onResult` | ✅ Dark purple | ✅ | Timeless Classic |
| walls | ✅ `onBack, onResult` | ✅ Dark purple | ✅ | Modern Marvel |
| circles | ✅ `onBack, onResult` | ✅ Dark purple | ✅ | Modern Marvel |
| stacks | ✅ `onBack, onResult` | ✅ 3D dark purple scene | ✅ | Modern Marvel, react-three-fiber |
| towers | ✅ `onBack, onResult` | ✅ 3D dark purple scene | ✅ | Modern Marvel, react-three-fiber |
| trees | ✅ `onBack, onResult` | ✅ Green/forest theme | ✅ | Modern Marvel — start screen only redesigned |
| bugs | ✅ `onBack, onResult` | ✅ Dark purple | ✅ | Modern Marvel |

---

## Badge Definitions (21 total)

### Participation

| Badge | Trigger | Rarity |
|---|---|---|
| First Move | Played 1 game | Common |
| Getting Started | Played 5 games | Common |
| Dedicated | Played 20 games | Uncommon |
| Modern Explorer | Played every Modern Marvel ≥1 | Uncommon |
| Classic Explorer | Played every Timeless Classic ≥1 | Uncommon |
| Full Collection | Played all 10 games ≥1 | Rare |

### Winning (general)

| Badge | Trigger | Rarity |
|---|---|---|
| First Victory | Won 1 game | Common |
| Champion | Won 5 games | Uncommon |
| Veteran | Won 20 games | Rare |
| Polymath | Won in 3+ different titles | Rare |
| Grandmaster | Won 10 games | Epic |

### Per Classic — Easy

| Badge | Trigger | Rarity |
|---|---|---|
| Hex Novice | Won Hexes on Easy | Common |
| Marble Novice | Won Marbles on Easy | Common |
| Bridge Novice | Won Bridges on Easy | Common |
| Stone Novice | Won Stones on Easy | Common |

### Per Classic — Medium

| Badge | Trigger | Rarity |
|---|---|---|
| Hex Adept | Won Hexes on Medium | Uncommon |
| Marble Adept | Won Marbles on Medium | Uncommon |
| Bridge Adept | Won Bridges on Medium | Uncommon |
| Stone Adept | Won Stones on Medium | Uncommon |

### Milestone

| Badge | Trigger | Rarity |
|---|---|---|
| Classic Master | Won all 4 Classics on Medium | Epic |
| Modern Specialist | Won any Modern Marvel game | Rare |
| Completionist | Won in every title (all 10) | Legendary |

---

## Remaining Work

### Verification

- [x] Build passes — `npm run build` clean (exit 0)
- [ ] Run tests: `npm test` in portal — verify all test files pass
- [ ] Full playthrough: Library → pick game → play → win → check Match History, check badges earned
- [ ] Push to GitHub: `git push origin main` in abstracts repo

### Deferred (out of scope for now)

- [ ] Auth + backend: Supabase for persistent user accounts
- [ ] Deployment: Vercel (plan exists, not implemented)
- [ ] Sun image / sun position mechanic (trees game, needs image generation)

---

## Architecture Notes

- **One port**: all games render as React components in portal/ (no iframes)
- **CSS scoping**: each game wrapped in `<div className="game-{id}">` to prevent collisions
- **react-dnd**: each DnD game has its own `<DndProvider>` — sibling providers don't conflict
- **3D games**: stacks + towers use react-three-fiber; canvas kept, colors updated to dark purple
- **Trees exception**: board/gameplay unchanged; only start screen redesigned (green/forest theme)
- **ELO**: computed from history — base 1200, +25 win, −15 loss, floor 800
