import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase';
import DigitPad from './DigitPad';
import SavedNamePicker from './SavedNamePicker';
import { getLastPlayerName, rememberPlayerName } from '../savedNames';

function Lobby({ onJoinGame, setGameState }) {
  const [lobbies, setLobbies] = useState([]);
  const [activeGames, setActiveGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedLobby, setSelectedLobby] = useState(null);
  const [joinForm, setJoinForm] = useState({
    playerName: getLastPlayerName(),
    secretNumber: '',
    privateKey: ''
  });

  useEffect(() => {
    const q = query(
      collection(db, 'lobbies'),
      where('status', '==', 'waiting')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lobbyList = snapshot.docs.map((lobbyDoc) => ({
        id: lobbyDoc.id,
        ...lobbyDoc.data()
      }));
      setLobbies(lobbyList.sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const activeGamesQuery = query(
      collection(db, 'games'),
      where('status', '==', 'playing')
    );

    const unsubscribe = onSnapshot(activeGamesQuery, (snapshot) => {
      const games = [];
      snapshot.forEach((gameDoc) => {
        games.push({ id: gameDoc.id, ...gameDoc.data() });
      });
      setActiveGames(games.sort((a, b) => b.createdAt - a.createdAt));
    });

    return () => unsubscribe();
  }, []);

  const handleJoinAttempt = (lobby) => {
    setSelectedLobby(lobby);
    setJoinForm({
      playerName: getLastPlayerName(),
      secretNumber: '',
      privateKey: ''
    });
    setShowJoinModal(true);
  };

  const handleJoinSubmit = async (e) => {
    e.preventDefault();

    if (!joinForm.playerName.trim() || !joinForm.secretNumber.trim()) {
      alert('Please fill in all fields');
      return;
    }

    if (selectedLobby.isPrivate && joinForm.privateKey !== selectedLobby.privateKey) {
      alert('Invalid private key');
      return;
    }

    if (!/^\d{4}$/.test(joinForm.secretNumber) || new Set(joinForm.secretNumber).size !== 4) {
      alert('Please enter a valid 4-digit number with no repeating digits');
      return;
    }

    try {
      rememberPlayerName(joinForm.playerName);

      await onJoinGame({
        ...selectedLobby,
        joiningPlayer: {
          name: joinForm.playerName,
          secretNumber: joinForm.secretNumber
        }
      });

      setShowJoinModal(false);
      setJoinForm({ playerName: getLastPlayerName(), secretNumber: '', privateKey: '' });
    } catch (error) {
      console.error('Error joining game:', error);
      alert('Error joining game. Please try again.');
    }
  };

  const handleSpectate = async (game) => {
    try {
      setGameState({
        isPlaying: true,
        inLobby: false,
        gameId: game.id,
        lobbyId: game.lobbyId,
        playerId: 'spectator',
        playerName: 'Spectator',
        gameMode: game.gameMode
      });
    } catch (error) {
      console.error('Error joining as spectator:', error);
      alert('Unable to spectate game. Please try again.');
    }
  };

  return (
    <div className="stack">
      <section className="panel panel-pad">
        <div className="section-title">
          <h2>Open lobbies</h2>
          <span>{loading ? 'Loading' : `${lobbies.length} waiting`}</span>
        </div>

        {loading ? (
          <p className="empty-state">Looking for matches…</p>
        ) : lobbies.length === 0 ? (
          <p className="empty-state">No open games. Host one on the left to start.</p>
        ) : (
          <div className="lobby-list">
            {lobbies.map((lobby) => (
              <div key={lobby.id} className="lobby-item">
                <div className="lobby-info">
                  <div className="player-name">
                    {lobby.player1}
                    {lobby.isPrivate && <span className="lock" title="Private lobby"> 🔒</span>}
                  </div>
                  <div className="meta-row">
                    <span>{lobby.gameMode} mode</span>
                    <span>•</span>
                    <span>{new Date(lobby.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
                <button type="button" onClick={() => handleJoinAttempt(lobby)} className="btn-primary">
                  Join
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel panel-pad">
        <div className="section-title">
          <h2>Live matches</h2>
          <span>{activeGames.length} in play</span>
        </div>
        {activeGames.length === 0 ? (
          <p className="empty-state">Nothing to spectate yet.</p>
        ) : (
          <div className="lobby-list">
            {activeGames.map((game) => (
              <div key={game.id} className="lobby-item">
                <div className="lobby-info">
                  <div className="player-name">
                    {game.player1} vs {game.player2}
                    <span className="pill-live" style={{ marginLeft: '0.5rem' }}>Live</span>
                  </div>
                  <div className="meta-row">
                    <span>{game.gameMode} mode</span>
                    <span>•</span>
                    <span>Started {new Date(game.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
                <button type="button" onClick={() => handleSpectate(game)} className="btn-ghost">
                  Spectate
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="join-modal panel" onClick={(e) => e.stopPropagation()}>
            <h3>{`Join ${selectedLobby?.player1}'s game`}</h3>
            <form onSubmit={handleJoinSubmit}>
              <div className="field">
                <label htmlFor="join-name">Your name</label>
                <SavedNamePicker
                  id="join-name"
                  value={joinForm.playerName}
                  onChange={(playerName) => setJoinForm({ ...joinForm, playerName })}
                  autoFocus
                />
              </div>
              <div className="field">
                <label>Your secret number</label>
                <DigitPad
                  compact
                  value={joinForm.secretNumber}
                  onChange={(secretNumber) => setJoinForm({ ...joinForm, secretNumber })}
                />
              </div>
              {selectedLobby?.isPrivate && (
                <div className="field">
                  <label htmlFor="join-key">Private key</label>
                  <input
                    id="join-key"
                    type="text"
                    placeholder="Lobby code"
                    value={joinForm.privateKey}
                    onChange={(e) => setJoinForm({ ...joinForm, privateKey: e.target.value })}
                    className="mono-input"
                  />
                </div>
              )}
              <div className="modal-actions">
                <button type="submit" className="btn-primary span-2">
                  Join game
                </button>
                <button
                  type="button"
                  onClick={() => handleSpectate(selectedLobby)}
                  className="btn-ghost"
                >
                  Spectate
                </button>
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Lobby;
