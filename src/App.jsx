import { useState, useEffect } from 'react';
import GameSetup from './components/GameSetup';
import GameArea from './components/GameArea';
import Lobby from './components/Lobby';
import { doc, updateDoc, getDocs, collection, query, where, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import './App.css';
import ThemeToggle from './components/ThemeToggle';

function App() {
  const [gameState, setGameState] = useState(() => {
    // Try to restore game state from localStorage
    const savedState = localStorage.getItem('gameState');
    if (savedState) {
      return JSON.parse(savedState);
    }
    return {
      isPlaying: false,
      inLobby: true,
      gameId: null,
      lobbyId: null,
      playerId: null,
      playerName: '',
      secretNumber: ''
    };
  });

  // Save game state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('gameState', JSON.stringify(gameState));
  }, [gameState]);

  // Verify game state is still valid on reload
  useEffect(() => {
    const verifyGameState = async () => {
      if (gameState.gameId) {
        try {
          const gameDoc = doc(db, 'games', gameState.gameId);
          const gameSnap = await getDoc(gameDoc);
          
          if (!gameSnap.exists()) {
            // Game no longer exists, reset to lobby
            handleBackToLobby();
            return;
          }

          const gameData = gameSnap.data();
          if (gameData.status === 'completed') {
            // Game is already over
            handleBackToLobby();
            return;
          }

          // Update last active timestamp
          await updateDoc(gameDoc, {
            [`player${gameState.playerId}LastActive`]: Date.now()
          });
        } catch (error) {
          console.error('Error verifying game state:', error);
          handleBackToLobby();
        }
      }
    };

    verifyGameState();
  }, []);

  const handleJoinGame = async (lobby) => {
    if (lobby.status !== 'waiting') {
      alert('This game is no longer available');
      return;
    }

    const playerName = prompt('Enter your name:');
    if (!playerName) return;

    const secretNumber = prompt('Enter your 4-digit number (no repeating digits):');
    if (!secretNumber || !/^\d{4}$/.test(secretNumber) || new Set(secretNumber).size !== 4) {
      alert('Please enter a valid 4-digit number with no repeating digits');
      return;
    }

    try {
      // Find the game associated with this lobby
      const gamesRef = collection(db, 'games');
      const q = query(gamesRef, where('lobbyId', '==', lobby.id));
      const gameSnap = await getDocs(q);
      
      if (gameSnap.empty) {
        throw new Error('Game not found');
      }

      const gameDoc = gameSnap.docs[0];
      const gameData = gameDoc.data();

      if (gameData.status !== 'waiting') {
        throw new Error('Game is no longer available');
      }

      // Update game with player 2 info
      await updateDoc(doc(db, 'games', gameDoc.id), {
        player2: playerName,
        player2Number: secretNumber,
        status: 'playing'
      });

      // Update lobby status
      await updateDoc(doc(db, 'lobbies', lobby.id), {
        status: 'playing',
        player2: playerName
      });

      setGameState({
        isPlaying: true,
        inLobby: false,
        gameId: gameDoc.id,
        lobbyId: lobby.id,
        playerId: 2,
        playerName,
        secretNumber
      });
    } catch (error) {
      console.error('Error joining game:', error);
      alert(error.message || 'Error joining game. Please try again.');
    }
  };

  const handleBackToLobby = () => {
    // Clear saved game state
    localStorage.removeItem('gameState');
    setGameState({
      isPlaying: false,
      inLobby: true,
      gameId: null,
      lobbyId: null,
      playerId: null,
      playerName: '',
      secretNumber: ''
    });
  };

  const handleLeaveLobby = async (lobbyId, gameId) => {
    try {
      if (lobbyId) {
        const lobbyDoc = doc(db, 'lobbies', lobbyId);
        await deleteDoc(lobbyDoc);
      }
      if (gameId) {
        const gameDoc = doc(db, 'games', gameId);
        await deleteDoc(gameDoc);
      }
      handleBackToLobby();
    } catch (error) {
      console.error('Error leaving lobby:', error);
      alert('Error leaving lobby. Please try again.');
    }
  };

  return (
    <div className="container">
      <ThemeToggle />
      <h1>Number Guessing Game</h1>
      {!gameState.isPlaying && gameState.inLobby && (
        <>
          <GameSetup setGameState={setGameState} onLeaveLobby={handleLeaveLobby} />
          <Lobby onJoinGame={handleJoinGame} />
        </>
      )}
      {gameState.isPlaying && <GameArea gameState={gameState} onBackToLobby={handleBackToLobby} />}
    </div>
  );
}

export default App;
