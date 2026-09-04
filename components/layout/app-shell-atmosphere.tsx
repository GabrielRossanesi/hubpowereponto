'use client';

import { useEffect, useRef } from 'react';

export function AppShellAtmosphere() {
  const atmosphereRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const atmosphere = atmosphereRef.current;
    if (!atmosphere) return;

    const desktopQuery = window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let animationFrame: number | null = null;
    let isListening = false;
    let pointerX = 0;
    let pointerY = 0;

    const resetPosition = () => {
      atmosphere.style.setProperty('--shell-pointer-x', '0');
      atmosphere.style.setProperty('--shell-pointer-y', '0');
    };

    const updatePosition = () => {
      atmosphere.style.setProperty('--shell-pointer-x', pointerX.toFixed(3));
      atmosphere.style.setProperty('--shell-pointer-y', pointerY.toFixed(3));
      animationFrame = null;
    };

    const handlePointerMove = (event: PointerEvent) => {
      pointerX = (event.clientX / window.innerWidth - 0.5) * 2;
      pointerY = (event.clientY / window.innerHeight - 0.5) * 2;

      if (animationFrame === null) {
        animationFrame = window.requestAnimationFrame(updatePosition);
      }
    };

    const syncPointerListener = () => {
      const shouldListen = desktopQuery.matches && !reducedMotionQuery.matches;

      if (shouldListen && !isListening) {
        window.addEventListener('pointermove', handlePointerMove, { passive: true });
        isListening = true;
      } else if (!shouldListen && isListening) {
        window.removeEventListener('pointermove', handlePointerMove);
        isListening = false;
        resetPosition();
      }
    };

    syncPointerListener();
    desktopQuery.addEventListener('change', syncPointerListener);
    reducedMotionQuery.addEventListener('change', syncPointerListener);

    return () => {
      if (isListening) window.removeEventListener('pointermove', handlePointerMove);
      desktopQuery.removeEventListener('change', syncPointerListener);
      reducedMotionQuery.removeEventListener('change', syncPointerListener);
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div ref={atmosphereRef} className="app-shell-atmosphere" aria-hidden="true">
      <div className="app-shell-atmosphere__layer app-shell-atmosphere__layer--depth" />
      <div className="app-shell-atmosphere__layer app-shell-atmosphere__layer--signal">
        <svg className="nv-signal" viewBox="0 0 1600 1000" preserveAspectRatio="none" focusable="false">
          <path className="nv-signal__path" d="M-120 170C190 20 380 252 705 126C1020 3 1300 80 1715 246" />
          <path className="nv-signal__path nv-signal__path--quiet" d="M-80 770C235 602 430 870 758 724C1060 590 1260 704 1690 558" />
          <path className="nv-signal__path" d="M1240-90C1040 190 1510 265 1260 520C1088 697 1384 830 1700 742" />
          <path className="nv-signal__accent" d="M-24 214C210 98 390 232 562 184" />
          <circle className="nv-signal__node" cx="562" cy="184" r="3.5" />
          <circle className="nv-signal__node nv-signal__node--quiet" cx="1260" cy="520" r="3" />
          <circle className="nv-signal__node" cx="1384" cy="830" r="2.5" />
        </svg>
      </div>
      <div className="app-shell-atmosphere__layer app-shell-atmosphere__layer--field" />
    </div>
  );
}

export default AppShellAtmosphere;
