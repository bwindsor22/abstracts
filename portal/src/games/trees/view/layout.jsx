import React, { useState, useEffect } from 'react'
import Board from './board/Board'
import Inventory from './inventory'
import { observe, getBoardState } from './board/Game'

function App() {
  const [boardState, setBoardState] = useState({});
  const [piecesInInventory, setPiecesInInventory] = useState({});

  useEffect(() => {
    const unobserve = observe((newBoardState, newPiecesInInventory) => {
      setBoardState(newBoardState);
      setPiecesInInventory(newPiecesInInventory);
    });

    return () => {
      unobserve();
    };
  }, []);

  return (
    <div className="container">
      <div className="row">
        <div className="col-md-8">
          <Board boardState={boardState} />
        </div>
        <div className="col-md-4">
          <Inventory piecesInInventory={piecesInInventory} />
        </div>
      </div>
    </div>
  );
}

export default App;
