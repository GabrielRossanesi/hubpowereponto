'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './theme-provider';
import IconButton from './icon-button';
import { useMounted } from '../../hooks/useMounted';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) {
    return (
      <span className="block h-9 w-9 rounded-md border border-border bg-surface-subtle" aria-hidden="true" />
    );
  }

  return (
    <IconButton
      variant="ghost"
      size="sm"
      className="rounded-md border border-border bg-surface-subtle text-foreground-muted shadow-subtle hover:border-border-strong hover:bg-surface hover:text-primary"
      onClick={toggleTheme}
      label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" aria-hidden="true" />
      )}
    </IconButton>
  );
}

export default ThemeToggle;
