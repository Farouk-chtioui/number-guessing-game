import { getSavedNames } from '../savedNames';

function SavedNamePicker({ value, onSelect }) {
  const names = getSavedNames();
  if (names.length === 0) return null;

  return (
    <div className="saved-names" role="list" aria-label="Saved names">
      {names.map((name) => (
        <button
          key={name}
          type="button"
          role="listitem"
          className={`saved-name ${value === name ? 'is-selected' : ''}`}
          onClick={() => onSelect(name)}
        >
          {name}
        </button>
      ))}
    </div>
  );
}

export default SavedNamePicker;
