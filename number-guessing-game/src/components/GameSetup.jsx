// NOTE: This file appears to be a duplicate. Consider removing or archiving it to avoid conflicts.
import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

function GameSetup({ setGameState }) {
  const [playerName, setPlayerName] = useState('');
  const [secretNumber, setSecretNumber] = useState('');

  const validateNumber = (num) => {
    if (num.length !== 4) return false;
    const digits = new Set(num.split(''));
    return digits.size === 4 && /^\d+$/.test(num);
  };

  const handleStartGame = async () => {
    if (!validateNumber(secretNumber)) {
      alert('Please enter a valid 4-digit number with no repeating digits');
      return;
    }

    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }

    try {
      const timestamp = new Date().getTime(); // Use numeric timestamp
      const firstTurn = Math.random() < 0.5 ? 1 : 2; // Random first turn
      
      // Create a lobby first with proper initial values
      const lobbiesRef = collection(db, 'lobbies');
      const lobbyDoc = await addDoc(lobbiesRef, {
        player1: playerName,
        player2: null, // Explicitly set to null for query filtering
        status: 'waiting',
        createdAt: timestamp,
        updatedAt: timestamp,
        firstTurn
      });

      // Create the game
      const gamesRef = collection(db, 'games');
      const gameDoc = await addDoc(gamesRef, {
        lobbyId: lobbyDoc.id,
        player1: playerName,
        player1Number: secretNumber,
        player2: null,
        status: 'waiting',
        createdAt: timestamp,
        updatedAt: timestamp,
        firstTurn,
        currentTurn: firstTurn
      });

      setGameState({
        isPlaying: true,
        gameId: gameDoc.id,
        lobbyId: lobbyDoc.id,
        playerId: 1,
        playerName,
        secretNumber
      });
    } catch (error) {
      console.error('Error creating game:', error);
      alert('Error creating game. Please try again.');
    }
  };

  return (
    <div className="section">
      <input
        type="text"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
        placeholder="Enter your name"
      />
      <input
        type="text"
        value={secretNumber}
        onChange={(e) => setSecretNumber(e.target.value)}
        maxLength={4}
        placeholder="Enter your 4-digit number"
      />
      <div className="buttons">
        <button onClick={handleStartGame}>Create Game</button>
      </div>
    </div>
  );
}

export default GameSetup;
