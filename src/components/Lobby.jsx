import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

function Lobby({ onJoinGame, setGameState }) { // Add setGameState prop
  const [lobbies, setLobbies] = useState([]);
  const [activeGames, setActiveGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [privateCode, setPrivateCode] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedLobby, setSelectedLobby] = useState(null);
  const [joinForm, setJoinForm] = useState({
    playerName: '',
    secretNumber: '',
    privateKey: ''
  });

  useEffect(() => {
    // Cleanup function for idle lobbies
    const cleanupIdleLobbies = async (doc, data) => {
      const currentTime = Date.now();
      const timeoutDuration = 3 * 60 * 1000; // 3 minutes

      if (currentTime - data.lastActive > timeoutDuration) {
        try {
          await deleteDoc(doc.ref);
          if (data.gameId) {
            await deleteDoc(doc(db, 'games', data.gameId));
          }
        } catch (error) {
          console.error('Error cleaning up idle lobby:', error);
        }
        return true; // Lobby was deleted
      }
      return false; // Lobby is still active
    };

    // Set up listener for public lobbies
    const q = query(
      collection(db, 'lobbies'),
      where('status', '==', 'waiting'),
      where('isPrivate', '==', false)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const lobbyList = [];
      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (!(await cleanupIdleLobbies(doc, data))) {
          lobbyList.push({ id: doc.id, ...data });
        }
      }
      setLobbies(lobbyList.sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Listen for active games
    const activeGamesQuery = query(
      collection(db, 'games'),
      where('status', '==', 'playing')
    );

    const unsubscribe = onSnapshot(activeGamesQuery, (snapshot) => {
      const games = [];
      snapshot.forEach((doc) => {
        games.push({ id: doc.id, ...doc.data() });
      });
      setActiveGames(games.sort((a, b) => b.createdAt - a.createdAt));
    });

    return () => unsubscribe();
  }, []);

  const handleJoinPrivate = async () => {
    if (!privateCode.trim()) {
      alert('Please enter a lobby code');
      return;
    }

    try {
      const lobbyDoc = doc(db, 'lobbies', privateCode);
      const lobbySnap = await getDoc(lobbyDoc);

      if (!lobbySnap.exists()) {
        alert('Lobby not found');
        return;
      }

      const lobbyData = lobbySnap.data();
      if (lobbyData.status !== 'waiting' || lobbyData.player2) {
        alert('This lobby is no longer available');
        return;
      }

      onJoinGame({ id: privateCode, ...lobbyData });
    } catch (error) {
      console.error('Error joining private lobby:', error);
      alert('Error joining private lobby');
    }
  };

  const handleJoinAttempt = (lobby) => {
    setSelectedLobby(lobby);
    setShowJoinModal(true);
  };

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    
    if (!joinForm.playerName.trim() || !joinForm.secretNumber.trim()) {
      alert('Please fill in all fields');
      return;
    }

    // Only check private key if lobby is private
    if (selectedLobby.isPrivate && joinForm.privateKey !== selectedLobby.privateKey) {
      alert('Invalid private key');
      return;
    }

    if (!/^\d{4}$/.test(joinForm.secretNumber) || new Set(joinForm.secretNumber).size !== 4) {
      alert('Please enter a valid 4-digit number with no repeating digits');
      return;
    }

    try {
      await onJoinGame({
        ...selectedLobby,
        joiningPlayer: {
          name: joinForm.playerName,
          secretNumber: joinForm.secretNumber
        }
      });

      setShowJoinModal(false);
      setJoinForm({ playerName: '', secretNumber: '', privateKey: '' });
    } catch (error) {
      console.error('Error joining game:', error);
      alert('Error joining game. Please try again.');
    }
  };

  const handleSpectate = async (game) => {
    try {
      // Update game state for spectator mode
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

  if (loading) return <div className="lobby"><h2>Loading available games...</h2></div>;

  return (
    <div className="space-y-8">
      <div className="lobby">
        <h2 className="text-2xl font-bold mb-6">Available Games</h2>
        
        {lobbies.length === 0 ? (
          <p className="text-center text-gray-600 dark:text-gray-400">
            No games available. Create one to start playing!
          </p>
        ) : (
          <div className="space-y-4">
            {lobbies.map(lobby => (
              <div key={lobby.id} 
                className="lobby-item flex items-center justify-between hover:scale-[1.02] transition-transform"
              >
                <div className="lobby-info">
                  <div className="flex items-center">
                    <span className="player-name text-lg">{lobby.player1}'s game</span>
                    {lobby.isPrivate && (
                      <span className="ml-2 text-blue-500" title="Private lobby">
                        🔒
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <span>{lobby.gameMode} Mode</span>
                    <span>•</span>
                    <span>
                      {new Date(lobby.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleJoinAttempt(lobby)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Join Game
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="lobby">
        <h2 className="text-2xl font-bold mb-6">Active Games</h2>
        {activeGames.length === 0 ? (
          <p className="text-center text-gray-600 dark:text-gray-400">
            No active games to spectate
          </p>
        ) : (
          <div className="space-y-4">
            {activeGames.map(game => (
              <div key={game.id} 
                className="lobby-item flex items-center justify-between hover:scale-[1.02] transition-transform"
              >
                <div className="lobby-info">
                  <div className="flex items-center">
                    <span className="player-name text-lg">{game.player1} vs {game.player2}</span>
                    <span className="ml-3 px-2 py-1 bg-green-100 dark:bg-green-900 
                                   text-green-800 dark:text-green-200 rounded-full text-sm">
                      Live
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <span>{game.gameMode} Mode</span>
                    <span>•</span>
                    <span>Started {new Date(game.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleSpectate(game)}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg 
                           hover:bg-green-600 transition-colors"
                >
                  Spectate
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="join-modal max-w-md w-full bg-white dark:bg-slate-800 rounded-xl shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                Join {selectedLobby?.player1}'s Game
              </h3>
              <form onSubmit={handleJoinSubmit} className="space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={joinForm.playerName}
                    onChange={(e) => setJoinForm({
                      ...joinForm,
                      playerName: e.target.value
                    })}
                    className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600
                             bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    autoFocus
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Your 4-digit number"
                    maxLength={4}
                    value={joinForm.secretNumber}
                    onChange={(e) => setJoinForm({
                      ...joinForm,
                      secretNumber: e.target.value
                    })}
                    className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600
                             bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                </div>
                {selectedLobby?.isPrivate && (
                  <div>
                    <input
                      type="text"
                      placeholder="Private key"
                      value={joinForm.privateKey}
                      onChange={(e) => setJoinForm({
                        ...joinForm,
                        privateKey: e.target.value
                      })}
                      className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600
                               bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    />
                  </div>
                )}
                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg
                             transition-colors duration-200"
                  >
                    Join Game
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSpectate(selectedLobby)}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg
                             transition-colors duration-200"
                  >
                    Spectate
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowJoinModal(false)}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg
                             transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Lobby;
