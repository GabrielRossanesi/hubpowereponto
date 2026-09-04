import React from 'react';

interface LogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function LogoIcon({ className = '', size = 'md' }: { className?: string; size?: LogoProps['size'] }) {
  const sizeMap = {
    sm: 'h-6 w-6',
    md: 'h-9 w-9',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${sizeMap[size]} ${className}`}
      aria-hidden="true"
    >
      {/* The Monogram: Distinct N and V Side-by-Side */}
      {/* N shape: Left leg vertical, diagonal down-right, right leg vertical */}
      <path
        d="M25 70 V30 L47 70 V30"
        stroke="var(--primary)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-all duration-300"
      />

      {/* V shape: Left leg diagonal down-right, right leg diagonal up-right */}
      <path
        d="M51 30 L64 70 L77 30"
        stroke="var(--primary)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-all duration-300"
      />

      {/* Core Hub Node */}
      <circle
        cx="64"
        cy="70"
        r="6.5"
        fill="var(--surface)"
        stroke="var(--primary)"
        strokeWidth="2"
      />
      <circle
        cx="64"
        cy="70"
        r="2.5"
        fill="var(--primary)"
      />
    </svg>
  );
}

export function LogoHorizontal({ className = '', iconClassName = '', textClassName = '', size = 'md' }: LogoProps) {
  const textSizeMap = {
    sm: 'text-sm gap-2',
    md: 'text-lg gap-2.5',
    lg: 'text-2xl gap-3.5',
    xl: 'text-3xl gap-4',
  };

  return (
    <div className={`flex items-center ${textSizeMap[size]} ${className}`}>
      <LogoIcon size={size} className={iconClassName} />
      <div className={`flex flex-col select-none ${textClassName}`}>
        <div className="flex items-baseline font-bold tracking-tight text-foreground leading-none">
          <span>NV</span>
          <span className="text-primary ml-1 font-semibold tracking-wide">Hub</span>
        </div>
      </div>
    </div>
  );
}

export function LogoSidebar({ className = '', isCollapsed = false }: { className?: string; isCollapsed?: boolean }) {
  if (isCollapsed) {
    return (
      <div className={`nv-brand-mark flex h-11 w-11 items-center justify-center rounded-lg ${className}`}>
        <LogoIcon size="md" />
      </div>
    );
  }

  return (
    <div className={`flex select-none items-center gap-3 ${className}`}>
      <span className="nv-brand-mark flex h-11 w-11 shrink-0 items-center justify-center rounded-lg">
        <LogoIcon size="md" />
      </span>
      <div className="flex min-w-0 flex-col">
        <div className="flex items-baseline text-base font-bold leading-none tracking-[-0.025em] text-foreground">
          <span>NV</span>
          <span className="ml-1 font-semibold tracking-wide text-primary">Hub</span>
        </div>
        <span className="mt-1.5 truncate font-mono text-[0.5625rem] font-semibold uppercase tracking-[0.13em] text-foreground-muted">
          Operações conectadas
        </span>
      </div>
    </div>
  );
}

export default LogoHorizontal;
