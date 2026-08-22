import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, addDoc, getDoc, updateDoc, query, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import SpectatorView from './SpectatorView';
import GameNotepad from './GameNotepad';
import { clearGameNotes } from '../notesStorage';
import GuessResult from './GuessResult';
import DigitPad from './DigitPad';

function DigitRow({ value, size = 'guess', caretIndex = -1 }) {
  const digits = String(value || '').padEnd(4, ' ').slice(0, 4).split('');

  return (
    <div className="digit-row" aria-hidden="true">
      {digits.map((digit, index) => (
        <span
          key={index}
          className={`digit-slot ${size === 'secret' ? 'is-secret' : ''} ${digit.trim() ? '' : 'is-empty'} ${caretIndex === index ? 'is-caret' : ''}`}
        >
          {digit.trim() ? digit : '·'}
        </span>
      ))}
    </div>
  );
}

function GameArea({ gameState, onBackToLobby }) {
  if (gameState.playerId === 'spectator') {
    return <SpectatorView gameState={gameState} onBackToLobby={onBackToLobby} />;
  }

  return <PlayerGameArea gameState={gameState} onBackToLobby={onBackToLobby} />;
}

function PlayerGameArea({ gameState, onBackToLobby }) {
  const [guess, setGuess] = useState('');
  const [game, setGame] = useState(null);
  const [history, setHistory] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const gameDoc = doc(db, 'games', gameState.gameId);
    const unsubscribe = onSnapshot(gameDoc, (snapshot) => {
      if (!snapshot.exists()) {
        onBackToLobby();
        return;
      }
      const gameData = snapshot.data();
      setGame(gameData);
      setCurrentTurn(gameData?.currentTurn || gameData?.firstTurn);
    });

    return () => unsubscribe();
  }, [gameState.gameId]);

  useEffect(() => {
    if (!gameState.gameId) return undefined;

    const bumpActivity = async () => {
      try {
        await updateDoc(doc(db, 'games', gameState.gameId), { lastActive: Date.now() });
        if (gameState.lobbyId) {
          await updateDoc(doc(db, 'lobbies', gameState.lobbyId), { lastActive: Date.now() });
        }
      } catch {
        // game may already have been removed
      }
    };

    bumpActivity();
    const interval = setInterval(bumpActivity, 30 * 1000);
    return () => clearInterval(interval);
  }, [gameState.gameId, gameState.lobbyId]);

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

  const checkGuess = (guessValue, actual) => {
    let bulls = 0;
    let cows = 0;

    for (let i = 0; i < 4; i++) {
      if (guessValue[i] === actual[i]) {
        bulls++;
      } else if (actual.includes(guessValue[i])) {
        cows++;
      }
    }

    return `${bulls}T ${cows}V`;
  };

  const validateGuess = (guessValue) => {
    if (!/^\d{4}$/.test(guessValue)) return false;
    const digits = new Set(guessValue.split(''));
    return digits.size === 4;
  };

  const leaveToLobby = () => {
    clearGameNotes(gameState.gameId, gameState.playerId);
    onBackToLobby();
  };

  const handleSubmitGuess = async (nextGuess) => {
    const guessValue = typeof nextGuess === 'string' ? nextGuess : guess;

    if (game.gameMode === 'classic' && currentTurn !== gameState.playerId) {
      alert("It's not your turn!");
      return;
    }

    if (!validateGuess(guessValue)) {
      alert('Please enter a valid 4-digit number with no repeating digits');
      return;
    }

    try {
      const gameDoc = doc(db, 'games', gameState.gameId);
      const gameData = (await getDoc(gameDoc)).data();

      if (gameData.winner) {
        alert('Game is already over!');
        return;
      }

      await updateDoc(gameDoc, {
        lastActive: Date.now()
      });

      const opponentNumber = gameState.playerId === 1 ? gameData.player2Number : gameData.player1Number;
      const result = checkGuess(guessValue, opponentNumber);

      const guessesRef = collection(db, 'games', gameState.gameId, 'guesses');
      await addDoc(guessesRef, {
        player: gameState.playerId,
        guess: guessValue,
        result,
        timestamp: Date.now()
      });

      if (result === '4T 0V') {
        await updateDoc(gameDoc, {
          winner: gameState.playerId,
          status: 'completed'
        });
      } else if (game.gameMode === 'classic') {
        await updateDoc(gameDoc, {
          currentTurn: gameState.playerId === 1 ? 2 : 1
        });
      }

      setGuess('');
    } catch (error) {
      console.error('Error submitting guess:', error);
      alert('Error submitting guess. Please try again.');
    }
  };

  const handleCancelGame = async () => {
    try {
      if (gameState.lobbyId) {
        await deleteDoc(doc(db, 'lobbies', gameState.lobbyId));
      }
      if (gameState.gameId) {
        await deleteDoc(doc(db, 'games', gameState.gameId));
      }
      leaveToLobby();
    } catch (error) {
      console.error('Error canceling game:', error);
      alert('Error canceling game. Please try again.');
    }
  };

  const handleLeaveGame = async () => {
    try {
      if (gameState.gameId) {
        const gameDoc = doc(db, 'games', gameState.gameId);
        const gameData = (await getDoc(gameDoc)).data();

        if (gameData && gameData.status !== 'completed') {
          const otherPlayerId = gameState.playerId === 1 ? 2 : 1;
          await updateDoc(gameDoc, {
            winner: otherPlayerId,
            status: 'completed',
            endReason: 'player_left'
          });
        }
      }
      leaveToLobby();
    } catch (error) {
      console.error('Error leaving game:', error);
      alert('Error leaving game. Please try again.');
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(gameState.privateKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      alert(gameState.privateKey);
    }
  };

  if (!game) return <div className="loading-screen">Loading match…</div>;

  const waitingForOpponent = !game.player2;
  const isYourTurn = game.gameMode !== 'classic' || currentTurn === gameState.playerId;
  const canGuess = !game.winner && !waitingForOpponent && isYourTurn;

  return (
    <div className="game-layout">
      <div className="panel panel-pad">
        {gameState.privateKey && waitingForOpponent && (
          <div className="code-row">
            <div>
              <span className="meta-row">Private game code</span>
              <div><code>{gameState.privateKey}</code></div>
            </div>
            <button type="button" className="btn-ghost btn-sm" onClick={copyCode}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}

        <div className="game-header">
          <div className="matchup">
            <h2>{game.player1} vs {game.player2 || 'waiting…'}</h2>
            <div className="meta-row">
              <span>{game.gameMode} mode</span>
              <span>•</span>
              <span>T = right place · V = wrong place</span>
            </div>
          </div>
          <div className="secret-card">
            <span>Your number</span>
            <DigitRow value={gameState.secretNumber} size="secret" />
          </div>
        </div>

        {game.winner && (
          <div className={`winner-banner ${game.winner === gameState.playerId ? '' : 'is-loss'}`}>
            {game.winner === gameState.playerId
              ? 'You cracked it'
              : game.endReason === 'player_left'
                ? 'Opponent left the match'
                : 'Your opponent won'}
          </div>
        )}

        {!game.winner && (
          <div className={`turn-banner ${canGuess ? 'is-you' : ''}`}>
            {waitingForOpponent
              ? 'Waiting for an opponent to join'
              : game.gameMode === 'classic'
                ? (currentTurn === gameState.playerId ? 'Your turn — lock in a guess' : "Waiting for your opponent")
                : 'Rapid mode — guess whenever you are ready'}
          </div>
        )}

        {!game.winner && !waitingForOpponent && (
          <div className="guess-board">
            <DigitPad
              value={guess}
              onChange={setGuess}
              disabled={!canGuess}
              onSubmit={handleSubmitGuess}
              submitLabel="Submit guess"
              autoFocus={canGuess}
            />
            <div className="legend">Click the pad or type. Four boxes, one number.</div>
          </div>
        )}

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
          {!game.winner && waitingForOpponent && (
            <button type="button" onClick={handleCancelGame} className="btn-ghost">
              Cancel lobby
            </button>
          )}
          {!game.winner && !waitingForOpponent && (
            <button type="button" onClick={handleLeaveGame} className="btn-danger">
              Leave game
            </button>
          )}
          {game.winner && (
            <button type="button" onClick={leaveToLobby} className="btn-ghost">
              Back to lobby
            </button>
          )}
        </div>
      </div>

      <GameNotepad
        gameId={gameState.gameId}
        playerId={gameState.playerId}
        canGuess={canGuess}
        onUseGuess={setGuess}
        onSubmitGuess={handleSubmitGuess}
      />
    </div>
  );
}

export default GameArea;
