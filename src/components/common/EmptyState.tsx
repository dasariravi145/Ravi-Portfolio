import React from 'react';
import { Card } from './Card';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  action,
  className = '',
}) => {
  return (
    <Card className={`text-center py-12 px-6 ${className}`}>
      {icon && (
        <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-bold text-slate-800">{title}</h3>
      <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">{description}</p>
      {action ? (
        <div className="mt-6 flex justify-center">{action}</div>
      ) : actionText && onAction ? (
        <div className="mt-6 flex justify-center">
          <Button variant="secondary" size="sm" onClick={onAction}>
            {actionText}
          </Button>
        </div>
      ) : null}
    </Card>
  );
};

