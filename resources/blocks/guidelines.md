# Blokus (Blocks) — Game Guidelines

## Overview
- **Players:** 2 (in our implementation: human vs AI, each controlling 2 colors)
- **Board:** 20×20 square grid
- **Pieces:** 21 polyomino pieces per color (1-square through 5-square), 4 colors total
- **Objective:** Place as many squares on the board as possible

## Piece Set (per color — 21 pieces)
- 1× monomino (1 square)
- 1× domino (2 squares)
- 2× trominoes (3 squares): I-shape, L-shape
- 5× tetrominoes (4 squares): I, O, T, S, L shapes
- 12× pentominoes (5 squares): F, I, L, N, P, T, U, V, W, X, Y, Z shapes

## Rules

### Setup
- Each player takes 2 colors (human: blue+red, AI: yellow+green)
- Turn order: blue → yellow → red → green (alternating between players)

### Placement Rules
1. **First piece** of each color must cover that color's corner square
   - Blue: top-left (0,0), Yellow: top-right (0,19), Red: bottom-right (19,19), Green: bottom-left (19,0)
2. **Subsequent pieces** must touch at least one piece of the same color **diagonally** (corner-to-corner)
3. Pieces of the same color may **never** touch along an edge (side-to-side)
4. Pieces of different colors may touch in any way (edges or corners)
5. Pieces may be rotated and flipped before placement
6. Once placed, pieces cannot be moved

### Passing & End
- If a player cannot place any piece, that color passes
- Game ends when no color can place any more pieces

## Scoring
- **Basic:** Count remaining squares. Lowest total wins.
- **Advanced:** Each remaining square = -1 point. All pieces placed = +15 bonus. Last piece was the monomino = +5 extra bonus.

## Two-Player Adaptation
- Human controls blue + red, AI controls yellow + green
- Combined score across both colors determines winner

## Key Strategic Concepts (from video analysis)
- Place large pieces early (5-square pieces are hardest to fit later)
- Expand toward the center to maximize territory
- Block opponent's diagonal connections to limit their expansion
- Save the monomino for last (bonus points + easiest to fit)
- Corner connections are your lifeline — protect and multiply them

## Implementation Notes
- For our portal: 2-player mode (human vs AI), each controlling 2 colors
- Pieces need rotation (0°, 90°, 180°, 270°) and flip support
- AI difficulty levels: easy (random valid), medium (greedy), hard (minimax)
- All 21 piece shapes must be precisely defined as coordinate arrays
