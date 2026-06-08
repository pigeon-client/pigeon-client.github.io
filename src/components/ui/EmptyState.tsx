import { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="text-text-tertiary mb-3">{icon}</div>
      <h3 className="text-sm font-medium text-text-secondary mb-1">{title}</h3>
      {description && <p className="text-xs text-text-tertiary text-center max-w-xs mb-4">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
