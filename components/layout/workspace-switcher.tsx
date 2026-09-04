import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { Organization } from '../../types';

interface WorkspaceSwitcherProps {
  organizations: Organization[];
  currentOrganization?: Organization;
  isCollapsed: boolean;
  canSwitch: boolean;
  onChange: (organizationId: string) => void;
}

function getInitials(name?: string) {
  return name
    ?.split(' ')
    .filter(word => /^[A-Za-zÀ-ÿ0-9]/.test(word))
    .map(word => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'NV';
}

export function WorkspaceSwitcher({
  organizations,
  currentOrganization,
  isCollapsed,
  canSwitch,
  onChange,
}: WorkspaceSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const initials = getInitials(currentOrganization?.name);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (organizationId: string) => {
    onChange(organizationId);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div ref={rootRef} className="relative">
      {!isCollapsed && (
        <p className="mb-2 px-1 text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-foreground-muted">
          Workspace
        </p>
      )}

      <button
        ref={triggerRef}
        type="button"
        disabled={!canSwitch}
        aria-expanded={canSwitch ? isOpen : undefined}
        aria-haspopup={canSwitch ? 'menu' : undefined}
        aria-label={`Workspace: ${currentOrganization?.name || 'Organização'}`}
        title={isCollapsed ? currentOrganization?.name : undefined}
        onClick={() => canSwitch && setIsOpen(open => !open)}
        className={`group flex w-full items-center rounded-lg border text-left shadow-subtle transition-[background-color,border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-default disabled:opacity-100 ${
          isCollapsed
            ? 'h-12 justify-center border-transparent px-0 shadow-none hover:border-border hover:bg-surface-subtle'
            : `min-h-14 gap-2.5 bg-surface px-2.5 py-2.5 ${isOpen ? 'border-primary/25' : 'border-border hover:border-border-strong'}`
        }`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary-subtle text-caption font-bold tracking-wide text-primary shadow-subtle">
          {initials}
        </span>
        {!isCollapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-body-small font-semibold text-foreground">
                {currentOrganization?.name || 'Organização'}
              </span>
              <span className="mt-0.5 block text-[0.625rem] font-medium uppercase tracking-[0.08em] text-foreground-muted">
                Plano {currentOrganization?.planId || 'não definido'}
              </span>
            </span>
            {canSwitch && (
              <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-foreground-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            )}
          </>
        )}
      </button>

      {isOpen && canSwitch && (
        <div
          role="menu"
          aria-label="Selecionar workspace"
          className={`absolute z-50 min-w-56 overflow-hidden rounded-lg border border-border bg-surface-elevated p-1.5 shadow-elevated ${
            isCollapsed ? 'left-full top-0 ml-2' : 'inset-x-0 top-full mt-2'
          }`}
        >
          <p className="px-2.5 py-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-foreground-muted">
            Alternar workspace
          </p>
          {organizations.map(organization => {
            const isCurrent = organization.id === currentOrganization?.id;
            return (
              <button
                key={organization.id}
                type="button"
                role="menuitemradio"
                aria-checked={isCurrent}
                onClick={() => handleSelect(organization.id)}
                className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                  isCurrent ? 'bg-primary-subtle text-primary' : 'text-foreground-secondary hover:bg-surface-subtle hover:text-foreground'
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-[0.625rem] font-bold">
                  {getInitials(organization.name)}
                </span>
                <span className="min-w-0 flex-1 truncate text-body-small font-medium">{organization.name}</span>
                {isCurrent && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default WorkspaceSwitcher;
