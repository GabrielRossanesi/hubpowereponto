'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  getCurrentDatabaseTenantContext,
  type DatabaseTenantContext,
} from '../lib/tenant-context-actions';
import { isDatabaseDataMode } from '../lib/data-mode';

// Module-level cache to share context across all mounts/components and prevent duplicate fetches
let cachedContextPromise: Promise<DatabaseTenantContext | null> | null = null;
let cachedContextValue: DatabaseTenantContext | null = null;
let cachedError: Error | null = null;

const DatabaseTenantContextContext = createContext<DatabaseTenantContext | null | undefined>(undefined);

export function DatabaseTenantContextProvider({
  context,
  children,
}: {
  context: DatabaseTenantContext | null;
  children: ReactNode;
}) {
  const value = useMemo(() => context, [context]);

  return (
    <DatabaseTenantContextContext.Provider value={value}>
      {children}
    </DatabaseTenantContextContext.Provider>
  );
}

export function useDatabaseTenantContext() {
  const providedContext = useContext(DatabaseTenantContextContext);
  const initialContext = providedContext === undefined ? cachedContextValue : providedContext;
  const [context, setContext] = useState<DatabaseTenantContext | null>(initialContext);
  const [isLoading, setIsLoading] = useState(
    providedContext === undefined && isDatabaseDataMode && !cachedContextValue && !cachedError,
  );
  const [error, setError] = useState<Error | null>(cachedError);

  useEffect(() => {
    if (providedContext !== undefined || !isDatabaseDataMode || cachedContextValue) {
      return;
    }

    let isActive = true;

    const loadContext = async () => {
      try {
        if (!cachedContextPromise) {
          cachedContextPromise = getCurrentDatabaseTenantContext();
        }
        setIsLoading(true);
        const nextContext = await cachedContextPromise;
        cachedContextValue = nextContext;
        if (isActive) {
          setContext(nextContext);
          setError(null);
        }
      } catch (err) {
        const errorObject = err instanceof Error ? err : new Error('Erro ao carregar tenant.');
        cachedError = errorObject;
        if (isActive) {
          setError(errorObject);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadContext();

    return () => {
      isActive = false;
    };
  }, [providedContext]);

  if (providedContext !== undefined) {
    return {
      context: providedContext,
      isLoading: false,
      error: null,
    };
  }

  return {
    context,
    isLoading,
    error,
  };
}
