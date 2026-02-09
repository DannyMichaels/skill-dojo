import cn from 'classnames';
import './Spinner.scss';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <div className={ cn('Spinner', `Spinner--${size}`, className) } />
  );
}
