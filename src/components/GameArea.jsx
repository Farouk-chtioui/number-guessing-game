import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, addDoc, getDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

function GameArea({ gameState }) {
  const [guess, setGuess] = useState('');
  const [game, setGame] = useState(null);
  const [history, setHistory] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(null);

  useEffect(() => {
    const gameDoc = doc(db, 'games', gameState.gameId);
    const unsubscribe = onSnapshot(gameDoc, (snapshot) => {
      const gameData = snapshot.data();
      setGame(gameData);
      setCurrentTurn(gameData.currentTurn || gameData.firstTurn);
    });

    return () => unsubscribe();
  }, [gameState.gameId]);

  useEffect(() => {
    const guessesRef = collection(db, 'games', gameState.gameId, 'guesses');
    const q = query(guessesRef, orderBy('timestamp'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const guesses = [];
      snapshot.forEach((doc) => {
        guesses.push(doc.data());
      });
      setHistory(guesses);
    });

    return () => unsubscribe();
  }, [gameState.gameId]);

  const checkGuess = (guess, actual) => {
    let bulls = 0;
    let cows = 0;
    
    for (let i = 0; i < 4; i++) {
      if (guess[i] === actual[i]) {
        bulls++;
      } else if (actual.includes(guess[i])) {
        cows++;
      }
    }
    
    return `${bulls}T ${cows}V`;
  };

  const handleSubmitGuess = async () => {
    if (currentTurn !== gameState.playerId) {
      alert("It's not your turn!");
      return;
    }

    if (!/^\d{4}$/.test(guess)) {
      alert('Please enter a valid 4-digit number');
      return;
    }

    const gameDoc = doc(db, 'games', gameState.gameId);
    const gameSnap = await getDoc(gameDoc);
    const gameData = gameSnap.data();

    if (gameData.winner) {
      alert('Game is already over!');
      return;
    }

    const opponentNumber = gameState.playerId === 1 ? gameData.player2Number : gameData.player1Number;
    const result = checkGuess(guess, opponentNumber);

    const guessesRef = collection(db, 'games', gameState.gameId, 'guesses');
    await addDoc(guessesRef, {
      player: gameState.playerId,
      guess,
      result,
      timestamp: Date.now()
    });

    // Check if this guess wins the game
    if (result === '4T 0V') {
      await updateDoc(gameDoc, {
        winner: gameState.playerId,
        status: 'completed'
      });
    } else {
      // Switch turns
      await updateDoc(gameDoc, {
        currentTurn: gameState.playerId === 1 ? 2 : 1
      });
    }

    setGuess('');
  };

  if (!game) return <div>Loading...</div>;

  return (
    <div className="section">
      <div className="player-info">
        <span>{game.player1}</span> vs <span>{game.player2 || 'Waiting...'}</span>
      </div>
      {game.winner && (
        <div className="winner-banner">
          {game.winner === gameState.playerId ? 'You won!' : 'Your opponent won!'}
        </div>
      )}
      <div className="turn-indicator">
        {!game.winner && (
          currentTurn === gameState.playerId ? 
            "It's your turn!" : 
            "Waiting for opponent's move..."
        )}
      </div>
      <div className="guess-area">
        <input
          type="text"
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          maxLength={4}
          placeholder="Enter your guess"
          disabled={currentTurn !== gameState.playerId || game.winner}
        />
        <button 
          onClick={handleSubmitGuess}
          disabled={currentTurn !== gameState.playerId || game.winner}
        >
          Submit Guess
        </button>
      </div>
      <div className="history">
        {history.map((g, i) => (
          <div key={i} className={`guess-item player-${g.player}`}>
            Player {g.player}: {g.guess} - {g.result}
          </div>
        ))}
      </div>
    </div>
  );
}

export default GameArea;
