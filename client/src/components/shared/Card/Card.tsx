import type { HTMLAttributes, ReactNode } from 'react';
import cn from 'classnames';
import './Card.scss';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'glass';
  hoverable?: boolean;
}

export default function Card({
  children,
  variant = 'default',
  hoverable = false,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={ cn(
        'Card',
        `Card--${variant}`,
        { 'Card--hoverable': hoverable },
        className,
      ) }
      { ...props }
    >
      { children }
    </div>
  );
}
