'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';
import IconButton from './icon-button';

interface DropdownItem {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
  icon?: React.ReactNode;
}

interface DropdownProps {
  items: DropdownItem[];
  trigger?: React.ReactNode;
  label?: string;
}

export function Dropdown({ items, trigger, label = 'Abrir menu de ações' }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus());
    }
  }, [isOpen]);

  const closeAndRestoreFocus = () => {
    setIsOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const menuItems = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []);
    const currentIndex = menuItems.indexOf(document.activeElement as HTMLButtonElement);

    if (event.key === 'Escape') {
      event.preventDefault();
      closeAndRestoreFocus();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      menuItems[(currentIndex + 1) % menuItems.length]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      menuItems[(currentIndex - 1 + menuItems.length) % menuItems.length]?.focus();
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <IconButton
        ref={triggerRef}
        variant="ghost"
        size="sm"
        className="h-8 w-8 rounded-md"
        label={label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        {trigger || <MoreVertical className="h-4 w-4" aria-hidden="true" />}
      </IconButton>

      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={label}
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 z-40 mt-2 w-48 origin-top-right animate-in rounded-lg border border-border bg-surface-elevated py-1 shadow-elevated fade-in zoom-in-95 duration-100"
        >
          {items.map((item, index) => (
            <button
              key={index}
              type="button"
              role="menuitem"
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
              className={`flex h-9 w-full cursor-pointer items-center px-3 text-body-small transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30 ${
                item.variant === 'danger' 
                  ? 'text-danger font-medium' 
                  : 'text-foreground'
              }`}
            >
              {item.icon && <span className="mr-2.5 h-4 w-4 flex items-center justify-center">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dropdown;
