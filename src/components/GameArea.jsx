import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, addDoc, getDoc, updateDoc, query, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import SpectatorView from './SpectatorView';

function GameArea({ gameState, onBackToLobby }) {  // Add onBackToLobby prop
  // Return SpectatorView for spectators
  if (gameState.playerId === 'spectator') {
    return <SpectatorView gameState={gameState} onBackToLobby={onBackToLobby} />;
  }

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

  // Remove the activity tracking useEffect entirely

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
    // Allow guessing in rapid mode without turn restrictions
    if (game.gameMode === 'classic' && currentTurn !== gameState.playerId) {
      alert("It's not your turn!");
      return;
    }

    if (!validateGuess(guess)) {
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

      // Update last active timestamp
      await updateDoc(gameDoc, {
        lastActive: Date.now()
      });

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
        // Only switch turns in classic mode
        if (game.gameMode === 'classic' && result !== '4T 0V') {
          await updateDoc(gameDoc, {
            currentTurn: gameState.playerId === 1 ? 2 : 1
          });
        }
      }

      setGuess('');
    } catch (error) {
      console.error('Error submitting guess:', error);
      alert('Error submitting guess. Please try again.');
    }
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

  const handleLeaveGame = async () => {
    try {
      if (gameState.gameId) {
        const gameDoc = doc(db, 'games', gameState.gameId);
        const gameData = (await getDoc(gameDoc)).data();
        
        // Update game to show other player as winner if game is still active
        if (gameData && gameData.status !== 'completed') {
          const otherPlayerId = gameState.playerId === 1 ? 2 : 1;
          await updateDoc(gameDoc, {
            winner: otherPlayerId,
            status: 'completed',
            endReason: 'player_left'
          });
        }
      }
      onBackToLobby();
    } catch (error) {
      console.error('Error leaving game:', error);
      alert('Error leaving game. Please try again.');
    }
  };

  if (!game) return <div>Loading...</div>;

  return (
    <div className="section max-w-4xl mx-auto p-6">
      {/* Private key display */}
      {gameState.privateKey && !game.player2 && !isSpectator && (
        <div className="bg-blue-50 dark:bg-blue-900/50 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-blue-700 dark:text-blue-300 mb-2">
            Private Game Code
          </h3>
          <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded">
            <code className="font-mono text-lg text-blue-600 dark:text-blue-400">
              {gameState.privateKey}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(gameState.privateKey);
                alert('Code copied!');
              }}
              className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900 rounded"
            >
              📋
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">{game?.player1} vs {game?.player2 || 'Waiting...'}</h2>
            {isSpectator && (
              <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200
                             px-3 py-1 rounded-full text-sm font-medium">
                Spectating
              </span>
            )}
          </div>
          
          {!isSpectator && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
              <span className="text-gray-600 dark:text-gray-300">Your number: </span>
              <span className="font-mono font-bold text-lg">{gameState.secretNumber}</span>
            </div>
          )}
        </div>

        {!game.winner && !isSpectator && (
          <div className="p-6 bg-gray-50 dark:bg-slate-700/50">
            <div className="mb-4 text-center font-medium">
              {game.gameMode === 'classic' ? (
                currentTurn === gameState.playerId ? 
                  "🎲 It's your turn!" : 
                  "⌛ Waiting for opponent's move..."
              ) : (
                "⚡ Rapid Mode - Make your guess!"
              )}
            </div>
            
            <div className="flex gap-4">
              <input
                type="text"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={4}
                placeholder="Enter your guess"
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 
                         dark:border-gray-600 focus:border-blue-500 
                         dark:focus:border-blue-400 focus:ring-2 
                         focus:ring-blue-500/20"
                disabled={game.gameMode === 'classic' && 
                         currentTurn !== gameState.playerId || game.winner}
              />
              <button 
                onClick={handleSubmitGuess}
                disabled={game.gameMode === 'classic' && 
                         currentTurn !== gameState.playerId || game.winner}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg 
                         hover:bg-blue-600 disabled:opacity-50 
                         disabled:cursor-not-allowed transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Winner banner */}
      {game.winner && (
        <div className="winner-banner mb-6">
          {game.winner === gameState.playerId ? 'You won!' : 
           game.endReason === 'player_left' ? 'Opponent left the game' : 
           'Your opponent won!'}
        </div>
      )}

      {/* Game history */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

      {/* Game controls */}
      <div className="mt-6 flex justify-center gap-4">
        {!isSpectator && !game.winner && (
          <button 
            onClick={handleLeaveGame}
            className="px-6 py-2 bg-red-500 text-white rounded-lg 
                     hover:bg-red-600 transition-colors"
          >
            Leave Game
          </button>
        )}
        {(game.winner || isSpectator) && (
          <button 
            onClick={handleBackToLobby}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg 
                     hover:bg-gray-600 transition-colors"
          >
            Back to Lobby
          </button>
        )}
      </div>
    </div>
  );
}

export default GameArea;
