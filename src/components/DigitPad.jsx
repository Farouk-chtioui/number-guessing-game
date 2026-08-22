import { useEffect, useRef } from 'react';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

function sanitizeDigits(raw) {
  const next = [];
  for (const character of String(raw).replace(/\D/g, '')) {
    if (!next.includes(character) && next.length < 4) {
      next.push(character);
    }
  }
  return next.join('');
}

function DigitPad({
  value,
  onChange,
  disabled = false,
  onSubmit,
  submitLabel = 'Submit',
  compact = false,
  autoFocus = false
}) {
  const inputRef = useRef(null);
  const digits = String(value || '').split('').filter(Boolean);
  const used = new Set(digits);

  const focusInput = () => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  };

  const addDigit = (digit) => {
    if (disabled || digits.length >= 4 || used.has(digit)) return;
    onChange(`${value || ''}${digit}`);
  };

  const backspace = () => {
    if (disabled || !digits.length) return;
    onChange(digits.slice(0, -1).join(''));
  };

  const clear = () => {
    if (disabled) return;
    onChange('');
  };

  useEffect(() => {
    if (autoFocus && !disabled) {
      inputRef.current?.focus();
    }
  }, [autoFocus, disabled]);

  useEffect(() => {
    if (disabled || compact) return undefined;

    const onKeyDown = (event) => {
      const target = event.target;
      const tag = target?.tagName;
      const typingInOtherField =
        (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) &&
        target !== inputRef.current;

      if (typingInOtherField) return;

      if (target === inputRef.current) {
        if (event.key === 'Enter' && onSubmit && digits.length === 4) {
          event.preventDefault();
          onSubmit();
        }
        return;
      }

      if (event.key >= '0' && event.key <= '9') {
        event.preventDefault();
        addDigit(event.key);
        focusInput();
        return;
      }

      if (event.key === 'Backspace') {
        event.preventDefault();
        backspace();
        focusInput();
        return;
      }

      if (event.key === 'Enter' && onSubmit && digits.length === 4) {
        event.preventDefault();
        onSubmit();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [disabled, compact, value, onSubmit, onChange]);

  return (
    <div className={`digit-pad ${compact ? 'is-compact' : ''}`}>
      <div className="guess-slots-wrap">
        <div className="digit-row" aria-hidden="true">
          {[0, 1, 2, 3].map((index) => (
            <span
              key={index}
              className={`digit-slot ${digits[index] ? '' : 'is-empty'} ${index === digits.length && !disabled ? 'is-caret' : ''}`}
            >
              {digits[index] || '_'}
            </span>
          ))}
        </div>
        <input
          ref={inputRef}
          className="digit-type-input"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          value={value || ''}
          disabled={disabled}
          aria-label="4-digit number"
          onChange={(event) => onChange(sanitizeDigits(event.target.value))}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && onSubmit && digits.length === 4) {
              event.preventDefault();
              onSubmit();
            }
          }}
        />
      </div>

      <div className="pad-keys" role="group" aria-label="Number pad">
        {KEYS.map((digit) => (
          <button
            key={digit}
            type="button"
            className="pad-key"
            onClick={() => {
              addDigit(digit);
              focusInput();
            }}
            disabled={disabled || used.has(digit) || digits.length >= 4}
          >
            {digit}
          </button>
        ))}
      </div>

      <div className="guess-actions">
        <button type="button" className="btn-ghost" onClick={() => { backspace(); focusInput(); }} disabled={disabled || !digits.length}>
          Undo
        </button>
        <button type="button" className="btn-ghost" onClick={() => { clear(); focusInput(); }} disabled={disabled || !digits.length}>
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
