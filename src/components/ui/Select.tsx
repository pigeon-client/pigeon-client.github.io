import { SelectHTMLAttributes, ReactNode } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  icon?: ReactNode;
}

export function Select({ icon, children, className = '', ...props }: SelectProps) {
  return (
    <div className="relative">
      {icon && (
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
          {icon}
        </div>
      )}
      <select
        className={`appearance-none px-3 py-2 pr-8 text-sm font-medium bg-bg-secondary text-text-primary
          border border-border-primary rounded-lg cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue
          transition-all duration-150 ${icon ? 'pl-9' : ''} ${className}`}
        {...props}
      >
        {children}
      </select>
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-tertiary">
        <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}
