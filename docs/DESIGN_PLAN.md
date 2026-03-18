# Abstracts — Design & Architecture Plan
*Final — approved for implementation*

---

## Decisions locked in

| Topic | Decision |
|---|---|
| App name | **Abstracts** |
| Architecture | Single merged React app — one port, all games as React components |
| Icons | Material Symbols Outlined (Google Fonts), exact ligature names from mockup HTML |
| Trees | Start screen redesign only (green/forest theme) — board/gameplay untouched |
| 3D games (stacks, towers) | Dark purple color theme applied to Three.js scene; canvas kept |
| Difficulty UX | Each game has its own start/difficulty screen. Clicking a game in the library goes straight to that game's start screen. On replay, difficulty can be changed. |
| Player name | "Player" |
| node_modules | One shared `node_modules` in the merged app; old standalone game folders untouched for now |
| Port strategy | One app, one port (3000) |
| Start screens (non-trees) | Each game keeps its own start screen — difficulty is chosen there, not in the portal |

---

## Design Philosophy

> *Accurate Grid · Frosted Glass · Fluid Background · Minimalist Interface*

- **Accurate Grid** — Clean node layouts for strategic placement. Boards should feel precise and uncluttered.
- **Frosted Glass Markers** — Tactile piece/marker rendering with glowing connections (e.g. links in bridges). Frosted-glass surfaces with `backdrop-filter: blur(12px)` for UI panels.
- **Fluid Background** — Deep purple animated backdrop (`#191022` + radial-gradient glow animation) consistent across the full library.
- **Minimalist Interface** — Simple, functional controls that stay out of the way of gameplay. No decorative chrome. Bottom bar: UNDO / PAUSE / MENU.

---

## 1. Architecture: single merged app

All 10 games and the hub live in **one CRA app** at `abstracts/portal/`.

```
abstracts/portal/
  package.json                  ← merged deps (react-dnd, three.js, tensorflow, etc.)
  public/
    index.html                  ← Space Grotesk + Material Symbols fonts
    nn_model/                   ← copied from trees/public/nn_model/
  src/
    App.js                      ← state-based routing (library ↔ game views)
    App.css                     ← global design tokens + fluid glow
    data/
      games.js                  ← 10 game configs (id, name, icon, category)
      badges.js                 ← 21 badge definitions
    utils/
      storage.js                ← localStorage: history, ELO, badges
    components/
      Header.jsx/.css           ← sticky header, "ABSTRACTS" + hamburger
      NavDrawer.jsx/.css        ← full-screen slide-in nav
      GameWrapper.jsx/.css      ← common chrome for every game (back btn, result capture)
      BadgeToast.jsx/.css       ← earned-badge slide-up toast
    views/
      Library.jsx/.css          ← game grid landing
      MatchHistory.jsx/.css
      EloTrends.jsx/.css
      Badges.jsx/.css
      Profile.jsx/.css
    games/
      hexes/   — App.js, App.css, Game.js, AI/ai.js
      marbles/ — App.js, App.css, Game.js, AI/ai.js
      bridges/ — App.js, App.css, Game.js, AI/ai.js
      stones/  — App.js, App.css, Game.js, AI/ai.js
      walls/   — App.js, App.css, Game.js, AI/ai.js
      bugs/    — App.js, App.css, Game.js, AI/ai.js
      circles/ — App.js, App.css, Game.js, AI/ai.js
      stacks/  — App.js, App.css, Game.js, AI/ai.js, Scene.jsx
      towers/  — App.js, App.css, Game.js, AI/ai.js, Scene3D.jsx
      trees/   — App.js, App.css, + full existing file tree
```

### Routing flow

```
Library
  → click game card
    → game's own start screen (difficulty picker)
      → game plays
        → game-over overlay (winner, Play Again / Back to Library)
```

`App.js` manages a single `playingGame` state variable. When set, `GameWrapper` renders the matching game component full-screen.

### CSS scoping

Each game gets a wrapper div to prevent class-name collisions:

```jsx
// games/hexes/App.js
<div className="game-hexes">...</div>
```

```css
/* games/hexes/App.css */
.game-hexes .App { ... }
.game-hexes .board { ... }
```

### react-dnd

Each DnD-using game (bridges, bugs, circles, marbles, walls, trees) wraps its own root in `<DndProvider>`. Multiple sibling DnD providers don't conflict.

---

## 2. Merged package.json

```json
{
  "name": "abstracts",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "bootstrap": "^5.3.0",
    "react-bootstrap": "^2.10.0",
    "react-dnd": "^16.0.1",
    "react-dnd-html5-backend": "^16.0.1",
    "react-dnd-touch-backend": "^16.0.1",
    "@react-three/fiber": "^8.17.0",
    "@react-three/drei": "^9.105.0",
    "three": "^0.166.0",
    "@tensorflow/tfjs": "^4.20.0"
  }
}
```

---

## 3. How each game gets modified

### Non-trees games (9 games)

Each game's `App.js` keeps its start screen and gains two props:

```js
export default function App({ onBack, onResult }) {
  // onBack()                            ← called from in-game MENU "Back to Library"
  // onResult({ won, moves, difficulty })← called when game detects a winner
}
```

The `GameWrapper` passes these callbacks in. Games report results when `winner` state is set.

### Trees

- **Start screen redesigned** to match `trees_refined_setup` mockup (green/forest theme)
- Board/gameplay unchanged
- `onResult` called when game ends

### GameWrapper

Thin wrapper that:
1. Renders the correct game component by `game.id`
2. Injects `onBack` (→ hub's `handleBack`) and `onResult` (→ hub's `handleResult`)
3. Does **not** add its own header or controls (each game manages its own chrome)

---

## 4. Design system

### Tokens

```
--bg:              #191022
--surface:         rgba(153, 66, 240, 0.08)
--surface-hover:   rgba(153, 66, 240, 0.15)
--border:          rgba(153, 66, 240, 0.18)
--primary:         #9942f0
--primary-dim:     rgba(153, 66, 240, 0.25)
--text:            #f0eeff
--text-secondary:  rgba(240, 238, 255, 0.5)
--font:            'Space Grotesk', sans-serif
--radius:          12px
```

### Fluid glow background (all views)

```css
@keyframes fluid-movement {
  0%   { transform: translate(0,0) scale(1); }
  33%  { transform: translate(2%,4%) scale(1.1); }
  66%  { transform: translate(-3%,2%) scale(0.95); }
  100% { transform: translate(0,0) scale(1); }
}
.fluid-glow {
  background: radial-gradient(circle at 20% 20%, rgba(153,66,240,.2) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(153,66,240,.15) 0%, transparent 50%);
  animation: fluid-movement 20s ease-in-out infinite alternate;
  filter: blur(40px);
  position: fixed; inset: 0; pointer-events: none; z-index: -1;
}
```

### Consistent in-game bottom bar (all games)

```
[ UNDO ]    [ PAUSE ]    [ MENU ]
```

- Pill-shaped frosted buttons, equal size, consistent position
- MENU opens an overlay: Resume / New Game / Back to Library
- UNDO calls each game's existing undo/revert function

### Consistent game header (all games)

```
[ ← ]    G A M E   N A M E    [ RED TURN ]
```

- Frosted glass bar, `backdrop-filter: blur(12px)`
- Turn indicator pill: red/blue matching current player

### Trees start screen (green theme)

Matches `trees_refined_setup` mockup:
- Forest photo background (CSS `background-image`, blurred)
- Green accent: `#2d7a47`
- Chip: "CLASSIC MODE"
- Selectors: player count (1v1 AI / 1v2 AI / 1v3 AI), match duration (3 / 4 rounds), difficulty (Easy / Medium / Hard / Expert)
- CTA: "Start Forest" button

### 3D game colors (stacks, towers)

- Scene background: `#191022`
- Board surface: dark navy `#1a0d2e`
- Lighting: subtle purple ambient
- Pieces: keep red/blue but saturated/glowing
- UI overlay (header, bottom bar): dark purple frosted style matching all other games

---

## 5. Badge definitions (21 badges)

### Participation

| Badge | Trigger | Rarity |
|---|---|---|
| First Move | Played 1 game | Common |
| Getting Started | Played 5 games | Common |
| Dedicated | Played 20 games | Uncommon |
| Modern Explorer | Played every Modern Marvels game ≥1 | Uncommon |
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
| Modern Specialist | Won any Modern Marvels game | Rare |
| Completionist | Won in every title (all 10) | Legendary |

---

## 6. Implementation phases

### Phase 1 — Foundation
1. Update `portal/package.json` with merged deps
2. Run `npm install`
3. Copy each game's `src/` → `portal/src/games/{name}/`
4. Copy trees public assets → `portal/public/`
5. Create `GameWrapper.jsx`
6. Update `App.js` to render games via `GameWrapper` (remove iframe `GameFrame`)
7. Rename "Stratos" → "Abstracts" throughout existing portal code

### Phase 2 — Game wiring
For each game:
- Add `onBack` / `onResult` props to `App.js`
- Call `onResult({ won, moves, difficulty })` on game over
- Call `onBack()` from MENU overlay "Back to Library"
- Wrap root div with `game-{name}` scoping class

### Phase 3 — Visual redesign
- Apply dark purple CSS to each game (scoped)
- Add consistent bottom bar (UNDO / PAUSE / MENU) to each game
- Add consistent game header to each game
- 3D scene color updates for stacks + towers
- Trees start screen green/forest redesign

### Phase 4 — Expand badges + test
- Update `badges.js` to full 21 badge set
- Full playthrough: library → hexes → easy → play → win → check history + badges
- Screenshot all hub views

---

## 7. Work already built (portal agent)

Files in `portal/src/` that are keepers (need minor updates):
- `App.css` — design tokens ✓, add Abstracts branding
- `data/games.js` — Material Symbols icons ✓
- `data/badges.js` — needs expansion to 21 badges
- `utils/storage.js` — good as-is
- `components/Header.jsx/.css` — rename Stratos→Abstracts
- `components/NavDrawer.jsx/.css` — good
- `components/BadgeToast.jsx/.css` — good
- `views/Library.jsx/.css` — remove difficulty picker from modal (difficulty now in-game)
- `views/MatchHistory.jsx/.css` — good
- `views/EloTrends.jsx/.css` — good
- `views/Badges.jsx/.css` — needs updated badge list
- `views/Profile.jsx/.css` — good

Files to replace:
- `components/GameFrame.jsx/.css` → replaced by `GameWrapper.jsx`
