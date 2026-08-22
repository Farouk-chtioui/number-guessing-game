const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function defaultNotes() {
  return {
    digits: Object.fromEntries(DIGITS.map((digit) => [digit, 'none'])),
    slots: [null, null, null, null]
  };
}

export function notesStorageKey(gameId, playerId) {
  return `gameNotepad:${gameId}:${playerId}`;
}

export function clearGameNotes(gameId, playerId) {
  try {
    localStorage.removeItem(notesStorageKey(gameId, playerId));
  } catch {
    // ignore storage errors
  }
}

export function readGameNotes(gameId, playerId) {
  try {
    const raw = localStorage.getItem(notesStorageKey(gameId, playerId));
    if (!raw) return defaultNotes();

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return defaultNotes();
    }

    return {
      digits: { ...defaultNotes().digits, ...(parsed.digits || {}) },
      slots: Array.isArray(parsed.slots) && parsed.slots.length === 4
        ? parsed.slots.map((slot) => (DIGITS.includes(slot) ? slot : null))
        : [null, null, null, null]
    };
  } catch {
    return defaultNotes();
  }
}

export function writeGameNotes(gameId, playerId, value) {
  try {
    localStorage.setItem(notesStorageKey(gameId, playerId), JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export { DIGITS };
