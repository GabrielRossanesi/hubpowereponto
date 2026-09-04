import React from 'react';
import { Search, X } from 'lucide-react';
import IconButton from './icon-button';

export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  onClear?: () => void;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className = '', label, onClear, value, ...props }, ref) => {
    const hasValue = typeof value === 'string' && value.length > 0;

    return (
      <div className="relative w-full">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" aria-hidden="true" />
        <input
          ref={ref}
          type="search"
          aria-label={label}
          value={value}
          className={`h-10 w-full rounded-md border border-border bg-surface pl-9 pr-10 text-body-small text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-foreground-muted focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-primary/25 ${className}`}
          {...props}
        />
        {hasValue && onClear && (
          <IconButton
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-md"
            label="Limpar busca"
            onClick={onClear}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </IconButton>
        )}
      </div>
    );
  },
);

SearchInput.displayName = 'SearchInput';

export default SearchInput;
