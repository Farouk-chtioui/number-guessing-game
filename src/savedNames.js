export const DEFAULT_PLAYER_NAME = 'sameoldsteven';
const STORAGE_KEY = 'savedPlayerNames';
const LAST_KEY = 'lastPlayerName';
const MAX_SAVED = 8;

function readList() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [DEFAULT_PLAYER_NAME];
    const names = parsed
      .filter((name) => typeof name === 'string' && name.trim())
      .map((name) => name.trim());
    if (!names.includes(DEFAULT_PLAYER_NAME)) {
      names.push(DEFAULT_PLAYER_NAME);
    }
    return names.slice(0, MAX_SAVED);
  } catch {
    return [DEFAULT_PLAYER_NAME];
  }
}

export function getSavedNames() {
  return readList();
}

export function getLastPlayerName() {
  try {
    const last = localStorage.getItem(LAST_KEY)?.trim();
    if (last) return last;
  } catch {
    // ignore
  }
  return DEFAULT_PLAYER_NAME;
}

export function rememberPlayerName(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed || trimmed.toLowerCase() === 'spectator') return;

  const names = readList().filter((saved) => saved.toLowerCase() !== trimmed.toLowerCase());
  names.unshift(trimmed);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(names.slice(0, MAX_SAVED)));
    localStorage.setItem(LAST_KEY, trimmed);
  } catch {
    // ignore storage errors
  }
}
