import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

type MetricTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  description?: string;
  trend?: {
    value: string;
    type: 'positive' | 'negative' | 'neutral';
  };
  tone?: MetricTone;
  href?: string;
}

const toneClasses: Record<MetricTone, string> = {
  neutral: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
};

export function MetricCard({
  title,
  value,
  icon,
  description,
  trend,
  tone = 'neutral',
  href,
}: MetricCardProps) {
  const content = (
    <>
      <span className={`absolute inset-x-0 top-0 h-0.5 ${toneClasses[tone]}`} aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <span className="text-label font-medium text-foreground-muted">{title}</span>
        {icon && <span className="text-foreground-muted">{icon}</span>}
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <span className="block font-mono text-metric font-semibold tracking-[-0.04em] text-foreground tabular-nums">
            {value}
          </span>
          {(description || trend) && (
            <p className="mt-1 truncate text-caption text-foreground-muted">
              {trend?.value || description}
            </p>
          )}
        </div>
        {href && <ArrowUpRight className="h-4 w-4 shrink-0 text-foreground-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />}
      </div>
    </>
  );

  const classes = 'group relative min-h-28 overflow-hidden rounded-lg border border-border bg-surface p-card shadow-subtle transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-none';

  return href ? (
    <Link href={href} className={`${classes} block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35`}>
      {content}
    </Link>
  ) : (
    <div className={classes}>{content}</div>
  );
}

export default MetricCard;
