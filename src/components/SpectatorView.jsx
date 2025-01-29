import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

function SpectatorView({ gameState, onBackToLobby }) {
  const [game, setGame] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const gameDoc = doc(db, 'games', gameState.gameId);
    const unsubscribe = onSnapshot(gameDoc, (snapshot) => {
      setGame(snapshot.data());
    });
    return () => unsubscribe();
  }, [gameState.gameId]);

  useEffect(() => {
    const guessesRef = collection(db, 'games', gameState.gameId, 'guesses');
    const q = query(guessesRef, orderBy('timestamp'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const guesses = [];
      snapshot.forEach((doc) => guesses.push(doc.data()));
      setHistory(guesses);
    });

    return () => unsubscribe();
  }, [gameState.gameId]);

  if (!game) return <div>Loading...</div>;

  return (
    <div className="section max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">
              {game.player1} vs {game.player2}
            </h2>
            <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200
                           px-3 py-1 rounded-full text-sm font-medium">
              Spectating
            </span>
          </div>

          {/* Players' numbers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
              <span className="text-gray-600 dark:text-gray-300">
                {game.player1}'s number:
              </span>
              <span className="font-mono font-bold text-lg ml-2">
                {game.player1Number}
              </span>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
              <span className="text-gray-600 dark:text-gray-300">
                {game.player2}'s number:
              </span>
              <span className="font-mono font-bold text-lg ml-2">
                {game.player2Number}
              </span>
            </div>
          </div>

          {/* Game status */}
          <div className="text-center mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <span className="text-blue-700 dark:text-blue-300">
              {game.winner 
                ? `Winner: ${game.winner === 1 ? game.player1 : game.player2}`
                : `Current Turn: ${game.currentTurn === 1 ? game.player1 : game.player2}`
              }
            </span>
          </div>
        </div>
      </div>

      {/* Game history */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
          <h3 className="font-bold mb-3">{game.player1}'s Guesses</h3>
          <div className="space-y-2">
            {history
              .filter(g => g.player === 1)
              .sort((a, b) => b.timestamp - a.timestamp)
              .map((g, i) => (
                <div key={i} className="p-2 bg-gray-50 dark:bg-slate-700 rounded">
                  <span className="font-mono">{g.guess}</span>
                  <span className="float-right text-gray-600 dark:text-gray-400">
                    {g.result}
                  </span>
                </div>
              ))}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
          <h3 className="font-bold mb-3">{game.player2}'s Guesses</h3>
          <div className="space-y-2">
            {history
              .filter(g => g.player === 2)
              .sort((a, b) => b.timestamp - a.timestamp)
              .map((g, i) => (
                <div key={i} className="p-2 bg-gray-50 dark:bg-slate-700 rounded">
                  <span className="font-mono">{g.guess}</span>
                  <span className="float-right text-gray-600 dark:text-gray-400">
                    {g.result}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <button
          onClick={onBackToLobby}
          className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
        >
          Back to Lobby
        </button>
      </div>
    </div>
  );
}

export default SpectatorView;
