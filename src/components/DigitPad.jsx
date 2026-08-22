const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

function DigitPad({
  value,
  onChange,
  disabled = false,
  onSubmit,
  submitLabel = 'Submit',
  compact = false
}) {
  const digits = String(value || '').split('');
  const used = new Set(digits);

  const addDigit = (digit) => {
    if (disabled || digits.length >= 4 || used.has(digit)) return;
    onChange(`${value || ''}${digit}`);
  };

  const removeAt = (index) => {
    if (disabled || !digits[index]) return;
    onChange(digits.filter((_, i) => i !== index).join(''));
  };

  const backspace = () => {
    if (disabled || !digits.length) return;
    onChange(digits.slice(0, -1).join(''));
  };

  const clear = () => {
    if (disabled) return;
    onChange('');
  };

  return (
    <div className={`digit-pad ${compact ? 'is-compact' : ''}`}>
      <div className="digit-row" role="group" aria-label="Current number">
        {[0, 1, 2, 3].map((index) => (
          <button
            key={index}
            type="button"
            className={`digit-slot ${digits[index] ? '' : 'is-empty'} ${index === digits.length && !disabled ? 'is-caret' : ''}`}
            onClick={() => removeAt(index)}
            disabled={disabled}
            aria-label={digits[index] ? `Remove ${digits[index]} from slot ${index + 1}` : `Empty slot ${index + 1}`}
          >
            {digits[index] || '_'}
          </button>
        ))}
      </div>

      <div className="pad-keys" role="group" aria-label="Number pad">
        {KEYS.map((digit) => (
          <button
            key={digit}
            type="button"
            className="pad-key"
            onClick={() => addDigit(digit)}
            disabled={disabled || used.has(digit) || digits.length >= 4}
          >
            {digit}
          </button>
        ))}
      </div>

      <div className="guess-actions">
        <button type="button" className="btn-ghost" onClick={backspace} disabled={disabled || !digits.length}>
          Undo
        </button>
        <button type="button" className="btn-ghost" onClick={clear} disabled={disabled || !digits.length}>
          Clear
        </button>
        {onSubmit && (
          <button
            type="button"
            className="btn-primary"
            onClick={onSubmit}
            disabled={disabled || digits.length !== 4}
          >
            {submitLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default DigitPad;
