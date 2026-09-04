import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '../../lib/tenant';
import { isDatabaseDataMode } from '../../lib/data-mode';
import { getCurrentDatabaseTenantContext, type DatabaseTenantContext } from '../../lib/tenant-context-actions';
import { measureServerTiming } from '../../lib/performance';
import DashboardClientLayout from './DashboardClientLayout';

export const dynamic = 'force-dynamic';

export default async function ServerDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  let tenantContext: DatabaseTenantContext | null = null;

  if (isDatabaseDataMode) {
    const result = await measureServerTiming('app/layout-auth-context', async () => {
      const session = await getSession();
      const context = session ? await getCurrentDatabaseTenantContext() : null;
      return { session, context };
    });

    const { session, context } = result;
    if (!session) {
      redirect('/login');
    }

    if (context?.mustChangePassword) {
      redirect('/primeiro-acesso');
    }

    tenantContext = context;
  }

  return (
    <DashboardClientLayout initialTenantContext={tenantContext}>
      {children}
    </DashboardClientLayout>
  );
}
