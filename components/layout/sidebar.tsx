'use client';

import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Briefcase,
  Building2,
  CheckSquare,
  CreditCard,
  FileText,
  History,
  Landmark,
  LayoutDashboard,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Target,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import IconButton from '../ui/icon-button';
import { useStore, getPlanDefaultFeatures } from '../../lib/store';
import { useMounted } from '../../hooks/useMounted';
import { useDatabaseTenantContext } from '../../hooks/useDatabaseTenantContext';
import { isDatabaseDataMode } from '../../lib/data-mode';
import { LogoSidebar } from '../ui/logo';
import AccountMenu from './account-menu';
import WorkspaceSwitcher from './workspace-switcher';

interface MenuItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  feature?: string;
  isOperator?: boolean;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

interface NavigationTooltipState {
  label: string;
  top: number;
}

const desktopMediaQuery = '(min-width: 1024px)';

function subscribeToDesktop(callback: () => void) {
  const query = window.matchMedia(desktopMediaQuery);
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
}

function getDesktopSnapshot() {
  return window.matchMedia(desktopMediaQuery).matches;
}

function getServerDesktopSnapshot() {
  return false;
}

const menuGroups: { title: string; items: MenuItem[] }[] = [
  {
    title: 'Comercial',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Leads', href: '/leads', icon: Target, feature: 'leads' },
      { label: 'Clientes', href: '/clientes', icon: Users, feature: 'clients' },
      { label: 'Propostas', href: '/propostas', icon: FileText, feature: 'proposals' },
      { label: 'Contratos', href: '/contratos', icon: Briefcase, feature: 'contracts' },
      { label: 'Cobranças', href: '/cobrancas', icon: CreditCard, feature: 'charges' },
    ],
  },
  {
    title: 'Operações',
    items: [
      { label: 'Onboarding', href: '/onboarding', icon: UserPlus, feature: 'onboarding' },
      { label: 'Publicações', href: '/publicacoes', icon: Megaphone, feature: 'publications' },
      { label: 'Tarefas', href: '/tarefas', icon: CheckSquare, feature: 'tasks' },
      { label: 'Histórico', href: '/historico', icon: History, feature: 'history' },
    ],
  },
  {
    title: 'Gestão',
    items: [
      { label: 'Financeiro', href: '/financeiro', icon: Landmark, feature: 'financial' },
      { label: 'Configurações', href: '/configuracoes', icon: Settings },
    ],
  },
  {
    title: 'Administração',
    items: [{ label: 'Empresas', href: '/empresas', icon: Building2, isOperator: true }],
  },
];

export function Sidebar({ isOpen, onClose, triggerRef }: SidebarProps) {
  const pathname = usePathname();
  const storedSidebarCollapsed = useStore(state => state.isSidebarCollapsed);
  const sandboxCurrentOrganizationId = useStore(state => state.currentOrganizationId);
  const sandboxOrganizations = useStore(state => state.organizations);
  const sandboxFeatureList = useStore(state => state.organizationFeatures);
  const sandboxCurrentUser = useStore(state => state.currentUser);
  const sandboxTeamMembers = useStore(state => state.teamMembers);
  const setCurrentOrganizationId = useStore(state => state.setCurrentOrganizationId);
  const toggleSidebar = useStore(state => state.toggleSidebar);
  const hasMounted = useMounted();
  const { context: databaseTenantContext } = useDatabaseTenantContext();
  const isDesktop = useSyncExternalStore(subscribeToDesktop, getDesktopSnapshot, getServerDesktopSnapshot);
  const showCompact = isDesktop && storedSidebarCollapsed;
  const panelRef = useRef<HTMLElement>(null);
  const mobileCloseRef = useRef<HTMLButtonElement>(null);
  const [navigationTooltip, setNavigationTooltip] = useState<NavigationTooltipState | null>(null);

  const sandboxOrganization = sandboxOrganizations.find(org => org.id === sandboxCurrentOrganizationId);
  const sandboxFeatures = sandboxFeatureList.find(features => features.organizationId === sandboxCurrentOrganizationId) ?? {
    organizationId: sandboxCurrentOrganizationId,
    ...getPlanDefaultFeatures(sandboxOrganization?.planId ?? 'starter'),
  };
  const currentOrganizationId = isDatabaseDataMode
    ? databaseTenantContext?.organization.id || ''
    : (hasMounted ? sandboxCurrentOrganizationId : 'org_hub_power');
  const currentFeatures = isDatabaseDataMode
    ? databaseTenantContext?.features || getPlanDefaultFeatures('pro')
    : (hasMounted ? sandboxFeatures : getPlanDefaultFeatures('pro'));
  const sandboxUser = hasMounted
    ? sandboxCurrentUser
    : sandboxTeamMembers.find(member => member.organizationId === 'org_hub_power') || sandboxTeamMembers[0];
  const organizations = isDatabaseDataMode
    ? (databaseTenantContext ? [databaseTenantContext.organization] : [])
    : sandboxOrganizations;
  const currentOrganization = organizations.find(org => org.id === currentOrganizationId) || organizations[0];
  const displayUserName = isDatabaseDataMode
    ? databaseTenantContext?.userName || 'Usuário'
    : sandboxUser?.name || 'Usuário';
  const displayUserRole = isDatabaseDataMode
    ? databaseTenantContext?.membershipRole || 'Membro'
    : sandboxUser?.role || 'Membro';
  const displayUserPermission = isDatabaseDataMode
    ? databaseTenantContext?.membershipRole
    : sandboxUser?.userRole;
  const displayUserInitials = displayUserName
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'US';

  const closeMobileNavigation = useCallback(() => {
    setNavigationTooltip(null);
    if (isDesktop) return;
    onClose();
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, [isDesktop, onClose, triggerRef]);

  const toggleSidebarPreference = () => {
    const nextCollapsedState = !useStore.getState().isSidebarCollapsed;
    document.documentElement.dataset.sidebarCollapsed = String(nextCollapsedState);
    setNavigationTooltip(null);
    toggleSidebar();
  };

  useEffect(() => {
    if (!isOpen || isDesktop) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => mobileCloseRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMobileNavigation();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusableElements = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(element => element.getClientRects().length > 0);
      if (focusableElements.length === 0) return;

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeMobileNavigation, isDesktop, isOpen]);

  const filterMenuItems = (items: MenuItem[]) => items.filter(item => {
    if (item.feature) {
      const key = item.feature as keyof Omit<typeof currentFeatures, 'organizationId'>;
      if (currentFeatures[key] === false) return false;
    }

    if (item.isOperator && isDatabaseDataMode) {
      return databaseTenantContext?.platformRole === 'operator' || databaseTenantContext?.platformRole === 'platform_admin';
    }

    return true;
  });

  const showTooltip = (element: HTMLElement, label: string) => {
    if (!showCompact) return;
    const rect = element.getBoundingClientRect();
    setNavigationTooltip({ label, top: rect.top + rect.height / 2 });
  };

  return (
    <>
      {isOpen && !isDesktop && (
        <div
          className="fixed inset-0 z-40 bg-black/55"
          aria-hidden="true"
          onMouseDown={closeMobileNavigation}
        />
      )}

      <aside
        id="nvhub-sidebar"
        ref={panelRef}
        aria-label="Navegação principal"
        aria-hidden={!isDesktop && !isOpen}
        inert={!isDesktop && !isOpen}
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col overflow-x-hidden border-r border-border/80 bg-shell-sidebar shadow-elevated transition-[transform,width] duration-200 ease-out lg:relative lg:translate-x-0 lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${showCompact ? 'lg:w-18' : 'lg:w-64'}`}
      >
        <span className={`nv-brand-signal absolute left-0 top-0 h-0.5 ${showCompact ? 'w-18' : 'w-24'}`} aria-hidden="true" />

        <div
          id="nvhub-sidebar-header"
          className={`flex h-[4.25rem] shrink-0 items-center justify-between border-b border-border/80 ${showCompact ? 'px-0' : 'px-4'}`}
        >
          <Link
            id="nvhub-sidebar-brand-link"
            href="/dashboard"
            onClick={closeMobileNavigation}
            aria-label="Ir para o Dashboard"
            className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <LogoSidebar isCollapsed={showCompact} />
          </Link>
          <IconButton
            id="nvhub-sidebar-toggle"
            variant="ghost"
            size="sm"
            className={`hidden rounded-md border border-border text-foreground-muted hover:border-border-strong hover:bg-surface-subtle hover:text-foreground lg:inline-flex ${showCompact ? 'h-9 w-9' : 'h-9 w-9'}`}
            label={storedSidebarCollapsed ? 'Expandir navegação' : 'Recolher navegação'}
            aria-controls="nvhub-sidebar-navigation"
            aria-expanded={!storedSidebarCollapsed}
            onClick={toggleSidebarPreference}
          >
            {storedSidebarCollapsed
              ? <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
              : <PanelLeftClose className="h-4 w-4" aria-hidden="true" />}
          </IconButton>
          {!isDesktop && (
            <IconButton
              ref={mobileCloseRef}
              variant="ghost"
              size="sm"
              className="rounded-md text-foreground-muted lg:hidden"
              label="Fechar menu principal"
              onClick={closeMobileNavigation}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </IconButton>
          )}
        </div>

        <div id="nvhub-sidebar-workspace" className={`shrink-0 border-b border-border/80 ${showCompact ? 'p-3' : 'px-3 py-4'}`}>
          <WorkspaceSwitcher
            organizations={organizations}
            currentOrganization={currentOrganization}
            isCollapsed={showCompact}
            canSwitch={!isDatabaseDataMode && organizations.length > 1}
            onChange={setCurrentOrganizationId}
          />
        </div>

        <nav id="nvhub-sidebar-navigation" className={`min-h-0 flex-1 overflow-y-auto py-4 ${showCompact ? 'px-2' : 'px-3'}`}>
          <div className={showCompact ? 'space-y-2' : 'space-y-4'}>
            {menuGroups.map((group, groupIndex) => {
              const items = filterMenuItems(group.items);
              if (items.length === 0) return null;

              return (
                <div key={group.title}>
                  {!showCompact && (
                    <p className="nv-sidebar-expanded-only mb-1.5 px-2.5 text-[0.625rem] font-semibold uppercase tracking-[0.17em] text-foreground-muted">
                      {group.title}
                    </p>
                  )}
                  {showCompact && groupIndex > 0 && <div className="mx-2 mb-2 h-px bg-border" aria-hidden="true" />}
                  <div className="space-y-0.5">
                    {items.map(item => {
                      const Icon = item.icon;
                      const isActive = pathname?.startsWith(item.href) ?? false;

                      return (
                        <div key={item.href} className="group relative">
                          <Link
                            href={item.href}
                            onClick={closeMobileNavigation}
                            onMouseEnter={event => showTooltip(event.currentTarget, item.label)}
                            onMouseLeave={() => setNavigationTooltip(null)}
                            onFocus={event => showTooltip(event.currentTarget, item.label)}
                            onBlur={() => setNavigationTooltip(null)}
                            aria-label={showCompact ? item.label : undefined}
                            aria-current={isActive ? 'page' : undefined}
                            aria-describedby={showCompact ? 'sidebar-navigation-tooltip' : undefined}
                            className={`nv-sidebar-item relative flex h-11 items-center rounded-lg text-body-small font-medium transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 ${
                              showCompact ? 'justify-center px-0' : 'gap-3 px-2.5'
                            } ${
                              isActive
                                ? 'nv-nav-active text-foreground before:absolute before:inset-y-2.5 before:left-0 before:w-0.5 before:rounded-full before:bg-primary'
                                : 'text-foreground-secondary hover:bg-surface/60 hover:text-foreground'
                            }`}
                          >
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-[background-color,color,box-shadow] ${
                              isActive
                                ? 'bg-surface-elevated text-primary shadow-subtle'
                                : 'text-foreground-muted group-hover:bg-surface-subtle group-hover:text-foreground-secondary'
                            }`}>
                              <Icon className="h-5 w-5" aria-hidden="true" />
                            </span>
                            {!showCompact && <span className="nv-sidebar-expanded-only min-w-0 flex-1 truncate">{item.label}</span>}
                            {!showCompact && item.isOperator && (
                              <span className="nv-sidebar-expanded-only rounded-sm bg-primary-subtle px-1.5 py-0.5 text-[0.5625rem] font-bold uppercase tracking-wide text-primary">Admin</span>
                            )}
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </nav>

        <div id="nvhub-sidebar-account" className="shrink-0 border-t border-border/80 bg-shell-sidebar p-3">
          <AccountMenu
            name={displayUserName}
            role={displayUserRole}
            initials={displayUserInitials}
            isAdmin={displayUserPermission === 'admin'}
            isCollapsed={showCompact}
            onNavigate={closeMobileNavigation}
          />
        </div>
      </aside>

      {showCompact && navigationTooltip && hasMounted && createPortal(
        <div
          id="sidebar-navigation-tooltip"
          role="tooltip"
          className="pointer-events-none fixed left-20 z-[70] -translate-y-1/2 rounded-md border border-border-strong/70 bg-surface-elevated px-2.5 py-1.5 text-label font-medium text-foreground shadow-elevated"
          style={{ top: navigationTooltip.top }}
        >
          {navigationTooltip.label}
        </div>,
        document.body,
      )}
    </>
  );
}

export default Sidebar;
