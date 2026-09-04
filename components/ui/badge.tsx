import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'muted' | 'success' | 'warning' | 'danger' | 'info';
}

export function Badge({ className = '', variant = 'default', children, ...props }: BadgeProps) {
  const baseStyles = 'inline-flex items-center rounded-full border px-2 py-0.5 text-caption font-semibold leading-4 select-none transition-colors';
  
  const variants = {
    default: 'bg-primary-subtle text-primary border-primary/15',
    muted: 'bg-muted text-foreground-muted border-border',
    success: 'bg-success-subtle text-success border-success/15',
    warning: 'bg-warning-subtle text-warning border-warning/15',
    danger: 'bg-danger-subtle text-danger border-danger/15',
    info: 'bg-info-subtle text-info border-info/15',
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
}

export default Badge;
