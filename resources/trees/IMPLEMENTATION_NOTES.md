# Trees-Game Implementation Notes

A single-player prototype of Photosynthesis implemented in React with react-dnd.

## Architecture

- **Game.js** — pure game logic module. Exports `canMovePiece`, `movePiece`, `getDropHint`, `clearTurnActions`, and a listener system (`addChangeListener`). No React imports. All state is module-level.
- **GameContext.js** — React context wrapping Game.js. Drives re-renders on state changes, computes derived state (shadow sets, LP scores per tree, setup completion).
- **Board.jsx** — hex grid renderer. Uses a 7-column flex layout where each cell is `width: calc(100% / 7)` so all cells are equal size regardless of row length.
- **BoardSquare.jsx** — individual droppable cell with `useDrop`. Shows drag-over overlays and an invalid-move tooltip.
- **CollectArea.jsx** — off-board drop target to harvest large trees (costs 4 LP, yields 22 pts).

## Coordinate System

Doubled coordinates: x and y are both even or both odd on the same hex. Center is (0,0). Board spans x ∈ [-6,6], y ∈ [-3,3].

```js
function hexDistance(x1, y1, x2, y2) {
  const dx = Math.abs(x2 - x1)
  const dy = Math.abs(y2 - y1)
  return Math.max(dy, (dx + dy) / 2)
}
```

Outer ring: cells where `hexDistance(x, y, 0, 0) === 3`.

Shadow directions (6 sun positions, doubled-coord step vectors):
```js
const SHADOW_DIRS = [
  [1, 1], [2, 0], [1, -1], [-1, -1], [-2, 0], [-1, 1]
]
```

## Hex Board CSS

Each row is a flex container with `width: 100%` and `box-sizing: content-box` (the default). A leading spacer `<div>` offsets shorter rows. Because the row's content box equals the board width, `calc(100% / 7)` on cells always resolves to `board_width / 7` regardless of the spacer.

```js
// Spacer widths per row type (0=top/bottom, 1, 2, 3=center)
// type 0: calc(3 * 100% / 14)  — 4 cells, indent 1.5 cells
// type 1: calc(100% / 7)       — 5 cells, indent 1 cell
// type 2: calc(100% / 14)      — 6 cells, indent 0.5 cells
// type 3: none                 — 7 cells, no indent
```

**Critical:** do NOT use `box-sizing: border-box` on rows when using `paddingLeft` for offsets — that makes `100%` resolve to the reduced content-box width and cells become different sizes per row. Use spacer elements instead.

## Inventory / Store

13 slots (positions 0–12), arranged in 4 rows by piece size:
- Seeds (0–3): buy cost 1 LP each
- Small trees (4–7): buy costs 2/2/3/3 LP
- Medium trees (8–10): buy costs 3/3/4 LP
- Large trees (11–12): buy costs 4/5 LP

`findOpenSlotForType(type)` returns the rightmost (highest-index) empty slot in that type's range — matching the rulebook's "topmost available space" rule.

## Movement Rules

| From | To | LP cost |
|---|---|---|
| Inventory | Available | slot cost (buy) |
| Inventory | Board | slot cost + move cost |
| Available | Board | move cost (1/1/2/3 for seed/small/med/large) |
| Board (large) | CollectArea | 4 LP |
| Board → Board | — | not allowed |

Seed placement requires at least one friendly tree within range (small=1, med=2, large=3 hexes).

Growing: dragging a piece onto a board square that holds the next smaller size is valid. The replaced piece returns to inventory (rightmost open slot for its type).

Per-turn: each board square can only be grown into once per turn (`squaresGrownThisTurn` set, cleared in `clearTurnActions()`).

## Setup Phase

First 2 small trees must be placed on the outer ring (`hexDistance === 3`). `isSetupComplete` becomes true after `setupTreesPlaced >= 2`.

## Shadow Logic (two modes)

- **Visual shadows** (`computeVisualShadows`): all squares in any tree's shadow path get darkened — for display.
- **LP shadows** (`computeLPShadows`): only squares where a tree is blocked by a same-or-larger caster — for scoring.

Each non-shadowed tree earns LP equal to its size (seed=1, small=1, med=2, large=3) on Next Turn. `lastTurnScores` holds per-square LP so Board can show `+N` badges.
