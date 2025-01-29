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
    try {
      const { joiningPlayer } = lobby;
      
      // First, find the game associated with this lobby
      const gamesRef = collection(db, 'games');
      const gameQuery = query(gamesRef, where('lobbyId', '==', lobby.id));
      const gameSnapshot = await getDocs(gameQuery);
      
      if (gameSnapshot.empty) {
        alert('Game not found');
        return;
      }

      const gameDoc = gameSnapshot.docs[0];
      const gameData = gameDoc.data();

      if (gameData.player2) {
        alert('This game is no longer available');
        return;
      }

      // Update game document first
      await updateDoc(doc(db, 'games', gameDoc.id), {
        player2: joiningPlayer.name,
        player2Number: joiningPlayer.secretNumber,
        status: 'playing',
        lastActive: Date.now()
      });

      // Then update lobby document
      await updateDoc(doc(db, 'lobbies', lobby.id), {
        player2: joiningPlayer.name,
        status: 'playing',
        lastActive: Date.now()
      });

      // Update local state last
      setGameState({
        isPlaying: true,
        inLobby: false,
        gameId: gameDoc.id,
        lobbyId: lobby.id,
        playerId: 2,
        playerName: joiningPlayer.name,
        secretNumber: joiningPlayer.secretNumber,
        gameMode: lobby.gameMode
      });
    } catch (error) {
      console.error('Error joining game:', error);
      alert('Unable to join game. Please try again.');
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
    <div className="container bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-800 dark:to-slate-900">
      <ThemeToggle />
      <h1 className="text-4xl font-bold text-blue-600 dark:text-blue-400">Number Guessing Game</h1>
      {!gameState.isPlaying && gameState.inLobby && (
        <>
          <GameSetup setGameState={setGameState} onLeaveLobby={handleLeaveLobby} />
          <Lobby 
            onJoinGame={handleJoinGame} 
            setGameState={setGameState} // Add this prop
          />
        </>
      )}
      {gameState.isPlaying && <GameArea gameState={gameState} onBackToLobby={handleBackToLobby} />}
    </div>
  );
}

export default App;
