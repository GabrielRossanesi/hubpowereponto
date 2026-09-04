import React from 'react';

interface TableToolbarProps {
  search: React.ReactNode;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  resultSummary?: React.ReactNode;
}

export function TableToolbar({ search, filters, actions, resultSummary }: TableToolbarProps) {
  return (
    <section aria-label="Ferramentas da listagem" className="overflow-hidden rounded-lg border border-border bg-surface shadow-subtle">
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <div className="w-full sm:max-w-md">{search}</div>
        {resultSummary && <div className="text-label text-foreground-muted sm:ml-auto">{resultSummary}</div>}
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {filters && (
        <div className="flex items-center gap-2 border-t border-border px-3 py-2.5">
          {filters}
        </div>
      )}
    </section>
  );
}

export default TableToolbar;
