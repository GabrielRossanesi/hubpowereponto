import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { LogOut, MoreHorizontal, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { signOut } from '../../lib/auth-client';
import { isDatabaseDataMode } from '../../lib/data-mode';

interface AccountMenuProps {
  name: string;
  role: string;
  initials: string;
  isAdmin: boolean;
  isCollapsed: boolean;
  onNavigate: () => void;
}

export function AccountMenu({
  name,
  role,
  initials,
  isAdmin,
  isCollapsed,
  onNavigate,
}: AccountMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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

  const handleLogout = async () => {
    setIsOpen(false);
    if (isDatabaseDataMode) {
      try {
        await signOut({ fetchOptions: { onSuccess: () => router.push('/login') } });
        return;
      } catch (error) {
        console.error('Erro ao realizar logout real:', error);
      }
    }
    router.push('/login');
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Abrir menu da conta de ${name}`}
        title={isCollapsed ? name : undefined}
        onClick={() => setIsOpen(open => !open)}
        className={`group flex w-full items-center rounded-lg border border-transparent text-left transition-[background-color,border-color] hover:border-border hover:bg-surface/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 ${
          isCollapsed ? 'h-12 justify-center px-0' : 'min-h-13 gap-2.5 px-2.5 py-2'
        }`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-surface-elevated text-caption font-bold tracking-wide text-foreground shadow-subtle">
          {initials}
        </span>
        {!isCollapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-body-small font-semibold text-foreground">{name}</span>
                {isAdmin && <span className="rounded-sm bg-primary-subtle px-1 py-0.5 text-[0.5625rem] font-bold uppercase tracking-wide text-primary">Admin</span>}
              </span>
              <span className="mt-0.5 block truncate text-[0.625rem] text-foreground-muted">{role}</span>
            </span>
            <MoreHorizontal className="h-4 w-4 shrink-0 text-foreground-muted transition-colors group-hover:text-foreground" aria-hidden="true" />
          </>
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Menu da conta"
          className={`absolute z-50 min-w-52 overflow-hidden rounded-lg border border-border bg-surface-elevated p-1.5 shadow-elevated ${
            isCollapsed ? 'bottom-0 left-full ml-2' : 'inset-x-0 bottom-full mb-2'
          }`}
        >
          <div className="border-b border-border px-2.5 pb-2 pt-1.5">
            <p className="truncate text-body-small font-semibold text-foreground">{name}</p>
            <p className="mt-0.5 truncate text-caption text-foreground-muted">{role}</p>
          </div>
          <div className="pt-1.5">
            <Link
              href="/configuracoes"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onNavigate();
              }}
              className="flex h-9 items-center gap-2.5 rounded-md px-2.5 text-body-small font-medium text-foreground-secondary transition-colors hover:bg-surface-subtle hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
              Configurações
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-body-small font-medium text-danger transition-colors hover:bg-danger-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sair do NV Hub
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountMenu;
