import { collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from './firebase';

export const WAITING_IDLE_MS = 3 * 60 * 1000;
export const PLAYING_IDLE_MS = 10 * 60 * 1000;
export const COMPLETED_IDLE_MS = 15 * 60 * 1000;

function lastActivity(data) {
  return data?.lastActive || data?.updatedAt || data?.createdAt || 0;
}

async function deleteGuesses(gameId) {
  const snap = await getDocs(collection(db, 'games', gameId, 'guesses'));
  await Promise.all(snap.docs.map((guessDoc) => deleteDoc(guessDoc.ref)));
}

export async function deleteGameBundle(gameId, lobbyId) {
  if (gameId) {
    try {
      await deleteGuesses(gameId);
    } catch (error) {
      console.error('Error deleting guesses:', error);
    }
    try {
      await deleteDoc(doc(db, 'games', gameId));
    } catch (error) {
      console.error('Error deleting game:', error);
    }
  }

  if (lobbyId) {
    try {
      await deleteDoc(doc(db, 'lobbies', lobbyId));
    } catch (error) {
      console.error('Error deleting lobby:', error);
    }
  }
}

export async function cleanupStaleGames() {
  const now = Date.now();
  const toDelete = [];

  const queue = (gameId, lobbyId) => {
    toDelete.push({ gameId: gameId || null, lobbyId: lobbyId || null });
  };

  try {
    const [waitingLobbies, waitingGames, playingGames, completedGames] = await Promise.all([
      getDocs(query(collection(db, 'lobbies'), where('status', '==', 'waiting'))),
      getDocs(query(collection(db, 'games'), where('status', '==', 'waiting'))),
      getDocs(query(collection(db, 'games'), where('status', '==', 'playing'))),
      getDocs(query(collection(db, 'games'), where('status', '==', 'completed')))
    ]);

    waitingLobbies.forEach((lobbyDoc) => {
      const data = lobbyDoc.data();
      if (now - lastActivity(data) > WAITING_IDLE_MS) {
        queue(data.gameId, lobbyDoc.id);
      }
    });

    waitingGames.forEach((gameDoc) => {
      const data = gameDoc.data();
      if (now - lastActivity(data) > WAITING_IDLE_MS) {
        queue(gameDoc.id, data.lobbyId);
      }
    });

    playingGames.forEach((gameDoc) => {
      const data = gameDoc.data();
      if (now - lastActivity(data) > PLAYING_IDLE_MS) {
        queue(gameDoc.id, data.lobbyId);
      }
    });

    completedGames.forEach((gameDoc) => {
      const data = gameDoc.data();
      if (now - lastActivity(data) > COMPLETED_IDLE_MS) {
        queue(gameDoc.id, data.lobbyId);
      }
    });

    const seen = new Set();
    for (const item of toDelete) {
      const key = `${item.gameId || ''}:${item.lobbyId || ''}`;
      if (seen.has(key) || key === ':') continue;
      seen.add(key);
      await deleteGameBundle(item.gameId, item.lobbyId);
    }
  } catch (error) {
    console.error('Error cleaning stale games:', error);
  }
}
