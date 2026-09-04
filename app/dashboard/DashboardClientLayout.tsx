'use client';

import React, { useCallback, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import Sidebar from '../../components/layout/sidebar';
import Topbar from '../../components/layout/topbar';
import AppShellAtmosphere from '../../components/layout/app-shell-atmosphere';
import AppContentContainer from '../../components/layout/app-content-container';
import { getPlanDefaultFeatures, useStore } from '../../lib/store';
import { useMounted } from '../../hooks/useMounted';
import { DatabaseTenantContextProvider } from '../../hooks/useDatabaseTenantContext';
import type { DatabaseTenantContext } from '../../lib/tenant-context-actions';
import { isDatabaseDataMode } from '../../lib/data-mode';

export default function DashboardClientLayout({
  children,
  initialTenantContext,
}: {
  children: React.ReactNode;
  initialTenantContext: DatabaseTenantContext | null;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const sandboxOrgId = useStore(state => state.currentOrganizationId);
  const sandboxOrganizations = useStore(state => state.organizations);
  const sandboxFeatureList = useStore(state => state.organizationFeatures);
  const hasMounted = useMounted();

  const sandboxOrganization = sandboxOrganizations.find(org => org.id === sandboxOrgId);
  const sandboxFeatures = sandboxFeatureList.find(features => features.organizationId === sandboxOrgId) ?? {
    organizationId: sandboxOrgId,
    ...getPlanDefaultFeatures(sandboxOrganization?.planId ?? 'starter'),
  };
  const currentFeatures = isDatabaseDataMode ? initialTenantContext?.features : sandboxFeatures;
  const currentWorkspaceName = isDatabaseDataMode
    ? initialTenantContext?.organization.name
    : sandboxOrganization?.name;
  const openMobileSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeMobileSidebar = useCallback(() => setSidebarOpen(false), []);

  const routeFeatureMap: Record<string, string> = {
    '/leads': 'leads',
    '/clientes': 'clients',
    '/propostas': 'proposals',
    '/contratos': 'contracts',
    '/cobrancas': 'charges',
    '/onboarding': 'onboarding',
    '/publicacoes': 'publications',
    '/tarefas': 'tasks',
    '/historico': 'history',
    '/financeiro': 'financial',
  };

  const matchedRoute = Object.keys(routeFeatureMap).find(route => pathname?.startsWith(route));
  let isBlocked = false;

  if (hasMounted && matchedRoute && currentFeatures) {
    const featureKey = routeFeatureMap[matchedRoute] as keyof Omit<typeof currentFeatures, 'organizationId'>;
    isBlocked = currentFeatures[featureKey] === false;
  }

  return (
    <DatabaseTenantContextProvider context={initialTenantContext}>
      <div className="relative isolate flex h-dvh w-full overflow-hidden bg-background text-foreground">
        <AppShellAtmosphere />
        <Sidebar isOpen={sidebarOpen} onClose={closeMobileSidebar} triggerRef={menuButtonRef} />

        <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar
            onMenuClick={openMobileSidebar}
            isMobileMenuOpen={sidebarOpen}
            menuButtonRef={menuButtonRef}
            workspaceName={currentWorkspaceName}
          />

          <main id="main-content" className="relative flex-1 overflow-y-auto bg-transparent">
            <AppContentContainer className="relative z-10 min-h-full py-page">
              {isBlocked ? (
                <section className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center" aria-labelledby="blocked-title">
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg border border-warning/20 bg-warning-subtle text-warning">
                    <Lock className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h1 id="blocked-title" className="text-page-title font-semibold tracking-tight">
                    Módulo indisponível no plano atual
                  </h1>
                  <p className="mt-2 text-body-small text-foreground-muted">
                    A organização atual não possui acesso a este módulo. Um operador do NV Hub pode revisar as funcionalidades do plano.
                  </p>
                  <Link
                    href="/dashboard"
                    className="mt-6 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-label font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                  >
                    Voltar ao Dashboard
                  </Link>
                </section>
              ) : (
                children
              )}
            </AppContentContainer>
          </main>
        </div>
      </div>
    </DatabaseTenantContextProvider>
  );
}
