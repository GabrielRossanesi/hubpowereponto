import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  variant?: 'default' | 'panel' | 'flat';
}

export function Card({ className = '', hoverable, variant = 'default', children, ...props }: CardProps) {
  const variants = {
    default: 'rounded-xl border border-border/40 bg-card text-card-foreground shadow-sm',
    panel: 'rounded-lg border border-border bg-surface text-foreground shadow-subtle',
    flat: 'rounded-lg border border-border bg-surface-subtle text-foreground',
  };

  return (
    <div
      className={`${variants[variant]} transition-[border-color,box-shadow,transform] duration-200 ${
        hoverable
          ? 'hover:shadow-[0_12px_24px_-10px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_12px_24px_-10px_rgba(0,0,0,0.6)] hover:-translate-y-0.5 hover:border-primary/45 cursor-pointer'
          : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props}>{children}</div>;
}

export function CardTitle({ className = '', children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`text-base font-bold leading-none tracking-tight text-foreground/90 ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className = '', children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-xs text-muted-foreground leading-normal ${className}`} {...props}>{children}</p>;
}

export function CardContent({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-6 pt-0 ${className}`} {...props}>{children}</div>;
}

export function CardHeaderContent({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`px-6 py-4 border-b border-border/20 ${className}`} {...props}>{children}</div>;
}

export function CardFooter({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex items-center p-6 pt-0 border-t border-border/10 mt-6 ${className}`} {...props}>{children}</div>;
}

export default Card;
