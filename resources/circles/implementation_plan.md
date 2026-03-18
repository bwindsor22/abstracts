# YINSH — Implementation Plan

_Generated from generic-game-plan.md + rulebook_

# YINSH — Concrete Implementation Plan

## Board & Coordinate System Overview

YINSH is played on a hexagonal grid shaped like a truncated six-pointed star. The board has **85 intersection points** arranged on a triangular (axial) grid. Movement is along **6 straight-line directions** (axial hex directions). We'll use **axial coordinates (q, r)** internally, converting to pixel positions for rendering via SVG.

---

## Phase 1 — Game Pieces

**Goal:** All three piece types are visually represented and distinguishable.

### Piece Types

| Piece | Owner | Visual |
|---|---|---|
| **Ring** | White or Black | Large hollow circle (~36px diameter), thick stroke in owner's color (white stroke on dark bg / black stroke). Interior is transparent so you can see markers beneath. |
| **Marker (White-up)** | Neutral (pool) | Solid filled circle (~22px diameter), white fill, thin black outline. |
| **Marker (Black-up)** | Neutral (pool) | Solid filled circle (~22px diameter), black fill, thin white outline. |
| **Scored Ring** (removed ring displayed on side panel) | White or Black | Small ring icon (~20px), same styling as board ring, displayed in the score track. |

### Visual Details

- Rings are rendered as SVG `<circle>` with `fill="none"`, `stroke="#f5f5f5"` (white player) or `stroke="#1a1a1a"` (black player), `strokeWidth="5"`, `r="18"`.
- Markers are SVG `<circle>` with `fill="#f5f5f5"` or `fill="#1a1a1a"`, `r="11"`, and a contrasting `stroke` of width 1.5.
- When a ring occupies the same space as a marker (the moment after placement, before the ring moves), the ring is rendered on top of the marker — the transparent ring interior lets the marker color show through.
- A **"ghost ring"** (dashed stroke, 50% opacity) is shown on valid destination spaces during a move to guide the player.
- **Valid move dots** (small semi-transparent circles, ~6px radius) are shown on legal landing spaces when a ring is selected.

### Data Model

```js
// Marker
{ type: 'marker', colorUp: 'white' | 'black' }

// Ring
{ type: 'ring', owner: 'white' | 'black' }

// Board cell (each of 85 intersections)
{
  q: Number,       // axial column
  r: Number,       // axial row
  piece: null | Marker | Ring
}

// Game state
{
  phase: 'setup' | 'play' | 'resolveRows' | 'end',
  currentPlayer: 'white' | 'black',
  board: Map<'q,r', CellContent>,   // sparse; empty cells absent
  ringsOnBoard: { white: Set<'q,r'>, black: Set<'q,r'> },
  ringsRemoved: { white: Number, black: Number },  // 0–3
  markersPool: Number,               // starts at 51
  setupRingsPlaced: { white: Number, black: Number },
  selectedRing: 'q,r' | null,        // ring chosen to move this turn
  markerJustPlaced: 'q,r' | null,    // the marker placed in the ring before move
  pendingRows: { white: Array<Array<'q,r'>>, black: Array<Array<'q,r'>> },
  resolvingPlayer: 'white' | 'black' | null,
  winner: 'white' | 'black' | null,
}
```

### Review Checkpoint
Render all pieces (white ring, black ring, white-up marker, black-up marker, scored ring icon) side by side in a static demo component. Confirm color contrast, size hierarchy, and distinctiveness before Phase 2.

---

## Phase 2 — Game Board

**Goal:** The 85-node YINSH board is correctly laid out as an SVG hex grid.

### Board Geometry

YINSH uses a **truncated hexagonal star** board. The canonical approach is to define all 85 valid axial `(q, r)` coordinates explicitly (or compute them from the known shape) and render them as SVG circles connected by lines.

**Axial coordinate system:**
- Six movement directions: `(+1,0), (-1,0), (0,+1), (0,-1), (+1,-1), (-1,+1)`
- The board spans roughly q ∈ [-4, 4], r ∈ [-4, 4], with corners clipped to form the star shape.
- We will **hard-code the set of 85 valid coordinates** as a JS constant `VALID_CELLS: Set<string>` where each entry is `"q,r"`. This eliminates any shape-computation bugs.

**Pixel mapping (axial → screen):**
```
x = cellSize * (q + r * 0.5)
y = cellSize * (r * Math.sqrt(3) / 2)
```
with `cellSize ≈ 54px`. The entire board SVG will be approximately `560×560px`, centered in its container.

### Board Rendering

- SVG `<line>` elements drawn between all pairs of adjacent valid cells along each of the 6 axial directions — these form the movement lines.
- SVG `<circle>` elements at each of the 85 valid coordinates with `r="8"`, `fill="#c8a96e"` (board color), `stroke="#8b6914"` — these are the intersection nodes.
- The board background is a dark brownish or deep green felt color (`#2d5016` or `#3b2a1a`) to provide contrast with both white and black pieces.
- Board is **not** a grid of squares — it is a pure SVG, centered inside a `div` that constrains it to 560px max-width, scaling down on narrower screens via `viewBox`.

### Score Track

- Two vertical columns flanking the board, one per player.
- Each column has 3 ring-shaped slots. When a player scores (removes a ring), a scaled-down ring icon appears in the next slot.
- White's column on the left, Black's on the right (matching the rulebook orientation).

### Static Placement (Review)

Hard-code a few rings and markers at specific coordinates to verify pixel positions and overlap behavior.

### Review Checkpoint
Screenshot showing the full 85-node board with grid lines, with 2–3 sample pieces placed. Confirm the star shape matches the YINSH rulebook diagram exactly before Phase 3.

---

## Phase 3 — Game Logic

**Goal:** All rules are enforced; a complete game can be played from setup to victory.

### Sub-phase 3.1 — Initial Setup

- `phase = 'setup'`
- Players alternate placing one ring at a time on any empty intersection (no restrictions on which cell).
- White places first.
- After 5 rings each (10 total) are placed, `phase` transitions to `'play'`.
- Track progress with `setupRingsPlaced: { white: 0..5, black: 0..5 }`.
- During setup, clicking any empty valid cell places the current player's next ring there.

### Sub-phase 3.2 — Valid Move Calculation

**This is the most complex part of YINSH.** All move validation is performed by `getValidMoves(state, ringCoord)` which returns an array of valid destination coordinates.

#### Ring Movement Rules (exact)

From a selected ring at position `P`, trace each of the 6 axial directions:

```
For each direction D in [(+1,0),(-1,0),(0,+1),(0,-1),(+1,-1),(-1,+1)]:
  phase = 'vacant'   // starts in vacant-traversal mode
  jumpedMarkers = []
  cursor = P + D

  while cursor is a VALID_CELL:
    cell = board[cursor]

    if cell is a Ring:
      break  // cannot jump over rings; stop this direction entirely

    if cell is empty:
      if phase == 'vacant':
        add cursor to validDestinations  // can stop on vacant spaces before markers
      else:  // phase == 'jump'
        add cursor to validDestinations  // first vacant space after the marker block
        break  // MUST stop here; cannot continue after jumping markers
      cursor += D

    if cell is a Marker:
      phase = 'jump'  // entered marker block
      jumpedMarkers.push(cursor)
      cursor += D
      // continue without adding to destinations
```

**⚠️ Tricky rule:** A ring *can* move over vacant spaces and *then* jump markers, but once it has jumped at least one marker it *must* stop at the first vacant space after the last marker. It cannot continue to another vacant space.

**⚠️ Tricky rule:** A ring cannot land on a cell occupied by any piece (ring or marker). The destination must be empty.

**⚠️ Tricky rule:** A ring cannot jump over other rings — if a ring is in the path, that direction is terminated.

**⚠️ Edge case:** If all of a player's rings are completely blocked (no legal destinations in any direction for any ring), the player passes. This is extremely rare but must be handled: check all rings before ending the turn; if `allValidMoves.length === 0`, display "No legal moves — passing turn."

### Sub-phase 3.3 — Move Execution

`executeMove(state, fromCoord, toCoord)`:

1. Verify `toCoord` is in `getValidMoves(state, fromCoord)`.
2. Place a marker (color = currentPlayer, face-up) at `fromCoord`. Remove the ring from `fromCoord`.
3. Identify all cells between `fromCoord` and `toCoord` along the direction of travel. These are the **jumped cells** — only the marker cells (not vacant ones before them) are flipped.
4. Flip each jumped marker: `colorUp = (colorUp === 'white') ? 'black' : 'white'`.
5. Place the ring at `toCoord`.
6. Decrement `markersPool` by 1.
7. Call `detectRows(state)` to find any 5-in-a-row sequences.
8. If rows are detected → `phase = 'resolveRows'`, populate `pendingRows`.
9. Otherwise → advance turn (`currentPlayer` flips, check for marker exhaustion).

**Computing jumped cells:**
```js
function getJumpedMarkers(board, from, to) {
  const dir = normalizeDirection(subtract(to, from));
  let cursor = add(from, dir);
  const jumped = [];
  while (!coordEqual(cursor, to)) {
    if (board.get(coordKey(cursor))?.type === 'marker') {
      jumped.push(coordKey(cursor));
    }
    cursor = add(cursor, dir);
  }
  return jumped;
}
```

### Sub-phase 3.4 — Row Detection

`detectRows(state)` scans all 3 axial directions across all 85 cells for runs of 5+ consecutive same-color markers.

```js
const DIRECTIONS = [[1,0],[0,1],[1,-1]];  // only 3; opposite covered by scanning both ways
for each direction D:
  for each valid starting cell C (not yet visited in this direction):
    walk D collecting consecutive same-color markers
    if run.length >= 5:
      record all sub-runs of exactly 5 (player chooses which 5 if length > 5)
```

**⚠️ Tricky: rows of more than 5.** If a run is 6 or 7 markers long, the player must choose any 5 contiguous subset. Present the player with a selection UI (highlight the run, let them click the first or last marker to determine which 5 are selected).

**⚠️ Tricky: two intersecting rows.** If two 5-in-a-row sequences share a marker, the player may only remove one (their choice). After removal, re-check — the other row is broken. Remove 1 ring.

**⚠️ Tricky: two non-intersecting rows in one move.** Both must be removed. Remove 2 rings.

**⚠️ Tricky: opponent rows created by your move.** After the current player resolves their rows (if any), check whether the opponent now has rows. If so, `resolvingPlayer` switches to the opponent before their turn begins.

**Resolution order (exact):**
1. Current player resolves all their own rows (one at a time if multiple).
2. Opponent resolves any rows created for them.
3. Turn advances to opponent.

### Sub-phase 3.5 — Row Resolution UI

When `phase === 'resolveRows'`:
- Highlight all markers in the pending row(s) for `resolvingPlayer`.
- If multiple rows: highlight each separately; player clicks a highlighted row to select it for removal.
- If a single row of exactly 5: auto-confirm or single click to remove.
- If a row of 6+: show a slider or end-marker selector.
- After removing markers: add them back to `markersPool`.
- Prompt player to click one of their rings on the board to remove it.
- After ring removal: increment `ringsRemoved[resolvingPlayer]`.
- Check win condition.

### Sub-phase 3.6 — Turn Management

```
Turn order:
  Setup phase:  white → black → white → ... until 10 rings placed
  Play phase:   alternate white/black each full turn
  resolveRows:  resolvingPlayer handles their rows; then opponent handles theirs (if any); then turn advances

Special: if currentPlayer has no legal moves → pass (do not advance turn? No — pass means skip to opponent).
```

### Sub-phase 3.7 — Win / Loss / Draw Conditions

**Win:** `ringsRemoved[player] === 3` → that player wins. Display winner banner.

**⚠️ Simultaneous third row:** If a single move causes both players to reach 3 rings removed simultaneously (current player forms their own third row and creates the opponent's third row), the **current player wins** (they resolve their row first).

**Marker exhaustion:** If `markersPool === 0` AND no rows are pending:
- Winner = player with more `ringsRemoved`.
- If equal → draw.

**Score display:** Show `ringsRemoved[white]` / 3 and `ringsRemoved[black]` / 3 as the live score (3 ring slots per player in the side panel).

### Sub-phase 3.8 — Blitz Variant

A toggle in the UI. When active, `WIN_RINGS_NEEDED = 1` instead of 3. All other rules identical.

---

## Phase 4 — Instructions Panel

**Goal:** A persistent right-side panel updates every game state change.

### States and Messages

| Game State | Panel Message |
|---|---|
| Setup, White's turn | "**Setup — White's turn.** Click any empty intersection to place White Ring (X of 5 placed)." |
| Setup, Black's turn | "**Setup — Black's turn.** Click any empty intersection to place Black Ring (X of 5 placed)." |
| Play, select ring | "**White's turn.** Click one of your rings to select it." |
| Play, ring selected | "**White's turn.** Ring selected at (q,r). Click a highlighted destination to move it." |
| resolveRows, own rows | "**White: remove your row.** Click a highlighted row of 5 to remove it, then click one of your rings to score it." |
| resolveRows, remove ring | "**White: remove a ring.** Click any of your rings on the board to score it." |
| resolveRows, opponent rows | "**Black: remove your row** (created by White's move). Click a highlighted row of 5 to remove it, then click one of your rings to score it." |
| Pass (blocked) | "**White has no legal moves** — passing turn." |
| End game | "**White wins!** (or Black wins! / Draw) White scored X rings, Black scored Y rings." |

- Panel also shows a **score summary** at all times: two ring-slot indicators, one per player, showing how many rings each has scored (filled ring icon per score).
- Panel has a **current player indicator** (colored dot matching player color).

---

## Phase 5 — Reset Button

**Goal:** One click returns to the initial empty-board state.

- Button labeled **"New Game"**, always visible above or below the instructions panel.
- Resets all state to: `phase='setup'`, empty board, full marker pool (51), `ringsRemoved={white:0,black:0}`, `setupRingsPlaced={white:0,black:0}`, `currentPlayer='white'`, all selections cleared.
- Does not reload the page.
- If Blitz mode or AI mode are active, they remain at their current setting (only board state resets).

---

## Phase 6 — Sandbox Mode

**Goal:** A toggle lets the user freely manipulate the board, bypassing all rules.

- Toggle labeled **"Sandbox Mode"** (switch/checkbox), visible in the control panel.
- When **ON**:
  - All rings and markers on the board are draggable to any valid cell (any of the 85 intersections).
  - Right-clicking a cell cycles through: empty → white ring → black ring → white-up marker → black-up marker → empty.
  - Turn enforcement, row detection, and win condition checks are all **disabled**.
  - The instructions panel shows: "**Sandbox Mode** — freely arrange pieces. Rules are suspended."
- When **OFF**: game state is restored exactly as it was before sandbox was toggled on (snapshot the state object before entering sandbox mode and restore it on exit).
- Sandbox does not affect the New Game button.

---

## Phase 7 — Adversarial AI

**Goal:** A computer opponent plays Black (or White) using a heuristic minimax search.

### Architecture

- AI code lives in `src/AI/ai.js` exclusively.
- `applyMove(state, move)` is a **pure function** that deep-clones state, applies the move, and returns new state — no mutation of module-level state.
- AI triggers via `setTimeout(aiTurn, 400)` after the human ends their turn, giving visual feedback time.
- A **"AI thinking…"** spinner overlays the board and disables all interaction while computing.

### Move Representation

```js
// Setup move
{ type: 'placeRing', coord: 'q,r' }

// Play move  
{ type: 'moveRing', from: 'q,r', to: 'q,r' }

// Resolution moves (AI auto-resolves during lookahead)
{ type: 'removeRow', cells: ['q,r',...], ringToRemove: 'q,r' }
```

### Heuristic Evaluation Function

`evaluate(state, aiPlayer)` returns a numeric score (higher = better for AI). Components:

| Feature | Weight | Rationale |
|---|---|---|
| `ringsRemoved[ai] - ringsRemoved[human]` | +1000 per ring | Primary objective |
| `ringsRemoved[ai] === 3` | +100000 | Win state |
| `ringsRemoved[human] === 3` | -100000 | Loss state |
| Longest same-color marker run for AI | +15 per marker in run | Proximity to forming a row |
| Longest same-color marker run for human | -20 per marker in run | Opponent threat (weighted higher = more defensive) |
| Number of markers of AI color on board | +2 per marker | Board presence |
| Number of markers of human color on board | -2 per marker | Opponent board presence |
| Ring mobility: total valid destinations across all AI rings | +1 per destination | Flexible rings are better |
| Markers near board center (Manhattan distance ≤ 2) | +1 per AI marker, -1 per human marker | Central control |
| `markersPool < 10` (endgame) | Bonus +50 if `ringsRemoved[ai] > ringsRemoved[human]` | Lead preservation in endgame |

**⚠️ Key strategic insight for AI:** Removing a ring weakens you (fewer moves). The AI should not eagerly form rows when doing so would drop it below an effective minimum ring count. Weight the ring-removal bonus carefully — forming a second row is less valuable than it looks if the AI only has 2 rings left.

**⚠️ Strategic asymmetry:** The AI should play more defensively at 2 rings scored (on the verge of winning but exposed), and more aggressively when the human has 2 rings scored.

### Search

```js
function minimax(state, depth, alpha, beta, maximizing, aiPlayer) {
  if (depth === 0 || isGameOver(state)) return evaluate(state, aiPlayer);
  const moves = getAllLegalMoves(state, maximizing ? aiPlayer : opponent(aiPlayer));
  // alpha-beta pruning
  ...
}
```

- **Easy:** depth 1 (greedy, picks best immediate move).
- **Medium:** depth 2 (one full ply of lookahead).
- **Hard:** depth 3 with alpha-beta pruning. Move ordering: try moves that create markers near existing runs first.

### AI Resolution of Rows

During `applyMove`, when the AI's move creates rows:
- AI automatically selects the **row that gives the opponent the fewest new opportunities** (greedy sub-choice).
- AI selects the ring to remove that is **least mobile** (lowest valid destination count), preserving its most flexible rings.
- If the move creates an opponent row, the opponent also resolves greedily in the same `applyMove` call so lookahead sees the full consequences.

### Startup Screen

- Before mounting the game, a startup screen collects:
  - **Play vs Human** or **Play vs AI**
  - If AI: **difficulty** (Easy / Medium / Hard)
  - **Player color** (White = goes first, Black = goes second)
- These are passed as props to `GameProvider`.
- Difficulty is locked once setup begins (label grays out, tooltip: "Reset game to change difficulty").

### AI Setup Phase

- When it is the AI's turn to place a ring during setup, `useEffect` fires after `currentPlayer` changes to the AI's color during `phase === 'setup'`.
- AI placement strategy: place rings to maximize coverage of distinct lines (prefer coordinates that lie on many long lines), avoid clustering.
- After all 10 rings are placed (`phase` transitions to `'play'`), AI takes its first move automatically.

### Tricky Implementation Notes for AI

1. **Row resolution inside `applyMove`** — Must fully resolve all pending rows (both players) inside `applyMove` before returning the new state, so that the heuristic evaluates the true resulting position, not an intermediate one.
2. **Infinite loop guard** — If `applyMove` triggers row resolution which triggers another row resolution (chain), cap at 10 iterations.
3. **Stale closure in async callback** — Use `useRef` to hold `state` and read `.current` inside the `setTimeout` callback, not the closed-over value.
4. **Pass detection** — `getAllLegalMoves` must check for the blocked-ring edge case and return a `[{type:'pass'}]` move in that case so minimax doesn't infinite-loop on zero moves.

---

## Complexity Notes

| Concern | Difficulty | Notes |
|---|---|---|
| Computing all 85 valid coordinates | Low | Hard-code them from the rulebook diagram |
| Ring movement with jump/vacant rules | **High** | The "vacant then jump, must stop after markers" rule has subtle edge cases |
| Row detection (5+ in a line) | Medium | Straightforward scan; complexity in 6+ length and intersection handling |
| Multiple simultaneous rows | **High** | Intersecting vs non-intersecting, own vs opponent, resolution order |
| AI speed at depth 3 | **High** | YINSH has ~5 rings × many destinations = up to 50+ moves per ply; alpha-beta essential |
| Marker flipping visual animation | Low–Medium | CSS transition on `fill` color change; optional but improves UX |

---

## Files & Structure

```
yinsh/
├── index.html
├── src/
│   ├── App.jsx                  # Startup screen → Game