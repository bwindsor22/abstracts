import React, { useState, useEffect, useRef } from "react";
import Board from "./view/board/Board";
import Inventory from "./view/inventory/index";
import Available from "./view/available/index";
import CollectArea from "./view/board/CollectArea";
import Tutorial from "./view/Tutorial";
import StartScreen from "./view/StartScreen";
import { GameProvider, useGameState, COLOR_FILTERS } from "./view/board/GameContext";
import "./App.css";


// Color swatch shown next to the player label
const COLOR_SWATCHES = {
  green:  '#388e3c',
  blue:   '#1565c0',
  purple: '#6a1b9a',
  orange: '#e65100',
};

const GameContent = ({ playerColor, onResult, onBack, gameConfig }) => {
  const {
    boardState,
    piecesInInventory,
    piecesAvailable,
    inventoriesAll,
    availablesAll,
    lpAll,
    scoreAll,
    aiPlayers,
    lp,
    score,
    sunPosition,
    sunRevolutions,
    endPlayerTurn,
    lastLpGained,
    isSetupComplete,
    isGameOver,
    isFinalRound,
    resetGame,
    currentPlayer,
    aiThinking,
    difficulty,
    lastLpGainedAll,
    playerOrder,
    firstPlayer,
  } = useGameState();

  const resultReported = useRef(false);

  // Report result when game ends
  useEffect(() => {
    if (!isGameOver || resultReported.current) return;
    resultReported.current = true;
    const finalScoresCalc = Object.fromEntries(
      Object.keys(scoreAll).map(p => [p, (scoreAll[p] || 0) + Math.floor((lpAll[p] || 0) / 3)])
    );
    const p1Final = finalScoresCalc.p1 || 0;
    const maxScore = Math.max(...Object.values(finalScoresCalc));
    onResult?.({
      gameId: 'trees',
      gameName: 'Trees',
      won: p1Final >= maxScore,
      moves: sunRevolutions,
      difficulty: gameConfig?.difficulty || 'medium',
    });
  }, [isGameOver, onResult, scoreAll, lpAll, sunRevolutions, gameConfig]);

  const [showTutorial, setShowTutorial] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const isHumanTurn = currentPlayer === 'p1' && !aiThinking && isSetupComplete;
  const finalScores = Object.fromEntries(
    Object.keys(lpAll).map(p => [p, (scoreAll[p] || 0) + Math.floor((lpAll[p] || 0) / 3)])
  );
  const finalP1 = finalScores.p1 || 0;
  const swatch = COLOR_SWATCHES[playerColor] || COLOR_SWATCHES.green;

  return (
    <div className="trees-container">
      {showTutorial && <Tutorial onDone={() => setShowTutorial(false)} />}
      <div className="trees-row">
        <div className="trees-col-main">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <h2 style={{ margin: 0, color: '#f0eeff' }}>Game Board</h2>
            <button
              onClick={() => setShowTutorial(v => !v)}
              style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(56,142,60,0.3)', background: 'rgba(56,142,60,0.1)', cursor: 'pointer', color: 'rgba(240,238,255,0.7)', fontFamily: "'Space Grotesk', sans-serif" }}
            >? How to Play</button>
            <button
              onClick={() => setMenuOpen(true)}
              style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(240,238,255,0.2)', background: 'rgba(240,238,255,0.05)', cursor: 'pointer', color: 'rgba(240,238,255,0.7)', fontFamily: "'Space Grotesk', sans-serif" }}
            >MENU</button>
          </div>

          {/* Mobile-only top bar: End My Turn + LP */}
          <div className="mobile-only" style={{
            alignItems: 'center', gap: '8px', flexWrap: 'wrap',
            padding: '5px 6px', marginBottom: '6px',
            background: aiThinking ? 'rgba(153,66,240,0.08)' : 'rgba(45,122,71,0.15)',
            border: '1px solid rgba(45,122,71,0.3)', borderRadius: '8px',
          }}>
            <button
              onClick={endPlayerTurn}
              disabled={!isHumanTurn || isGameOver}
              style={{
                fontSize: '14px', fontWeight: 'bold',
                cursor: (!isHumanTurn || isGameOver) ? 'default' : 'pointer',
                background: 'transparent', border: 'none', padding: '0',
                opacity: (!isHumanTurn || isGameOver) ? 0.6 : 1,
                color: '#f0eeff',
              }}
            >
              {aiThinking ? 'AI thinking...' : 'End My Turn'}
            </button>
            <span style={{ fontSize: '12px', color: 'rgba(240,238,255,0.6)' }}>
              <strong>{lp}</strong> LP · <strong>{score}</strong> pts
            </span>
            <span style={{ fontSize: '12px', color: isFinalRound ? '#ff8a65' : 'rgba(240,238,255,0.4)', marginLeft: 'auto' }}>
              Sun {sunPosition + 1}/6 · Rev {sunRevolutions + 1}/3{isFinalRound ? ' · Final!' : ''}
            </span>
          </div>

          <div className="board-and-harvest">
            <div className="board-wrapper" style={{ flex: 1, minWidth: 0 }}>
              <Board boardState={boardState} />
            </div>
            <CollectArea />
          </div>

          {/* Mobile-only: Available directly below board */}
          <div className="mobile-only" style={{ flexDirection: 'column', marginTop: '6px' }}>
            <h5 style={{ marginBottom: '4px', fontSize: '13px', color: '#555' }}>Available</h5>
            <Available piecesAvailable={piecesAvailable} lp={lp} owner="p1" disabled={aiThinking || currentPlayer !== 'p1'} />
          </div>
        </div>

        <div className="trees-col-side">
          {/* Game over panel */}
          {isGameOver && (
            <div style={{
              background: 'rgba(26,11,46,0.9)', border: '2px solid rgba(153,66,240,0.4)', borderRadius: '10px',
              padding: '12px 16px', marginTop: '12px', marginBottom: '8px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f0eeff', marginBottom: '6px' }}>
                {finalP1 >= Math.max(...Object.values(finalScores)) ? 'You Win!' : 'AI Wins!'}
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(240,238,255,0.6)', marginBottom: '2px' }}>
                You: <strong>{score}</strong> pts + {Math.floor(lp / 3)} bonus = <strong>{finalP1}</strong>
              </div>
              {aiPlayers.map((p, i) => (
                <div key={p} style={{ fontSize: '13px', color: 'rgba(240,238,255,0.6)', marginBottom: i === aiPlayers.length - 1 ? '8px' : '2px' }}>
                  AI {i + 1}: <strong>{scoreAll[p] || 0}</strong> pts + {Math.floor((lpAll[p] || 0) / 3)} bonus = <strong>{finalScores[p] || 0}</strong>
                </div>
              ))}
              <button
                onClick={resetGame}
                style={{
                  fontSize: '13px', padding: '5px 16px', borderRadius: '8px',
                  border: 'none', background: '#9942f0', color: '#fff', cursor: 'pointer', fontWeight: 'bold',
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >Play Again</button>
            </div>
          )}

          {/* Final round banner */}
          {isFinalRound && !isGameOver && (
            <div style={{
              background: 'rgba(255,138,65,0.1)', border: '2px solid rgba(255,138,65,0.4)', borderRadius: '8px',
              padding: '8px 12px', marginTop: '12px', marginBottom: '8px', fontSize: '13px',
              color: '#ff8a65', fontWeight: 'bold', textAlign: 'center',
            }}>
              Final Round — everyone takes one last turn.
            </div>
          )}

          {/* Setup banner */}
          {!isSetupComplete && !isGameOver && (
            <div style={{
              background: 'rgba(45,122,71,0.1)', border: '1px solid rgba(45,122,71,0.3)', borderRadius: '8px',
              padding: '8px 12px', marginTop: '12px', marginBottom: '8px', fontSize: '13px', color: 'rgba(240,238,255,0.7)',
            }}>
              {aiThinking
                ? 'AI is placing its starting trees...'
                : <><strong>Setup:</strong> Place 2 small trees on the outer ring to begin.</>
              }
            </div>
          )}

          {/* Turn / sun controls (desktop only — mobile uses top bar above board) */}
          <div className="desktop-only" style={{ marginTop: '16px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <button
                onClick={endPlayerTurn}
                disabled={!isHumanTurn || isGameOver}
                style={{
                  fontSize: '15px',
                  cursor: (!isHumanTurn || isGameOver) ? 'default' : 'pointer',
                  background: aiThinking ? 'rgba(56,142,60,0.1)' : 'rgba(56,142,60,0.2)',
                  border: '1px solid rgba(56,142,60,0.5)',
                  borderRadius: '8px',
                  padding: '5px 16px',
                  fontWeight: 'bold',
                  color: '#f0eeff',
                  opacity: (!isHumanTurn || isGameOver) ? 0.5 : 1,
                }}
              >
                {aiThinking ? 'AI thinking...' : 'End My Turn'}
              </button>
              <span style={{ fontSize: '13px', color: isFinalRound ? '#ff9800' : 'rgba(240,238,255,0.5)' }}>
                Sun: {sunPosition + 1}/6 · Rev. {sunRevolutions + 1}/3{isFinalRound ? ' · Final!' : ''}
              </span>
              <span style={{
                fontSize: '11px', padding: '2px 7px', borderRadius: '4px',
                background: 'rgba(56,142,60,0.15)',
                color: 'rgba(240,238,255,0.7)',
                border: '1px solid rgba(56,142,60,0.3)', fontWeight: 'bold',
              }}>
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </span>
            </div>

            {/* Turn order indicator */}
            {isSetupComplete && (
              <div style={{ fontSize: '11px', color: 'rgba(240,238,255,0.4)', marginBottom: '4px' }}>
                <span style={{ marginRight: 4 }}>Order:</span>
                {playerOrder.map((p, i) => {
                  const label = p === 'p1' ? 'You' : `AI ${aiPlayers.indexOf(p) + 1}`;
                  const isFirst = i === 0;
                  return (
                    <span key={p}>
                      {i > 0 && <span style={{ color: 'rgba(240,238,255,0.25)', margin: '0 3px' }}>→</span>}
                      <span style={{ fontWeight: isFirst ? 'bold' : 'normal', color: isFirst ? '#66bb6a' : 'rgba(240,238,255,0.4)' }}>
                        {label}
                      </span>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Round summary */}
            {Object.keys(lastLpGainedAll).length > 0 && isSetupComplete && (
              <div style={{
                fontSize: '12px', color: 'rgba(240,238,255,0.6)', padding: '4px 8px',
                background: 'rgba(56,142,60,0.1)', borderRadius: '6px', border: '1px solid rgba(56,142,60,0.2)',
                marginBottom: '6px',
              }}>
                <span style={{ color: 'rgba(240,238,255,0.4)', marginRight: 6 }}>Last round:</span>
                <span style={{ color: '#66bb6a', marginRight: 6 }}>
                  You +{lastLpGainedAll.p1 || 0} LP
                </span>
                {aiPlayers.map((p, i) => (
                  <span key={p} style={{ color: 'rgba(240,238,255,0.5)', marginRight: 6 }}>
                    AI {i + 1} +{lastLpGainedAll[p] || 0} LP
                  </span>
                ))}
                <div style={{ marginTop: '3px', borderTop: '1px solid rgba(56,142,60,0.2)', paddingTop: '3px' }}>
                  <span style={{ color: 'rgba(240,238,255,0.4)', marginRight: 6 }}>Victory points:</span>
                  <span style={{ color: '#66bb6a', marginRight: 6 }}>
                    You <strong>{score}</strong>
                  </span>
                  {aiPlayers.map((p, i) => (
                    <span key={p} style={{ color: 'rgba(240,238,255,0.5)', marginRight: 6 }}>
                      AI {i + 1} <strong>{scoreAll[p] || 0}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Player 1 — human */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px',
              padding: '4px 8px', borderRadius: '6px',
              background: currentPlayer === 'p1' && !aiThinking ? 'rgba(56,142,60,0.15)' : 'transparent',
              border: currentPlayer === 'p1' && !aiThinking ? '1px solid rgba(102,187,106,0.4)' : '1px solid transparent',
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 'bold', fontSize: '14px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: swatch, display: 'inline-block' }} />
                You
                {firstPlayer === 'p1' && <span title="Goes first this revolution" style={{ fontSize: '11px', color: '#66bb6a' }}>1st</span>}
              </span>
              <span style={{ fontSize: '14px' }}>
                <strong>{lp}</strong> light points
                {lastLpGained !== null && lastLpGained > 0 && (
                  <span style={{ color: '#66bb6a', marginLeft: '4px' }}>+{lastLpGained}</span>
                )}
              </span>
              <span style={{ fontSize: '14px' }}><strong>{score}</strong> pts</span>
            </div>
            <h5 className="desktop-only" style={{ marginBottom: '4px', fontSize: '13px', color: 'rgba(240,238,255,0.5)' }}>Available</h5>
            <div className="desktop-only">
              <Available piecesAvailable={piecesAvailable} lp={lp} owner="p1" disabled={aiThinking || currentPlayer !== 'p1'} />
            </div>
            <h5 style={{ marginBottom: '4px', fontSize: '13px', color: 'rgba(240,238,255,0.5)' }}>Store</h5>
            <Inventory piecesInInventory={piecesInInventory} lp={lp} owner="p1" disabled={aiThinking || currentPlayer !== 'p1'} />
          </div>

          {/* AI players */}
          {aiPlayers.map((p, i) => {
            const aiLp = lpAll[p] || 0;
            const aiScore = scoreAll[p] || 0;
            const aiInv = inventoriesAll[p] || {};
            const aiAvail = availablesAll[p] || {};
            const isActive = currentPlayer === p && aiThinking;
            const aiColorOrder = ['blue', 'orange', 'purple', 'green'];
            const available = aiColorOrder.filter(c => c !== playerColor);
            const colorKey = available[i % available.length] || 'blue';
            return (
              <div key={p} style={{ marginBottom: '16px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px',
                  padding: '4px 8px', borderRadius: '6px',
                  background: isActive ? 'rgba(66,165,245,0.15)' : 'transparent',
                  border: isActive ? '1px solid rgba(66,165,245,0.4)' : '1px solid transparent',
                }}>
                  <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
                    AI {i + 1}
                    {firstPlayer === p && <span title="Goes first this revolution" style={{ fontSize: '11px', color: '#66bb6a' }}> 1st</span>}
                  </span>
                  <span style={{ fontSize: '14px' }}><strong>{aiLp}</strong> LP</span>
                  <span style={{ fontSize: '14px' }}><strong>{aiScore}</strong> pts</span>
                </div>
                <h5 style={{ marginBottom: '4px', fontSize: '13px', color: 'rgba(240,238,255,0.5)' }}>Available</h5>
                <Available piecesAvailable={aiAvail} lp={aiLp} owner={p} disabled={true} />
                <h5 style={{ marginBottom: '4px', fontSize: '13px', color: 'rgba(240,238,255,0.5)' }}>Store</h5>
                <Inventory piecesInInventory={aiInv} lp={aiLp} owner={p} disabled={true} />
              </div>
            );
          })}
        </div>
      </div>
      <div style={{
        marginTop: '32px',
        padding: '8px 12px',
        borderTop: '1px solid rgba(240,238,255,0.1)',
        fontSize: '10px',
        color: 'rgba(240,238,255,0.3)',
        textAlign: 'center',
        lineHeight: 1.5,
      }}>
        Our games are original digital implementations of classic abstract strategy mechanics. We are fans of the tabletop industry and encourage players to support the official physical releases of the games that inspired us.
      </div>
      {menuOpen && (
        <div onClick={() => setMenuOpen(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#1a0b2e', border: '1px solid rgba(240,238,255,0.15)', borderRadius: '12px',
            padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '200px',
          }}>
            <button onClick={() => setMenuOpen(false)} style={{
              padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(240,238,255,0.2)',
              background: 'transparent', color: '#f0eeff', cursor: 'pointer', fontSize: '14px',
            }}>Resume</button>
            <button onClick={() => { resetGame(); setMenuOpen(false); }} style={{
              padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(240,238,255,0.2)',
              background: 'transparent', color: '#f0eeff', cursor: 'pointer', fontSize: '14px',
            }}>New Game</button>
            {onBack && <button onClick={onBack} style={{
              padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(240,238,255,0.2)',
              background: 'transparent', color: '#f0eeff', cursor: 'pointer', fontSize: '14px',
            }}>Back to Library</button>}
          </div>
        </div>
      )}
    </div>
  );
};

const App = ({ onBack, onResult }) => {
  const [gameConfig, setGameConfig] = useState(null);

  if (!gameConfig) {
    return (
      <div className="game-trees">
        <StartScreen onStart={setGameConfig} onBack={onBack} />
      </div>
    );
  }

  return (
    <div className="game-trees">
      <GameProvider initialColor={gameConfig.color} initialDifficulty={gameConfig.difficulty} numAI={gameConfig.numAI} maxRevolutions={gameConfig.rounds || 3}>
        <GameContent playerColor={gameConfig.color} onResult={onResult} onBack={onBack} gameConfig={gameConfig} />
      </GameProvider>
    </div>
  );
};

export default App;
