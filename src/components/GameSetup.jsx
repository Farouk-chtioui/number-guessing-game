import { useState } from 'react';
import { collection, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

function GameSetup({ setGameState, onLeaveLobby }) {
  const [playerName, setPlayerName] = useState('');
  const [secretNumber, setSecretNumber] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [gameMode, setGameMode] = useState('classic'); // 'classic' or 'rapid'
  const [privateKey, setPrivateKey] = useState('');

  const validateNumber = (num) => {
    if (num.length !== 4) return false;
    const digits = new Set(num.split(''));
    return digits.size === 4 && /^\d+$/.test(num);
  };

  // Add this function to generate private key
  const generatePrivateKey = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
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
      const timestamp = Date.now();
      const firstTurn = Math.random() < 0.5 ? 1 : 2;
      const generatedKey = isPrivate ? generatePrivateKey() : null;
      setPrivateKey(generatedKey);
      
      // Create game document first
      const gamesRef = collection(db, 'games');
      const gameDoc = await addDoc(gamesRef, {
        player1: playerName,
        player1Number: secretNumber,
        player2: null,
        player2Number: null,
        status: 'waiting',
        createdAt: timestamp,
        updatedAt: timestamp,
        firstTurn,
        currentTurn: firstTurn,
        gameMode,
        lastActive: timestamp
      });

      // Then create lobby with game reference
      const lobbiesRef = collection(db, 'lobbies');
      const lobbyDoc = await addDoc(lobbiesRef, {
        player1: playerName,
        player2: null,
        status: 'waiting',
        createdAt: timestamp,
        updatedAt: timestamp,
        firstTurn,
        isPrivate,
        gameMode,
        lastActive: timestamp,
        privateKey: generatedKey,
        gameId: gameDoc.id
      });

      // Update game with lobby reference
      await updateDoc(gameDoc, {
        lobbyId: lobbyDoc.id
      });

      setGameState({
        isPlaying: true,
        gameId: gameDoc.id,
        lobbyId: lobbyDoc.id,
        playerId: 1,
        playerName,
        secretNumber,
        gameMode,
        privateKey: generatedKey
      });
    } catch (error) {
      console.error('Error creating game:', error);
      alert('Error creating game. Please try again.');
    }
  };

  return (
    <div className="section max-w-md mx-auto">
      <div className="space-y-4">
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Enter your name"
          className="w-full p-3 rounded-lg"
        />
        <input
          type="text"
          value={secretNumber}
          onChange={(e) => setSecretNumber(e.target.value)}
          maxLength={4}
          placeholder="Enter your 4-digit number"
          className="w-full p-3 rounded-lg"
        />
        
        <div className="game-options p-4 rounded-lg space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Private Lobby</span>
          </label>
          
          <div className="flex gap-6">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="classic"
                checked={gameMode === 'classic'}
                onChange={(e) => setGameMode(e.target.value)}
                className="w-4 h-4"
              />
              <span>Classic Mode</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="rapid"
                checked={gameMode === 'rapid'}
                onChange={(e) => setGameMode(e.target.value)}
                className="w-4 h-4"
              />
              <span>Rapid Mode</span>
            </label>
          </div>
        </div>

        <button
          onClick={handleStartGame}
          className="w-full py-3 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          Create Game
        </button>
      </div>
    </div>
  );
}

export default GameSetup;
