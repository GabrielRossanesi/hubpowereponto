'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Building2, Menu } from 'lucide-react';
import ThemeToggle from '../ui/theme-toggle';
import IconButton from '../ui/icon-button';
import AppContentContainer from './app-content-container';

interface TopbarProps {
  onMenuClick: () => void;
  isMobileMenuOpen: boolean;
  menuButtonRef: React.RefObject<HTMLButtonElement | null>;
  workspaceName?: string;
}

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  leads: 'Leads',
  clientes: 'Clientes',
  propostas: 'Propostas',
  contratos: 'Contratos',
  cobrancas: 'Cobranças',
  financeiro: 'Financeiro',
  onboarding: 'Onboarding',
  publicacoes: 'Publicações',
  tarefas: 'Tarefas',
  historico: 'Histórico',
  configuracoes: 'Configurações',
  empresas: 'Empresas',
};

export function Topbar({
  onMenuClick,
  isMobileMenuOpen,
  menuButtonRef,
  workspaceName,
}: TopbarProps) {
  const pathname = usePathname();
  const currentSegment = pathname?.split('/').filter(Boolean)[0] ?? 'dashboard';
  const currentLabel = routeLabels[currentSegment] ?? 'NV Hub';

  return (
    <header className="relative z-30 h-[4.25rem] shrink-0 border-b border-border/80 bg-shell-topbar">
      <AppContentContainer className="flex h-full items-center gap-3 lg:gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <IconButton
            ref={menuButtonRef}
            variant="ghost"
            size="sm"
            className="rounded-md text-foreground-secondary lg:hidden"
            label="Abrir menu principal"
            aria-expanded={isMobileMenuOpen}
            aria-controls="nvhub-sidebar"
            onClick={onMenuClick}
          >
            <Menu className="h-4.5 w-4.5" aria-hidden="true" />
          </IconButton>

          <span className="hidden h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_color-mix(in_srgb,var(--primary)_55%,transparent)] sm:block" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[0.625rem] font-semibold uppercase tracking-[0.15em] text-foreground-muted">Área de trabalho</p>
            <p className="mt-0.5 truncate text-body-small font-semibold text-foreground">{currentLabel}</p>
          </div>
        </div>

        <span className="nv-topbar-connector hidden min-w-10 flex-1 lg:block" aria-hidden="true" />

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {workspaceName && (
            <div className="hidden min-w-0 items-center gap-2.5 border-r border-border pr-3 md:flex">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface-subtle text-foreground-muted">
                <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[0.5625rem] font-semibold uppercase tracking-[0.12em] text-foreground-muted">Workspace</p>
                <p className="max-w-40 truncate text-caption font-medium text-foreground-secondary">{workspaceName}</p>
              </div>
            </div>
          )}
          <ThemeToggle />
        </div>
      </AppContentContainer>
    </header>
  );
}

export default Topbar;
