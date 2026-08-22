import { useEffect, useRef, useState } from 'react';
import { DIGITS, defaultNotes, readGameNotes, writeGameNotes } from '../notesStorage';

const STATUS_ORDER = ['none', 'in', 'maybe', 'out'];
const STATUS_LABEL = {
  none: 'Mark',
  in: 'In',
  maybe: 'Maybe',
  out: 'Out'
};

function nextStatus(status) {
  const index = STATUS_ORDER.indexOf(status);
  return STATUS_ORDER[(index + 1) % STATUS_ORDER.length];
}

function GameNotepad({ gameId, playerId }) {
  const [board, setBoard] = useState(defaultNotes);
  const [open, setOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1025 : true
  );
  const [saved, setSaved] = useState(true);
  const [held, setHeld] = useState(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    setBoard(readGameNotes(gameId, playerId));
    setHeld(null);
    setSaved(true);
  }, [gameId, playerId]);

  useEffect(() => {
    return () => clearTimeout(saveTimer.current);
  }, []);

  const persist = (next) => {
    setBoard(next);
    setSaved(false);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaved(writeGameNotes(gameId, playerId, next));
    }, 160);
  };

  const cycleDigit = (digit) => {
    persist({
      ...board,
      digits: {
        ...board.digits,
        [digit]: nextStatus(board.digits[digit] || 'none')
      }
    });
  };

  const placeInSlot = (digit, slotIndex) => {
    const slots = [...board.slots];
    const previousIndex = slots.indexOf(digit);
    if (previousIndex !== -1) slots[previousIndex] = null;
    slots[slotIndex] = digit;
    persist({ ...board, slots });
    setHeld(null);
  };

  const pickFromSlot = (slotIndex) => {
    const digit = board.slots[slotIndex];
    if (digit == null) return;
    const slots = [...board.slots];
    slots[slotIndex] = null;
    persist({ ...board, slots });
    setHeld(digit);
  };

  const handleSlotClick = (slotIndex) => {
    if (held != null) {
      placeInSlot(held, slotIndex);
      return;
    }
    pickFromSlot(slotIndex);
  };

  const handlePick = (digit) => {
    setHeld((current) => (current === digit ? null : digit));
  };

  const resetBoard = () => {
    if (!window.confirm('Reset the notepad? This clears marks and the alignment slots.')) {
      return;
    }
    setHeld(null);
    persist(defaultNotes());
  };

  return (
    <>
      <button
        type="button"
        className="notepad-fab"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls="game-notepad"
      >
        {open ? 'Hide notes' : 'Notes'}
      </button>

      <aside
        id="game-notepad"
        className={`notepad-panel ${open ? 'is-open' : ''}`}
        aria-label="Private game notes"
      >
        <header className="notepad-header">
          <div>
            <h3>Notepad</h3>
            <p>Only on this device · this game</p>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={() => setOpen(false)}
            aria-label="Close notepad"
          >
            ×
          </button>
        </header>

        <div className="notepad-body">
          <p className="notepad-help">
            Click <strong>Mark</strong> to color a digit. Click the number, then a slot, to place it.
          </p>

          <div className="mark-legend" aria-hidden="true">
            <span className="legend-item is-in">In the code</span>
            <span className="legend-item is-maybe">Maybe</span>
            <span className="legend-item is-out">Not in the code</span>
          </div>

          <div className="digit-grid">
            {DIGITS.map((digit) => {
              const status = board.digits[digit] || 'none';
              return (
                <div
                  key={digit}
                  className={`tracker-chip is-${status} ${held === digit ? 'is-held' : ''}`}
                >
                  <button
                    type="button"
                    className="chip-num"
                    onClick={() => handlePick(digit)}
                    aria-pressed={held === digit}
                    aria-label={`Select ${digit} to place`}
                  >
                    {digit}
                  </button>
                  <button
                    type="button"
                    className="chip-status"
                    onClick={() => cycleDigit(digit)}
                    aria-label={`Mark ${digit} as ${STATUS_LABEL[nextStatus(status)]}`}
                  >
                    {STATUS_LABEL[status]}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="align-block">
            <h4>{held == null ? 'Guess alignment' : `Place ${held} in a slot`}</h4>
            <div className="align-slots">
              {board.slots.map((value, index) => (
                <button
                  key={index}
                  type="button"
                  className={`align-slot ${value ? 'is-filled' : ''} ${held != null ? 'is-ready' : ''}`}
                  onClick={() => handleSlotClick(index)}
                  aria-label={
                    held != null
                      ? `Place ${held} in slot ${index + 1}`
                      : value == null
                        ? `Empty slot ${index + 1}`
                        : `Pick up ${value} from slot ${index + 1}`
                  }
                >
                  {value ?? '_'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <footer className="notepad-footer">
          <span className={`save-dot ${saved ? 'is-saved' : ''}`}>
            {saved ? 'Saved locally' : 'Saving…'}
          </span>
          <button type="button" className="btn-ghost btn-sm" onClick={resetBoard}>
            Reset notepad
          </button>
        </footer>
      </aside>
    </>
  );
}

export default GameNotepad;
