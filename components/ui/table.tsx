import React from 'react';

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  variant?: 'default' | 'operational';
  containerClassName?: string;
}

export function Table({
  className = '',
  containerClassName = '',
  variant = 'default',
  children,
  ...props
}: TableProps) {
  const isOperational = variant === 'operational';

  return (
    <div className={`w-full overflow-x-auto ${isOperational
      ? 'rounded-lg border border-border bg-surface shadow-subtle'
      : 'rounded-xl border border-border/20 bg-card/30 shadow-sm backdrop-blur-sm'} ${containerClassName}`}>
      <table className={`w-full border-collapse text-left text-sm ${isOperational ? 'min-w-[680px]' : 'min-w-[600px]'} ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ className = '', children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={`border-b border-border/25 bg-muted/15 ${className}`} {...props}>{children}</thead>;
}

export function TableBody({ className = '', children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={`divide-y divide-border/20 ${className}`} {...props}>{children}</tbody>;
}

export function TableRow({ className = '', children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={`transition-all duration-150 hover:bg-muted/15 ${className}`} {...props}>{children}</tr>;
}

export function TableHead({ className = '', children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) {
  return <th className={`px-4 py-3 text-[10px] font-extrabold text-muted-foreground/75 uppercase tracking-[0.14em] select-none ${className}`} {...props}>{children}</th>;
}

export function TableCell({ className = '', children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) {
  return <td className={`px-4 py-3 text-xs md:text-sm font-medium text-foreground/90 align-middle ${className}`} {...props}>{children}</td>;
}

export default Table;
