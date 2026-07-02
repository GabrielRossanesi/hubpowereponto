'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, FileText, Briefcase,
  CreditCard, UserPlus, Megaphone, CheckSquare,
  History, Settings, X, Building2, Target, ChevronLeft, ChevronRight,
  Landmark
} from 'lucide-react';
import Button from '../ui/button';
import { useTenantStore, getPlanDefaultFeatures } from '../../lib/store';
import { useMounted } from '../../hooks/useMounted';
import { LogoSidebar } from '../ui/logo';

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
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const store = useTenantStore();
  const hasMounted = useMounted();

  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);

  // Grouped menu items as requested
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
        { label: 'Financeiro', href: '/financeiro', icon: Landmark, feature: 'financial' },
      ]
    },
    {
      title: 'Operação',
      items: [
        { label: 'Onboarding', href: '/onboarding', icon: UserPlus, feature: 'onboarding' },
        { label: 'Publicações', href: '/publicacoes', icon: Megaphone, feature: 'publications' },
        { label: 'Tarefas', href: '/tarefas', icon: CheckSquare, feature: 'tasks' },
        { label: 'Histórico', href: '/historico', icon: History, feature: 'history' },
      ]
    },
    {
      title: 'Sistema',
      items: [
        { label: 'Configurações', href: '/configuracoes', icon: Settings },
      ]
    },
    {
      title: 'Operador',
      items: [
        { label: 'Empresas', href: '/empresas', icon: Building2, isOperator: true }
      ]
    }
  ];

  // Stable server defaults to prevent hydration mismatch
  const isSidebarCollapsed = hasMounted ? store.isSidebarCollapsed : false;
  const currentOrganizationId = hasMounted ? store.currentOrganizationId : 'org_hub_power';
  const currentFeatures = hasMounted ? store.currentFeatures : getPlanDefaultFeatures('pro');
  const currentUser = hasMounted
    ? store.currentUser
    : store.teamMembers?.find(m => m.organizationId === 'org_hub_power') || store.teamMembers?.[0];
  const organizations = store.organizations || [];
  const toggleSidebar = store.toggleSidebar;
  const setCurrentOrganizationId = store.setCurrentOrganizationId;

  // Filter items based on features active in the tenant's plan
  const filterMenuItems = (items: MenuItem[]) => {
    return items.filter(item => {
      if (!item.feature) return true;
      const key = item.feature as keyof Omit<typeof currentFeatures, 'organizationId'>;
      return currentFeatures ? currentFeatures[key] !== false : true;
    });
  };

  const currentOrg = (organizations || []).find(o => o.id === currentOrganizationId) || organizations?.[0];
  const orgInitials = currentOrg?.name
    ? currentOrg.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'NV';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-45 border-r border-border/40 bg-card text-foreground flex flex-col transition-all duration-300 ease-in-out lg:translate-x-0 lg:h-full lg:relative ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isSidebarCollapsed ? 'lg:w-[76px]' : 'lg:w-64 w-64'}`}
      >
        {/* Toggle Sidebar Button (Desktop Only) */}
        <div className="hidden lg:block absolute top-1/2 -right-3 -translate-y-1/2 z-50 group">
          <button
            type="button"
            onClick={() => toggleSidebar?.()}
            className="h-6 w-6 rounded-full border border-border/40 bg-card text-foreground shadow-lg hover:bg-muted flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 focus:outline-none"
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            )}
          </button>
          {/* Tooltip */}
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-card/95 backdrop-blur-md text-card-foreground text-[10px] font-bold rounded-lg border border-border/30 shadow-2xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 ease-out transform scale-90 -translate-x-1 group-hover:scale-100 group-hover:translate-x-0 z-50">
            {isSidebarCollapsed ? "Expandir Menu" : "Recolher Menu"}
          </div>
        </div>

        {/* Header Logo */}
        <div className={`h-16 flex items-center justify-between border-b border-border/25 shrink-0 ${
          isSidebarCollapsed ? 'justify-center px-0 relative group' : 'px-6'
        }`}>
          <Link href="/dashboard" className="flex items-center" onClick={onClose}>
            <LogoSidebar isCollapsed={isSidebarCollapsed} />
          </Link>
          {isSidebarCollapsed && (
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-card/95 backdrop-blur-md text-card-foreground text-[10px] font-bold rounded-lg border border-border/30 shadow-2xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 ease-out transform scale-90 -translate-x-1 group-hover:scale-100 group-hover:translate-x-0 z-50">
              NV Hub <span className="text-primary font-semibold ml-1">Dashboard</span>
            </div>
          )}
          {!isSidebarCollapsed && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-full lg:hidden hover:bg-muted/40"
              onClick={onClose}
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </div>

        {/* Organization Switcher Dropdown (Simulator) */}
        <div className={`shrink-0 border-b border-border/25 ${isSidebarCollapsed ? 'py-4' : 'px-4 py-4 bg-muted/10'}`}>
          {isSidebarCollapsed ? (
            <div className="relative group flex justify-center w-full">
              <button
                type="button"
                onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
                className="h-10 w-10 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center font-bold text-xs border border-primary/20 shadow-sm cursor-pointer transition-all duration-150 focus:outline-none"
              >
                {orgInitials}
              </button>
              {/* Tooltip */}
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-card/95 backdrop-blur-md text-card-foreground text-[10px] font-bold rounded-lg border border-border/30 shadow-2xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 ease-out transform scale-90 -translate-x-1 group-hover:scale-100 group-hover:translate-x-0 z-50">
                {currentOrg?.name} <span className="text-primary/80 font-normal ml-0.5">(Simulador)</span>
              </div>

              {/* Floating Dropdown List */}
              {orgDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setOrgDropdownOpen(false)} />
                  <div className="absolute left-full ml-2 top-0 w-52 bg-card border border-border/40 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-left-2 duration-150 backdrop-blur-md">
                    <div className="px-3 py-1.5 text-[8px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border/20 select-none">
                      Mudar Organização
                    </div>
                    {organizations.map((org) => (
                      <button
                        key={org.id}
                        type="button"
                        onClick={() => {
                          setCurrentOrganizationId?.(org.id);
                          setOrgDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-muted/50 flex items-center justify-between cursor-pointer transition-colors ${
                          org.id === currentOrganizationId ? 'text-primary bg-primary/5' : 'text-foreground/90'
                        }`}
                      >
                        <span className="truncate">{org.name}</span>
                        {org.id === currentOrganizationId && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 px-1.5 text-[8px] font-bold text-primary uppercase tracking-widest select-none">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Simulador de Tenant
              </div>
              <div className="relative">
                <select
                  value={currentOrganizationId || ''}
                  onChange={(e) => setCurrentOrganizationId?.(e.target.value)}
                  className="w-full h-8.5 pl-2.5 pr-8 rounded-lg bg-background/50 border border-border/40 text-xs font-bold text-foreground/80 focus:outline-none focus:ring-1 focus:ring-primary/45 focus:border-primary/40 cursor-pointer transition-all"
                  title="Alternar Organização Assinante"
                >
                  {(organizations || []).map((org) => (
                    <option key={org?.id || ''} value={org?.id || ''}>
                      {org?.name || 'Organização'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className={`flex-1 py-4 space-y-5 overflow-x-hidden ${isSidebarCollapsed ? 'px-0' : 'px-3 overflow-y-auto'}`}>
          {menuGroups.map((group, groupIdx) => {
            const filteredItems = filterMenuItems(group.items);
            if (filteredItems.length === 0) return null;

            return (
              <div key={group.title + '-' + groupIdx} className="space-y-1">
                {/* Group title or separator */}
                {!isSidebarCollapsed ? (
                  <div className="px-3 py-1 text-[8px] font-bold text-muted-foreground/70 uppercase tracking-[0.16em] select-none">
                    {group.title}
                  </div>
                ) : (
                  groupIdx > 0 && <div className="h-px bg-border/20 mx-3 my-2" />
                )}

                {/* Group items */}
                <div className="space-y-0.5">
                  {filteredItems.map((item, idx) => {
                    const Icon = item.icon || Target;
                    const itemHref = item.href || '#';
                    const isActive = hasMounted && itemHref !== '#' && pathname && pathname.startsWith(itemHref);

                    return (
                      <div key={(item.href || '#') + '-' + idx} className="relative group flex justify-center w-full">
                        <Link
                          href={itemHref}
                          onClick={onClose}
                          className={`flex items-center gap-3 py-2.5 rounded-lg text-xs font-bold transition-all relative ${
                            isSidebarCollapsed
                              ? 'justify-center w-10 h-10 p-0'
                              : 'px-3 w-full'
                          } ${
                            isActive
                              ? isSidebarCollapsed
                                ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_12px_rgba(223,177,91,0.12)]'
                                : 'bg-gradient-to-r from-primary/10 via-primary/5 to-transparent text-primary border-l-[3px] border-primary pl-2.5 rounded-l-none rounded-r-lg dark:shadow-[inset_1px_0_0_rgba(223,177,91,0.1)]'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/30 pl-3'
                          }`}
                        >
                          <Icon className={`h-4.5 w-4.5 shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                            isActive ? 'text-primary' : 'text-muted-foreground/80 group-hover:text-foreground'
                          }`} />
                          
                          {!isSidebarCollapsed && (
                            <span className="flex-1 truncate">{item.label}</span>
                          )}

                          {/* Admin tag inside sidebar link */}
                          {item.isOperator && !isSidebarCollapsed && (
                            <span className="bg-primary/15 text-primary border border-primary/20 text-[7.5px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider scale-95 origin-right">
                              Admin
                            </span>
                          )}
                        </Link>

                        {/* Tooltip for collapsed sidebar */}
                        {isSidebarCollapsed && (
                          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-card/95 backdrop-blur-md text-card-foreground text-[10px] font-bold rounded-lg border border-border/30 shadow-2xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 ease-out transform scale-90 -translate-x-1 group-hover:scale-100 group-hover:translate-x-0 z-50 flex items-center gap-1.5">
                            {isActive && <span className="h-1 w-1 rounded-full bg-primary" />}
                            <span>{item.label}</span>
                            {item.isOperator && (
                              <span className="text-[7px] text-primary/80 border border-primary/20 px-1 rounded uppercase tracking-widest font-black">
                                Admin
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-border/25 shrink-0 flex justify-center bg-muted/5">
          {isSidebarCollapsed ? (
            <div className="relative group">
              <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-xs uppercase shrink-0 hover:scale-105 transition-transform cursor-pointer">
                {String(currentUser?.name || 'US').slice(0, 2)}
              </div>

              {/* Tooltip info */}
              <div className="absolute left-full ml-3 bottom-0 px-3 py-2 bg-card/95 backdrop-blur-md text-card-foreground text-[10px] font-bold rounded-lg border border-border/30 shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 ease-out transform scale-90 -translate-x-1 group-hover:scale-100 group-hover:translate-x-0 z-50 min-w-44">
                <div className="text-foreground font-black text-xs leading-none">{currentUser?.name}</div>
                <div className="text-muted-foreground text-[9px] font-bold leading-normal mt-1 flex items-center gap-1.5">
                  <span>{currentUser?.role}</span>
                  {currentUser?.userRole === 'admin' && (
                    <span className="text-[7.5px] text-primary bg-primary/10 border border-primary/20 px-1 rounded uppercase font-black tracking-wider">
                      {currentUser.userRole}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-muted/15 border border-border/10 w-full animate-in fade-in duration-200">
              <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-primary text-xs uppercase shrink-0 select-none">
                {String(currentUser?.name || 'US').slice(0, 2)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-black truncate text-foreground/90 leading-none">{currentUser?.name || 'Usuário'}</span>
                <span className="text-[9px] text-muted-foreground truncate leading-tight mt-1 flex items-center gap-1">
                  {currentUser?.role || 'Membro'}
                </span>
              </div>
              {currentUser?.userRole === 'admin' && (
                <span className="ml-auto bg-primary/10 text-primary border border-primary/20 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider scale-90 select-none">
                  Admin
                </span>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
