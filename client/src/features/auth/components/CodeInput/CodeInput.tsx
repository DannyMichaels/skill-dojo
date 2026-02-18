import { useRef, useCallback } from 'react';
import cn from 'classnames';
import './CodeInput.scss';

interface CodeInputProps {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
}

const CODE_LENGTH = 6;

export default function CodeInput({ value, onChange, disabled, error }: CodeInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const digits = Array.from({ length: CODE_LENGTH }, (_, i) => value[i] || '');

  const focusInput = (index: number) => {
    inputsRef.current[index]?.focus();
  };

  const handleChange = useCallback(
    (index: number, digit: string) => {
      if (!/^\d?$/.test(digit)) return;
      const arr = Array.from({ length: CODE_LENGTH }, (_, i) => value[i] || '');
      arr[index] = digit;
      const newCode = arr.join('');
      onChange(newCode);
      if (digit && index < CODE_LENGTH - 1) {
        focusInput(index + 1);
      }
    },
    [value, onChange],
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !digits[index]?.trim() && index > 0) {
        focusInput(index - 1);
      }
    },
    [digits],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
      if (pasted) {
        onChange(pasted);
        focusInput(Math.min(pasted.length, CODE_LENGTH - 1));
      }
    },
    [onChange],
  );

  return (
    <div className={cn('CodeInput', { 'CodeInput--error': error })}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit.trim()}
          disabled={disabled}
          className="CodeInput__digit"
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
}
