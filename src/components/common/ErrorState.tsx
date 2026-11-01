import React from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { AlertCircle } from 'lucide-react';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Retry',
  className = '',
}) => {
  return (
    <Card className={`border-red-200 bg-red-50/50 p-6 text-center ${className}`}>
      <div className="mx-auto w-10 h-10 flex items-center justify-center rounded-full bg-red-100 text-red-600 mb-3">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h3 className="text-base font-bold text-red-900">{title}</h3>
      <p className="mt-1 text-sm text-red-700 max-w-md mx-auto">{message}</p>
      {onRetry && (
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      )}
    </Card>
  );
};

