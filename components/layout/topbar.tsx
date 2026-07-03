'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Bell, Search, LogOut } from 'lucide-react';
import ThemeToggle from '../ui/theme-toggle';
import Button from '../ui/button';

import { signOut } from '../../lib/auth-client';
import { isDatabaseDataMode } from '../../lib/data-mode';

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    if (isDatabaseDataMode) {
      try {
        await signOut({
          fetchOptions: {
            onSuccess: () => {
              router.push('/login');
            }
          }
        });
      } catch (err) {
        console.error('Erro ao realizar logout real:', err);
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
  };

  return (
    <header className="h-16 border-b border-border/40 bg-card/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-6 shrink-0">
      {/* Mobile Toggle & Brand */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 rounded-lg lg:hidden hover:bg-muted"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5 text-foreground" />
          <span className="sr-only">Abrir menu</span>
        </Button>
        
        {/* Search Mock */}
        <div className="hidden md:flex items-center gap-2.5 border border-border/40 bg-muted/10 rounded-lg px-3 py-1.5 w-64 text-muted-foreground focus-within:border-primary/50 focus-within:bg-muted/20 transition-all duration-200">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground/80" />
          <input
            type="text"
            placeholder="Pesquisar..."
            className="bg-transparent border-0 text-xs w-full text-foreground focus:outline-none focus:ring-0 placeholder:text-muted-foreground/60"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications Mock */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 rounded-lg border border-border/40 hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <Bell className="h-4.5 w-4.5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card animate-ping" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
            <span className="sr-only">Notificações</span>
          </Button>
        </div>

        <div className="h-6 w-px bg-border/60 mx-1" />

        {/* Logout */}
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 rounded-lg border border-border/40 hover:bg-muted text-muted-foreground hover:text-danger"
          onClick={handleLogout}
          title="Sair do Sistema"
        >
          <LogOut className="h-4.5 w-4.5" />
          <span className="sr-only">Sair</span>
        </Button>
      </div>
    </header>
  );
}

export default Topbar;
