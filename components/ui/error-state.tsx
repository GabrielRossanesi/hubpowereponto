import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import Button from './button';

interface ErrorStateProps {
  title?: string;
  description: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function ErrorState({
  title = 'Não foi possível carregar esta informação',
  description,
  onRetry,
  compact = false,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex gap-3 rounded-md border border-danger/20 bg-danger-subtle text-danger ${
        compact ? 'items-center px-3 py-2.5' : 'items-start p-4'
      }`}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-body-small font-semibold">{title}</p>
        <p className="mt-0.5 text-label leading-5 text-foreground-secondary">{description}</p>
      </div>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry} className="shrink-0 gap-1.5 text-danger">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

export default ErrorState;
