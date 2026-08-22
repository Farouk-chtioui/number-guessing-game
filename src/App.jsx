import { useState, useEffect } from 'react';
import GameSetup from './components/GameSetup';
import GameArea from './components/GameArea';
import Lobby from './components/Lobby';
import { doc, updateDoc, getDocs, collection, query, where, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import './App.css';
import ThemeToggle from './components/ThemeToggle';
import { clearGameNotes } from './notesStorage';

function App() {
  const [gameState, setGameState] = useState(() => {
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

  useEffect(() => {
    localStorage.setItem('gameState', JSON.stringify(gameState));
  }, [gameState]);

  useEffect(() => {
    const verifyGameState = async () => {
      if (gameState.gameId) {
        try {
          const gameDoc = doc(db, 'games', gameState.gameId);
          const gameSnap = await getDoc(gameDoc);

          if (!gameSnap.exists()) {
            handleBackToLobby();
            return;
          }

          const gameData = gameSnap.data();
          if (gameData.status === 'completed') {
            handleBackToLobby();
            return;
          }

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

      await updateDoc(doc(db, 'games', gameDoc.id), {
        player2: joiningPlayer.name,
        player2Number: joiningPlayer.secretNumber,
        status: 'playing',
        lastActive: Date.now()
      });

      await updateDoc(doc(db, 'lobbies', lobby.id), {
        player2: joiningPlayer.name,
        status: 'playing',
        lastActive: Date.now()
      });

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
    if (gameState.gameId && gameState.playerId && gameState.playerId !== 'spectator') {
      clearGameNotes(gameState.gameId, gameState.playerId);
    }
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

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <span /><span /><span /><span />
          </div>
          <div>
            <h1>Number Guessing</h1>
            <p>Crack the 4-digit code</p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <main className="app-main">
        {!gameState.isPlaying && gameState.inLobby && (
          <div className="lobby-grid">
            <GameSetup setGameState={setGameState} />
            <Lobby onJoinGame={handleJoinGame} setGameState={setGameState} />
          </div>
        )}
        {gameState.isPlaying && (
          <GameArea gameState={gameState} onBackToLobby={handleBackToLobby} />
        )}
      </main>
    </div>
  );
}

export default App;
