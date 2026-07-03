'use client';

import { useEffect, useState } from 'react';
import {
  getCurrentDatabaseTenantContext,
  type DatabaseTenantContext,
} from '../lib/tenant-context-actions';
import { isDatabaseDataMode } from '../lib/data-mode';

// Module-level cache to share context across all mounts/components and prevent duplicate fetches
let cachedContextPromise: Promise<DatabaseTenantContext | null> | null = null;
let cachedContextValue: DatabaseTenantContext | null = null;
let cachedError: Error | null = null;

export function useDatabaseTenantContext() {
  const [context, setContext] = useState<DatabaseTenantContext | null>(cachedContextValue);
  const [isLoading, setIsLoading] = useState(isDatabaseDataMode && !cachedContextValue && !cachedError);
  const [error, setError] = useState<Error | null>(cachedError);

  useEffect(() => {
    if (!isDatabaseDataMode || cachedContextValue) {
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
  }, []);

  return {
    context,
    isLoading,
    error,
  };
}
