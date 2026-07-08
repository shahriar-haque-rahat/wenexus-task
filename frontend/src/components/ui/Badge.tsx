import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'pending' | 'confirmed' | 'failed' | 'default';
  title?: string;
  className?: string;
}

export function Badge({ children, variant = 'default', title, className = '' }: BadgeProps) {
  return (
    <span
      className={`badge badge--${variant} ${className}`}
      title={title}
    >
      <span className="badge__dot" aria-hidden="true" />
      {children}
    </span>
  );
}
