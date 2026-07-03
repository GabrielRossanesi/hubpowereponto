'use client';

import { useEffect, useState } from 'react';
import {
  getCurrentDatabaseTenantContext,
  type DatabaseTenantContext,
} from '../lib/tenant-context-actions';
import { isDatabaseDataMode } from '../lib/data-mode';

export function useDatabaseTenantContext() {
  const [context, setContext] = useState<DatabaseTenantContext | null>(null);
  const [isLoading, setIsLoading] = useState(isDatabaseDataMode);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isDatabaseDataMode) {
      return;
    }

    let isActive = true;

    const loadContext = async () => {
      try {
        setIsLoading(true);
        const nextContext = await getCurrentDatabaseTenantContext();
        if (isActive) {
          setContext(nextContext);
          setError(null);
        }
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err : new Error('Erro ao carregar tenant.'));
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
