import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import cn from 'classnames';
import './Input.scss';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className={ cn('FormGroup', className) }>
        { label && (
          <label className="FormGroup__label" htmlFor={ inputId }>
            { label }
          </label>
        ) }
        <input
          ref={ ref }
          id={ inputId }
          className={ cn('Input', { 'Input--error': error }) }
          { ...props }
        />
        { error && <span className="FormGroup__error">{ error }</span> }
      </div>
    );
  },
);

Input.displayName = 'Input';
export default Input;
