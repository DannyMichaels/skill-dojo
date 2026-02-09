import type { ButtonHTMLAttributes } from 'react';
import cn from 'classnames';
import './Button.scss';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={ cn(
        'Button',
        `Button--${variant}`,
        `Button--${size}`,
        { 'Button--fullWidth': fullWidth, 'Button--loading': loading },
        className,
      ) }
      disabled={ disabled || loading }
      { ...props }
    >
      { loading ? <span className="Button__spinner" /> : children }
    </button>
  );
}
