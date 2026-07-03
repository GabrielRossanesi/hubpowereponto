import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '../../lib/tenant';
import { isDatabaseDataMode } from '../../lib/data-mode';
import prisma from '../../lib/prisma';
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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { mustChangePassword: true },
    });

    if (user?.mustChangePassword) {
      redirect('/primeiro-acesso');
    }
  }

  return <DashboardClientLayout>{children}</DashboardClientLayout>;
}
