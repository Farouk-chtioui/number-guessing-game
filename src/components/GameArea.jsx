import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, addDoc, getDoc, updateDoc, query, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

function GameArea({ gameState, onBackToLobby }) {  // Add onBackToLobby prop
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

  // Add activity tracking
  useEffect(() => {
    if (!game || !gameState.gameId) return;
    
    // Update player's last activity
    const activityInterval = setInterval(async () => {
      const gameDoc = doc(db, 'games', gameState.gameId);
      await updateDoc(gameDoc, {
        [`player${gameState.playerId}LastActive`]: Date.now()
      });
    }, 5000);

    // Check for opponent inactivity
    const inactivityCheck = setInterval(async () => {
      const gameDoc = doc(db, 'games', gameState.gameId);
      const gameSnap = await getDoc(gameDoc);
      const gameData = gameSnap.data();
      
      if (gameData.status === 'completed') return;

      const opponentId = gameState.playerId === 1 ? 2 : 1;
      const lastActive = gameData[`player${opponentId}LastActive`];
      
      if (lastActive && Date.now() - lastActive > 10000) {
        // Opponent inactive for more than 10 seconds
        await updateDoc(gameDoc, {
          winner: gameState.playerId,
          status: 'completed',
          endReason: 'opponent_inactive'
        });
      }
    }, 5000);

    return () => {
      clearInterval(activityInterval);
      clearInterval(inactivityCheck);
    };
  }, [game, gameState.gameId, gameState.playerId]);

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

  const validateGuess = (guess) => {
    if (!/^\d{4}$/.test(guess)) return false;
    const digits = new Set(guess.split(''));
    return digits.size === 4;
  };

  const handleSubmitGuess = async () => {
    if (currentTurn !== gameState.playerId) {
      alert("It's not your turn!");
      return;
    }

    if (!validateGuess(guess)) {
      alert('Please enter a valid 4-digit number with no repeating digits');
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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSubmitGuess();
    }
  };

  const handleBackToLobby = () => {
    onBackToLobby();
  };

  const handleCancelGame = async () => {
    try {
      if (gameState.lobbyId) {
        await deleteDoc(doc(db, 'lobbies', gameState.lobbyId));
      }
      if (gameState.gameId) {
        await deleteDoc(doc(db, 'games', gameState.gameId));
      }
      onBackToLobby();
    } catch (error) {
      console.error('Error canceling game:', error);
      alert('Error canceling game. Please try again.');
    }
  };

  if (!game) return <div>Loading...</div>;

  return (
    <div className="section">
      <div className="player-info">
        <span>{game.player1}</span> vs <span>{game.player2 || 'Waiting...'}</span>
      </div>
      <div className="player-number">
        Your number: <span className="secret-number">{gameState.secretNumber}</span>
      </div>
      
      {!game.player2 && (
        <div className="waiting-actions">
          <p>Waiting for opponent to join...</p>
          <button className="leave-button" onClick={handleCancelGame}>
            Cancel Game
          </button>
        </div>
      )}

      {game.winner && (
        <>
          <div className="winner-banner">
            {game.winner === gameState.playerId ? 'You won!' : 'Your opponent won!'}
          </div>
          <button className="back-button" onClick={handleBackToLobby}>
            Back to Lobby
          </button>
        </>
      )}

      {game.winner && game.endReason === 'opponent_inactive' && (
        <div className="winner-banner">
          You won! Opponent left the game.
        </div>
      )}

      {!game.winner && (
        <>
          <div className="turn-indicator">
            {currentTurn === gameState.playerId ? 
              "It's your turn!" : 
              "Waiting for opponent's move..."
            }
          </div>
          <div className="guess-area">
            <input
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              onKeyDown={handleKeyDown}
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
        </>
      )}

      <div className="history-container">
        <div className="history player1-history">
          <h3>{game.player1}'s Guesses</h3>
          {history
            .filter(g => g.player === 1)
            .sort((a, b) => b.timestamp - a.timestamp) // Sort in reverse chronological order
            .map((g, i) => (
              <div key={i} className="guess-item player-1">
                {g.guess} - {g.result}
              </div>
            ))}
        </div>
        <div className="history player2-history">
          <h3>{game.player2 || 'Player 2'}'s Guesses</h3>
          {history
            .filter(g => g.player === 2)
            .sort((a, b) => b.timestamp - a.timestamp) // Sort in reverse chronological order
            .map((g, i) => (
              <div key={i} className="guess-item player-2">
                {g.guess} - {g.result}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

export default GameArea;
