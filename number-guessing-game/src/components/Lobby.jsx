import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase';

function Lobby({ onJoinGame }) {
  const [lobbies, setLobbies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      // Simplified query without orderBy
      const q = query(
        collection(db, 'lobbies'),
        where('status', '==', 'waiting')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const lobbyList = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Only add games that don't have player2
          if (!data.player2) {
            lobbyList.push({ 
              id: doc.id,
              ...data
            });
          }
        });
        // Sort locally instead
        lobbyList.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        setLobbies(lobbyList);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching lobbies:", error);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Error setting up lobby listener:", error);
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="lobby">
        <h2>Available Games</h2>
        <p>Loading available games...</p>
      </div>
    );
  }

  return (
    <div className="lobby">
      <h2>Available Games</h2>
      {lobbies.length === 0 ? (
        <p>No games available. Create one to start playing!</p>
      ) : (
        <div className="lobby-list">
          {lobbies.map(lobby => (
            <div key={lobby.id} className="lobby-item">
              <div className="lobby-info">
                <span className="player-name">{lobby.player1}'s game</span>
                <span className="game-status">
                  Created {new Date(lobby.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <button onClick={() => onJoinGame(lobby)}>
                Join Game
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Lobby;
