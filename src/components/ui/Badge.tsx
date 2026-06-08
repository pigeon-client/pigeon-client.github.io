import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
}

const variants = {
  success: 'bg-accent-green/10 text-accent-green',
  warning: 'bg-accent-orange/10 text-accent-orange',
  error: 'bg-accent-red/10 text-accent-red',
  info: 'bg-accent-blue/10 text-accent-blue',
  default: 'bg-bg-hover text-text-secondary',
};

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
}
