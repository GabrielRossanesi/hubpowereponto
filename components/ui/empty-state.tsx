import React from 'react';
import { FolderOpen } from 'lucide-react';
import Link from 'next/link';
import Button from './button';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  href?: string;
  icon?: React.ReactNode;
  compact?: boolean;
}

export function EmptyState({ title, description, actionLabel, onAction, href, icon, compact = false }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center px-4 text-center ${compact ? 'py-8' : 'py-12'} border border-dashed border-border rounded-lg bg-surface-subtle`}>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary-subtle text-primary">
        {icon || <FolderOpen className="h-6 w-6" />}
      </div>
      <h3 className="text-card-title font-semibold text-foreground">
        {title}
      </h3>
      <p className="mt-1 max-w-sm text-body-small text-foreground-muted">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm" className="mt-5">
          {actionLabel}
        </Button>
      )}
      {actionLabel && href && !onAction && (
        <Link
          href={href}
          className="mt-5 inline-flex h-8 items-center justify-center rounded-md border border-border-strong bg-surface px-3 text-label font-semibold text-foreground transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

export default EmptyState;
