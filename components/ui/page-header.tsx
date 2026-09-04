import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
  variant?: 'legacy' | 'operational';
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  variant = 'legacy',
  className = '',
}: PageHeaderProps) {
  const isOperational = variant === 'operational';

  return (
    <div className={`flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:justify-between ${
      isOperational ? 'sm:items-end' : 'mb-6 sm:items-center'
    } ${className}`}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 flex items-center gap-2 text-caption font-bold uppercase tracking-[0.14em] text-primary">
            <span className="h-px w-5 bg-primary" aria-hidden="true" />
            {eyebrow}
          </p>
        )}
        <h1 className={isOperational
          ? 'text-page-title font-semibold tracking-[-0.025em] text-foreground sm:text-display'
          : 'text-2xl font-bold tracking-tight text-foreground sm:text-3xl'}>
          {title}
        </h1>
        {description && (
          <p className={`${isOperational ? 'mt-1.5 max-w-2xl text-body-small text-foreground-muted' : 'mt-1 text-sm text-muted-foreground'}`}>
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
