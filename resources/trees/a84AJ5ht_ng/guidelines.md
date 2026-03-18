# Photosynthesis — Play Guidelines

---

## Setup — Board Layout, Piece Placement, Starting Conditions

### Board
- Place the game board in the center of the play area.
- Place the **Sun piece** on the board at the designated **Sun dot starting position** (one of six fixed positions around the board's edge).
- Place **round tokens** in a stack ordered **highest value on top, lowest on bottom**.
  - In a **2-player game**, remove the **#4 round token** (used only in advanced rules).
- Separate **scoring tokens** into four stacks by their leaf-count backs: **1, 2, 3, and 4 leaves**.
  - Each stack is ordered **highest point value on top, lowest on bottom** (face-down side shows leaf count).
  - In a **2-player game**, remove all **darkest-color scoring tokens** entirely from the game.

### Player Boards (per player)
- Each player takes one **player board** matching their color.
  - In a **2-player game**, return the other two boards to the box.
- Each player collects all **trees and seed tokens** matching their board color.
- Place pieces on the player board in their designated column spaces:
  - **2 large trees** in the large-tree column.
  - **3 medium trees** in the medium-tree column.
  - **4 small trees** in the small-tree column.
  - **4 seed tokens** in the seed column.
- All **leftover pieces** (not placed on the board) remain beside the player board in the **available area**.
- Each player takes one **light token** and places it on the **zero space** of the light track.

### Starting Tree Placement
- The **youngest player** receives the **first-player token** (or choose randomly).
- Starting with the first player and proceeding **clockwise**, each player places **one small tree** from their available area onto any **empty outside-edge space** of the board.
- Repeat this process once more so that every player has placed a total of **two small trees** on the board.
- Trees placed during setup are taken from the player's **available area** (not purchased).

### Post-Setup State
- Each player has exactly **2 small trees on the board** and **0 light points**.
- The Sun piece is at the designated starting position.
- The game is ready to begin **Round 1**.

---

## Turn Structure — Exactly What a Player Does on Their Turn, in Order

### Round Structure Overview
Each round consists of **two sequential phases**:
1. **Photosynthesis Phase**
2. **Life Cycle Phase**

---

### Phase 1: Photosynthesis Phase

**Step 1 — Move the Sun (skip on Round 1 only)**
- Move the Sun piece **one step clockwise** to the next of the six positions.
- This step is **skipped during Round 1 of the entire game only**; the Sun does not move, but light is still collected.

**Step 2 — Determine Shade**
- Sunshine travels **in straight lines** from the Sun piece across the board in the direction indicated by the Sun's arrows.
- Each tree on the board casts a **shadow** in the direction the light travels, for a number of spaces equal to its size:
  - **Seed:** casts no shadow.
  - **Small tree:** casts shadow **1 space**.
  - **Medium tree:** casts shadow **2 spaces**.
  - **Large tree:** casts shadow **3 spaces**.
- A tree is **blocked** (receives no light points) if:
  - Another tree's shadow reaches its space, **AND**
  - The blocking tree is **equal to or greater in height** than the blocked tree.
- A tree is **not blocked** if it is **taller** than the tree casting the shadow on it.
- A blocked tree **still casts its own shadow** normally; shadow chains apply.
- **Seed tokens on the board never collect light points**, regardless of shade.

**Step 3 — Collect Light Points**
- Each player gains light points for each **unblocked tree** they own on the board:
  - **Small tree:** +1 light point.
  - **Medium tree:** +2 light points.
  - **Large tree:** +3 light points.
- Add newly earned points to any previously stored points and advance the **light token** on the light track.
- **Maximum light points a player can hold at any time: 20.** Any points beyond 20 are permanently lost.

---

### Phase 2: Life Cycle Phase

**Step 1 — Player Turns**
- Starting with the player holding the **first-player token** and proceeding **clockwise**, each player takes a **full turn** before the next player begins.

**Step 2 — A Single Player's Turn**
- On their turn, a player may perform **any number of actions**, in **any order**, as many times as they can afford.
- The constraint: **no single board space may be targeted by more than one action within the same turn** (see Valid Moves and Key Rules for full details).
- After a player has finished all desired actions, their turn ends.

**Step 3 — End of Phase / End of Round**
- After all players have taken their Life Cycle turn, pass the **first-player token** to the next player in clockwise order.
- Begin a new round starting with Phase 1.

---

### End-of-Revolution Check
- After completing any round in which the Sun would **return to the starting Sun dot position** at the beginning of the next round:
  - **Remove one round token** from the stack as a marker of completed revolutions.
  - If this removal empties the stack (i.e., the last token is removed), **the game ends immediately** after that round is fully completed.
- The game lasts exactly **3 full Sun revolutions = 18 rounds total**.

---

## Valid Moves — Precise Conditions for Each Move Type

All actions cost **light points**. A player must be able to pay the full cost before taking an action. The four action types are:

---

### Action 1: Buy
**Purpose:** Move a piece from the player board into the available area so it can be used in other actions.

**Cost:** The light point value shown on the player board next to the bottom-most piece in the target column.

**Conditions:**
- The player pays the cost shown on the **player board** adjacent to the bottom-most available piece in a column (seed, small, medium, or large).
- The bought piece is moved from the **player board** to the player's **available area**.
- Buying does **not** target a board space; it is not subject to the "one activation per space per turn" rule.
- A player may buy from multiple columns in the same turn.

**Cost reference (from the player board columns, bottom-most piece):**
- Seed: as shown on board (typically cheapest tier).
- Small tree: as shown.
- Medium tree: as shown (e.g., 3 light points).
- Large tree: as shown.

---

### Action 2: Plant a Seed
**Purpose:** Place a seed token from the available area onto the main board.

**Cost:** 1 light point.

**Conditions:**
- The player must have at least one **seed token in their available area**.
- The player selects **one of their trees already on the main board** as the source.
- The seed is placed on an **empty space** of the main board within a distance from the source tree based on its size:
  - **Small tree:** up to **1 space** away.
  - **Medium tree:** up to **2 spaces** away.
  - **Large tree:** up to **3 spaces** away.
- Distance is counted in **board steps** and does **not** need to be in a straight line.
- **Intervening pieces (trees or seeds, own or opponent's) do NOT block** the path to the target space; only the target space itself must be empty.
- **Both the source tree's space and the target space are activated** by this action; neither may be targeted again by any action this same turn.

---

### Action 3: Grow
**Purpose:** Advance a piece on the main board to the next growth stage.

**Cost:** The light point value shown on the player board to the right of the piece's **current stage**.
- **Seed → Small tree:** cost as shown (e.g., 1 light point).
- **Small → Medium tree:** cost as shown (e.g., 2 light points).
- **Medium → Large tree:** cost as shown (e.g., 3 light points).

**Conditions:**
- The piece to be grown must already be **on the main board**.
- The **replacement piece** (next size up) must be in the player's **available area**. If the required piece is not in the available area, this action cannot be taken.
- Growing is **one stage at a time only**. A player cannot pay a combined cost to skip a stage.
- After growing:
  - The replaced piece (old stage) is returned to the **highest available (topmost empty) space** in its column on the player board.
  - If no space is available on the player board for the returned piece, it is **removed from the game** (returned to the box).
- The space on the main board that was grown is **activated**; it cannot be targeted again this turn.

---

### Action 4: Collect (Harvest a Large Tree)
**Purpose:** Remove a large tree from the board to earn a scoring token.

**Cost:** 4 light points.

**Conditions:**
- The target piece must be a **large (tall) tree** owned by the player and currently on the main board.
- After paying the cost:
  - The large tree is removed from the main board and returned to the player board at the **topmost empty space** in the large-tree column.
  - The player takes the **scoring token from the top of the stack** corresponding to the **number of leaves shown on the board space** where the tree was collected:
    - Space showing 1 leaf → take from **1-leaf stack**.
    - Space showing 2 leaves → take from **2-leaf stack**.
    - Space showing 3 leaves → take from **3-leaf stack**.
    - Space showing 4 leaves → take from **4-leaf stack** (or 3-leaf stack in 2-player game — see Key Rules).
  - If the appropriate stack is **empty**, take from the **next lowest available stack**.
  - If **all lower stacks are also empty**, the player gains **no scoring token** for this action.
- The collected space is **activated**; it cannot be targeted again this turn.

---

## Win Condition — How the Game Ends and Who Wins

### Game End Trigger
- The game ends at the conclusion of the **round in which the final round token is removed** from the stack.
- This occurs after the **third full revolution** of the Sun (18 rounds total).
- The game ends at the **end of that round** (after all players complete their Life Cycle turns), not mid-round.

### Scoring
1. **Scoring tokens:** Total the **point values** printed on all collected scoring tokens.
2. **Light point bonus:** Gain additional points based on the row your **light point token** is in at the end of the game, as shown on the light track (e.g., token in a given row = 3 bonus points in the example given).

### Determining the Winner
- The player with the **highest combined score** (scoring tokens + light point bonus) wins.

### Tiebreakers
1. **First tiebreaker:** The tied player with the **most seeds and trees remaining on the main board** wins.
2. **Second tiebreaker:** If still tied, the tied players **share the victory**.

---

## Key Rules — Special Rules, Edge Cases, and Common Mistakes

### One Activation Per Space Per Turn
- During the **Life Cycle Phase**, each space on the main board may be **targeted by at most one action per turn**.
- "Targeting" includes both the **source** and the **destination** of an action:
  - Planting a seed activates both the **source tree's space** and the **destination space**.
  - Growing activates the **space of the grown piece**.
  - Collecting activates the **space of the collected tree**.
- A space that has been activated **cannot** be the target of any subsequent action in that same turn, regardless of action type.
- **Common mistake:** Planting a seed and then attempting to grow that seed in the same turn — the destination space was already activated by the plant action.

### Available Area vs. Player Board
- The **player board** holds pieces that have not yet been purchased.
- The **available area** holds pieces that have been purchased and are