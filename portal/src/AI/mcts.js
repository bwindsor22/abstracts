// mcts.js — Shared Monte Carlo Tree Search engine
// Pluggable interface: pass in game-specific functions
//
// Required interface:
//   getLegalMoves(state) → array of moves
//   applyMove(state, move) → new state
//   isTerminal(state) → boolean
//   getResult(state, player) → number (-1, 0, +1)
//   getCurrentPlayer(state) → player identifier
//
// Optional:
//   evaluate(state, player) → number in [-1, 1] for leaf evaluation (default: random rollout)

class MCTSNode {
  constructor(state, parent = null, move = null) {
    this.state = state;
    this.parent = parent;
    this.move = move;
    this.children = [];
    this.visits = 0;
    this.wins = 0;
    this.untriedMoves = null; // lazy init
  }
}

const EXPLORATION = 1.41; // sqrt(2)

function ucb1(node, parentVisits) {
  if (node.visits === 0) return Infinity;
  return (node.wins / node.visits) + EXPLORATION * Math.sqrt(Math.log(parentVisits) / node.visits);
}

function bestChild(node) {
  let best = null, bestScore = -Infinity;
  for (const child of node.children) {
    const score = ucb1(child, node.visits);
    if (score > bestScore) { bestScore = score; best = child; }
  }
  return best;
}

function randomRollout(state, rootPlayer, game) {
  let s = state;
  let depth = 0;
  const maxDepth = 200;
  while (!game.isTerminal(s) && depth < maxDepth) {
    const moves = game.getLegalMoves(s);
    if (moves.length === 0) break;
    s = game.applyMove(s, moves[Math.floor(Math.random() * moves.length)]);
    depth++;
  }
  return game.getResult(s, rootPlayer);
}

/**
 * Run MCTS and return the best move.
 * @param {object} state - current game state
 * @param {object} game - interface object with getLegalMoves, applyMove, isTerminal, getResult, getCurrentPlayer
 * @param {object} options - { iterations, timeLimit, useEval }
 *   iterations: max number of iterations (default 1000)
 *   timeLimit: max ms to run (default Infinity)
 *   useEval: if true and game.evaluate exists, use it instead of rollout
 */
export function mctsSearch(state, game, options = {}) {
  const { iterations = 1000, timeLimit = Infinity, useEval = false } = options;
  const rootPlayer = game.getCurrentPlayer(state);
  const root = new MCTSNode(state);
  root.untriedMoves = game.getLegalMoves(state);

  if (root.untriedMoves.length === 0) return null;
  if (root.untriedMoves.length === 1) return root.untriedMoves[0];

  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    if (performance.now() - start > timeLimit) break;

    // 1. Selection — walk down tree using UCB1
    let node = root;
    while (node.untriedMoves !== null && node.untriedMoves.length === 0 && node.children.length > 0) {
      node = bestChild(node);
    }

    // 2. Expansion — if there are untried moves, expand one
    if (node.untriedMoves === null) {
      node.untriedMoves = game.isTerminal(node.state) ? [] : game.getLegalMoves(node.state);
    }
    if (node.untriedMoves.length > 0) {
      const idx = Math.floor(Math.random() * node.untriedMoves.length);
      const move = node.untriedMoves[idx];
      node.untriedMoves.splice(idx, 1);
      const childState = game.applyMove(node.state, move);
      const child = new MCTSNode(childState, node, move);
      child.untriedMoves = game.isTerminal(childState) ? [] : game.getLegalMoves(childState);
      node.children.push(child);
      node = child;
    }

    // 3. Simulation / Evaluation
    let result;
    if (game.isTerminal(node.state)) {
      result = game.getResult(node.state, rootPlayer);
    } else if (useEval && game.evaluate) {
      result = game.evaluate(node.state, rootPlayer);
    } else {
      result = randomRollout(node.state, rootPlayer, game);
    }

    // 4. Backpropagation
    let n = node;
    while (n !== null) {
      n.visits++;
      n.wins += result;
      n = n.parent;
    }
  }

  // Pick child with most visits (most robust)
  let bestMove = null, bestVisits = -1;
  for (const child of root.children) {
    if (child.visits > bestVisits) {
      bestVisits = child.visits;
      bestMove = child.move;
    }
  }
  return bestMove;
}
