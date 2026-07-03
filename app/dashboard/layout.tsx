import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '../../lib/tenant';
import { isDatabaseDataMode } from '../../lib/data-mode';
import DashboardClientLayout from './DashboardClientLayout';

export const dynamic = 'force-dynamic';

export default async function ServerDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (isDatabaseDataMode) {
    const session = await getSession();
    if (!session) {
      redirect('/login');
    }
  }

  return <DashboardClientLayout>{children}</DashboardClientLayout>;
}
