'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import Sidebar from '../../components/layout/sidebar';
import Topbar from '../../components/layout/topbar';
import { useTenantStore } from '../../lib/store';
import { useMounted } from '../../hooks/useMounted';
import Button from '../../components/ui/button';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { currentFeatures } = useTenantStore();
  const [backgroundOffset, setBackgroundOffset] = useState({ x: 0, y: 0 });
  const hasMounted = useMounted();

  // Handle subtle mousemove parallax for premium background depth
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const isMobile = window.innerWidth < 1024; // lg breakpoint
    if (mediaQuery.matches || isMobile) return;

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX - window.innerWidth / 2) * 0.012;
      const y = (e.clientY - window.innerHeight / 2) * 0.012;
      setBackgroundOffset({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

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

  const matchedRoute = Object.keys(routeFeatureMap).find(route => pathname && pathname.startsWith(route));
  let isBlocked = false;
  if (hasMounted && matchedRoute && currentFeatures) {
    const featureKey = routeFeatureMap[matchedRoute] as keyof Omit<typeof currentFeatures, 'organizationId'>;
    if (currentFeatures[featureKey] === false) {
      isBlocked = true;
    }
  }

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-background">

      {/* Premium Background Layers */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
        {/* Glows in Dark Mode */}
        <div className="absolute top-[-15%] left-[-15%] w-[60%] h-[60%] rounded-full bg-primary/4 blur-[120px] dark:bg-primary/2.5 dark:block hidden transition-opacity duration-300" />
        <div className="absolute bottom-[-15%] right-[-15%] w-[60%] h-[60%] rounded-full bg-secondary/6 blur-[120px] dark:bg-secondary/3 dark:block hidden transition-opacity duration-300" />

        {/* Parallax layer: Subtle glowing circles */}
        <div
          className="absolute inset-0 transition-transform duration-200 ease-out hidden dark:block"
          style={{
            transform: `translate(${backgroundOffset.x}px, ${backgroundOffset.y}px)`,
          }}
        >
          <div className="absolute top-[25%] right-[20%] w-80 h-80 rounded-full bg-primary/1.5 blur-[85px]" />
          <div className="absolute bottom-[20%] left-[15%] w-[450px] h-[450px] rounded-full bg-accent-cool/1.5 blur-[110px]" />
        </div>

        {/* Grid Overlay with Radial Gradient Mask */}
        <div
          className="absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.02)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_65%_55%_at_50%_40%,#000_60%,transparent_100%)] opacity-30 dark:opacity-40"
        />

        {/* Very subtle dark-vignette depth */}
        <div className="absolute inset-0 bg-[radial-gradient(transparent_50%,rgba(0,0,0,0.02))] dark:bg-[radial-gradient(transparent_50%,rgba(0,0,0,0.12))] opacity-30" />
      </div>

      {/* Main Layout Layer */}
      <div className="relative flex h-full w-full overflow-hidden z-10 bg-transparent">
        {/* Sidebar navigation */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main viewport */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-transparent">
          {/* Top administration bar */}
          <Topbar onMenuClick={() => setSidebarOpen(true)} />

          {/* Main content route views */}
          <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-transparent scroll-smooth">
            <div className="max-w-7xl mx-auto animate-in fade-in duration-300">
              {isBlocked ? (
                <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
                  <div className="h-16 w-16 rounded-full bg-warning/10 text-warning flex items-center justify-center mb-6 ring-8 ring-warning/5 animate-bounce">
                    <Lock className="h-8 w-8" />
                  </div>
                  <h1 className="text-xl font-bold text-foreground mb-3 tracking-tight">
                    Funcionalidade não disponível no seu plano
                  </h1>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-8">
                    Este módulo não está habilitado para a organização atual. Fale com o operador NV Hub para liberar o acesso.
                  </p>
                  <Link href="/dashboard" passHref legacyBehavior>
                    <Button className="w-full sm:w-auto font-semibold">
                      Voltar ao Dashboard
                    </Button>
                  </Link>
                </div>
              ) : (
                children
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
