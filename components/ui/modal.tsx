'use client';

import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import IconButton from './icon-button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, description, children, size = 'md' }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const dialog = dialogRef.current;
    const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || !dialog) return;

      const focusableElements = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    requestAnimationFrame(() => {
      const initialTarget = dialog?.querySelector<HTMLElement>(focusableSelector) ?? dialog;
      initialTarget?.focus();
    });

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-out" 
        onClick={onClose}
      />

      {/* Modal Container */}
      <div 
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={`relative w-full ${sizeClasses[size]} transform overflow-hidden rounded-lg border border-border bg-surface-elevated p-6 text-left align-middle shadow-elevated transition-all duration-300 ease-out animate-in fade-in zoom-in-95 slide-in-from-bottom-10`}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border/10 pb-4 mb-4">
          <div>
            <h3 id={titleId} className="text-lg font-semibold leading-6 text-foreground">
              {title}
            </h3>
            {description && (
              <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          <IconButton label="Fechar janela" variant="ghost" size="sm" className="h-8 w-8 rounded-md hover:bg-muted" onClick={onClose}>
            <X className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </IconButton>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto pr-1 modal-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;
