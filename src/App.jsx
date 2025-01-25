import { useState } from 'react';
import GameSetup from './components/GameSetup';
import GameArea from './components/GameArea';
import Lobby from './components/Lobby';
import { doc, updateDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from './firebase';
import './App.css';

function App() {
  const [gameState, setGameState] = useState({
    isPlaying: false,
    inLobby: true,
    gameId: null,
    lobbyId: null,
    playerId: null,
    playerName: '',
    secretNumber: ''
  });

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

  return (
    <div className="container">
      <h1>Number Guessing Game</h1>
      {!gameState.isPlaying && gameState.inLobby && (
        <>
          <GameSetup setGameState={setGameState} />
          <Lobby onJoinGame={handleJoinGame} />
        </>
      )}
      {gameState.isPlaying && <GameArea gameState={gameState} />}
    </div>
  );
}

export default App;
