import { getSavedNames } from '../savedNames';

function SavedNamePicker({ id, value, onChange, autoFocus = false }) {
  const names = getSavedNames();
  const listId = `${id}-saved`;

  return (
    <>
      <input
        id={id}
        list={listId}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="sameoldsteven"
        autoComplete="off"
        autoFocus={autoFocus}
      />
      <datalist id={listId}>
        {names.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </>
  );
}

export default SavedNamePicker;
