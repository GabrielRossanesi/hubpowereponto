import type { ReactNode } from 'react';
import { forbidden } from 'next/navigation';
import DashboardLayout from '../dashboard/layout';
import { isDatabaseDataMode } from '../../lib/data-mode';
import { isOperator } from '../../lib/tenant';

export const dynamic = 'force-dynamic';

export default async function EmpresasLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (isDatabaseDataMode) {
    const hasOperatorAccess = await isOperator();
    if (!hasOperatorAccess) {
      forbidden();
    }
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
