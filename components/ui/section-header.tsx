import React from 'react';

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  id?: string;
}

export function SectionHeader({ eyebrow, title, description, actions, id }: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 flex items-center gap-2 text-caption font-bold uppercase tracking-[0.14em] text-primary">
            <span aria-hidden="true" className="h-px w-5 bg-primary" />
            {eyebrow}
          </p>
        )}
        <h2 id={id} className="text-section-title font-semibold tracking-[-0.01em] text-foreground">
          {title}
        </h2>
        {description && (
          <p className="mt-1 max-w-2xl text-body-small text-foreground-muted">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}

export default SectionHeader;
