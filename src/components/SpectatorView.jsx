import { useState, useEffect } from 'react';
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import GuessResult from './GuessResult';

function SpectatorView({ gameState, onBackToLobby }) {
  const [game, setGame] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const gameDoc = doc(db, 'games', gameState.gameId);
    const unsubscribe = onSnapshot(gameDoc, (snapshot) => {
      if (!snapshot.exists()) {
        onBackToLobby();
        return;
      }
      setGame(snapshot.data());
    });
    return () => unsubscribe();
  }, [gameState.gameId]);

  useEffect(() => {
    const guessesRef = collection(db, 'games', gameState.gameId, 'guesses');
    const q = query(guessesRef, orderBy('timestamp'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const guesses = [];
      snapshot.forEach((guessDoc) => {
        guesses.push(guessDoc.data());
      });
      setHistory(guesses);
    });
    return () => unsubscribe();
  }, [gameState.gameId]);

  if (!game) return <div className="loading-screen">Loading match…</div>;

  return (
    <div className="panel panel-pad">
      <div className="game-header">
        <div className="matchup">
          <h2>{game.player1} vs {game.player2 || 'waiting…'}</h2>
          <div className="meta-row">
            <span className="pill-live">Spectating</span>
            <span>{game.gameMode} mode</span>
          </div>
        </div>
      </div>

      <div className="history-grid" style={{ marginTop: 0, marginBottom: '1rem' }}>
        <div className="secret-card">
          <span>{game.player1}</span>
          <strong className="mono-input" style={{ letterSpacing: '0.18em' }}>{game.player1Number}</strong>
        </div>
        <div className="secret-card">
          <span>{game.player2 || 'Player 2'}</span>
          <strong className="mono-input" style={{ letterSpacing: '0.18em' }}>{game.player2Number || '••••'}</strong>
        </div>
      </div>

      <div className={`turn-banner ${game.winner ? '' : 'is-you'}`}>
        {game.winner
          ? `Winner: ${game.winner === 1 ? game.player1 : game.player2}`
          : `Current turn: ${game.currentTurn === 1 ? game.player1 : game.player2}`}
      </div>

      <div className="history-grid">
        <div className="history-col">
          <h3><span className="swatch p1" /> {game.player1}</h3>
          {history.filter((g) => g.player === 1).length === 0 ? (
            <p className="empty-state">No guesses yet</p>
          ) : (
            history
              .filter((g) => g.player === 1)
              .sort((a, b) => b.timestamp - a.timestamp)
              .map((g, i) => (
                <div key={`${g.timestamp}-${i}`} className="guess-item player-1">
                  <span>{g.guess}</span>
                  <GuessResult result={g.result} />
                </div>
              ))
          )}
        </div>
        <div className="history-col">
          <h3><span className="swatch p2" /> {game.player2 || 'Player 2'}</h3>
          {history.filter((g) => g.player === 2).length === 0 ? (
            <p className="empty-state">No guesses yet</p>
          ) : (
            history
              .filter((g) => g.player === 2)
              .sort((a, b) => b.timestamp - a.timestamp)
              .map((g, i) => (
                <div key={`${g.timestamp}-${i}`} className="guess-item player-2">
                  <span>{g.guess}</span>
                  <GuessResult result={g.result} />
                </div>
              ))
          )}
        </div>
      </div>

      <div className="game-controls">
        <button type="button" onClick={onBackToLobby} className="btn-ghost">
          Back to lobby
        </button>
      </div>
    </div>
  );
}

export default SpectatorView;
