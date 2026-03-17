Omweso
Equipment
A board with 4 rows × 8 pits (32 pits total).
64 seeds.
Players sit opposite each other and control the two rows closest to them.
Opponent
o o o o o o o o
o o o o o o o o
x x x x x x x x
x x x x x x x x
You
Setup
Place 2 seeds in every pit.
Each player owns the two rows on their side of the board.
Objective
Win by capturing all of your opponent’s seeds or leaving them unable to move.
Turn
Choose one of your pits containing 2 or more seeds.
Pick up all seeds from that pit.
Sow counter-clockwise, placing one seed in each pit.
Relay sowing
If the last seed lands in a pit that now contains more than one seed, pick up all seeds in that pit and continue sowing.
Your turn ends only when the last seed lands in a pit that now contains exactly one seed.
Capture rule
A capture occurs if:
the last seed lands in your inner row (the row closer to the center), and
the opposite pit in your opponent’s inner row contains seeds.
When this happens:
Capture the seeds in the opposite pit.
Remove them from the board.
Place them aside.
Your turn then ends immediately.
Legal moves
You must choose a pit that:
contains at least two seeds, and
is on your side of the board.
End of game
The game ends when a player cannot make a legal move.
The opponent wins.
Key properties
Feature	Omweso
Board	4×8
Relay sowing	yes
Capture from inner row	yes
Capture chains	no
Houses	no
Forced capture	no


1. Game State
Define every piece of information needed to represent the game.
Include:
board geometry
pieces or tokens
player ownership
turn state
score or capture areas
endgame conditions
Example:
GameState:
- board: array[4][8] of integer seed counts
- currentPlayer: Player
- capturedSeeds[player]: integer
2. Initial Setup
Specify exactly how the starting position is created.
Include:
number of pieces
placement rules
starting player
Example:
Initialize board with 2 seeds in each pit.
Player A moves first.
3. Legal Move Definition
Define precisely what constitutes a legal move.
Include:
which pieces can be selected
any constraints
forced move rules
Example:
A player may choose any pit on their side containing ≥2 seeds.
4. Move Execution
Define step-by-step state transitions.
Break moves into deterministic stages.
Example structure:
executeMove(pit):
  seeds = removeSeeds(pit)
  while seeds > 0:
      pit = nextPit(pit)
      addSeed(pit)
      seeds -= 1
Avoid vague descriptions like “continue sowing as normal.”
5. Special Rules
Define all conditional mechanics separately.
Examples:
captures
relay moves
forced captures
directional choices
house mechanics
Each rule must specify:
trigger condition
exact state change
whether the turn continues
6. Turn Termination
Specify exactly when a turn ends.
Example:
Turn ends when the final seed lands in a pit containing exactly one seed.
7. Endgame Condition
Define how the game ends and how the winner is determined.
Example:
Game ends when a player has no legal moves.
Opponent wins.
Formatting Requirements
The LLM should:
avoid narrative explanations
prefer bullet points or pseudocode
avoid historical or cultural descriptions
explicitly define all edge cases
Additional Constraints
The rules must satisfy:
Determinism
Every game state must have clearly defined legal moves.
Completeness
No rule may rely on assumed knowledge.
State locality
All mechanics must be expressible from the current game state.
No hidden rules
Every rule affecting gameplay must be explicitly written.
Optional Output Format
Ask the LLM to output:
GameState
InitializeGame()
GetLegalMoves(state)
ExecuteMove(state, move)
CheckEndgame(state)
This structure maps directly to most board-game engines.