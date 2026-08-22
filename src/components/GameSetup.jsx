import { useState } from 'react';
import { collection, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import DigitPad from './DigitPad';

function GameSetup({ setGameState }) {
  const [playerName, setPlayerName] = useState('');
  const [secretNumber, setSecretNumber] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [gameMode, setGameMode] = useState('classic');
  const [creating, setCreating] = useState(false);

  const validateNumber = (num) => {
    if (num.length !== 4) return false;
    const digits = new Set(num.split(''));
    return digits.size === 4 && /^\d+$/.test(num);
  };

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
      setCreating(true);
      const timestamp = Date.now();
      const firstTurn = Math.random() < 0.5 ? 1 : 2;
      const generatedKey = isPrivate ? generatePrivateKey() : null;

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
    } finally {
      setCreating(false);
    }
  };

  return (
    <section className="panel panel-pad">
      <div className="hero-copy">
        <h2>Host a match</h2>
        <p>Pick a secret 4-digit code. No repeated digits. Your opponent tries to crack it first.</p>
      </div>

      <div className="field">
        <label htmlFor="player-name">Your name</label>
        <input
          id="player-name"
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Alex"
          autoComplete="nickname"
        />
      </div>

      <div className="field">
        <label>Secret number</label>
        <DigitPad compact value={secretNumber} onChange={setSecretNumber} />
      </div>

      <div className="option-stack">
        <label className="check-row">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
          />
          <span>Private lobby {isPrivate ? '· share the code to invite' : ''}</span>
        </label>

        <div className="mode-switch" role="radiogroup" aria-label="Game mode">
          <label>
            <input
              type="radio"
              value="classic"
              checked={gameMode === 'classic'}
              onChange={(e) => setGameMode(e.target.value)}
            />
            Classic
          </label>
          <label>
            <input
              type="radio"
              value="rapid"
              checked={gameMode === 'rapid'}
              onChange={(e) => setGameMode(e.target.value)}
            />
            Rapid
          </label>
        </div>
      </div>

      <button
        type="button"
        onClick={handleStartGame}
        className="btn-primary"
        disabled={creating}
      >
        {creating ? 'Creating…' : 'Create game'}
      </button>
    </section>
  );
}

export default GameSetup;
