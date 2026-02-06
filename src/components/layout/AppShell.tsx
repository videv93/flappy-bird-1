'use client';

import { useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';
import { pageVariants, pageTransition } from '@/lib/motion';
import { ActiveSessionIndicator } from '@/components/features/sessions';
import { BottomNav } from './BottomNav';
import { PageHeader } from './PageHeader';
import { SideNav } from './SideNav';
import type { AppShellProps } from './types';

export function AppShell({ children, title, leftSlot, rightSlot }: AppShellProps) {
  const pathname = usePathname();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const reducedMotion = useReducedMotion();

  // Scroll position preservation
  const scrollPositions = useRef<Map<string, number>>(new Map());
  const mainRef = useRef<HTMLElement>(null);

  // Save scroll position on route change
  useEffect(() => {
    // Copy ref value to variable for cleanup function
    const positions = scrollPositions.current;
    const currentPathname = pathname;

    return () => {
      // Save scroll position when leaving this route
      positions.set(currentPathname, window.scrollY);
    };
  }, [pathname]);

  // Restore scroll position on route change
  useEffect(() => {
    const position = scrollPositions.current.get(pathname);
    if (position !== undefined) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        window.scrollTo({ top: position, behavior: 'instant' });
      });
    }
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      {title && (
        <PageHeader title={title} leftSlot={leftSlot} rightSlot={rightSlot} />
      )}

      {/* Active Session Indicator */}
      <ActiveSessionIndicator />

      {/* Side Navigation (Desktop) */}
      {isDesktop && <SideNav />}

      {/* Main Content with Animation */}
      <AnimatePresence mode="wait">
        <motion.main
          key={pathname}
          ref={mainRef}
          role="main"
          initial={reducedMotion ? false : 'initial'}
          animate="animate"
          exit={reducedMotion ? undefined : 'exit'}
          variants={reducedMotion ? undefined : pageVariants}
          transition={reducedMotion ? undefined : pageTransition}
          className={cn(
            'flex-1',
            // Padding for bottom nav on mobile/tablet
            !isDesktop && 'pb-16',
            // Margin for side nav on desktop
            isDesktop && 'lg:ml-64'
          )}
        >
          {children}
        </motion.main>
      </AnimatePresence>

      {/* Bottom Navigation (Mobile/Tablet) */}
      {!isDesktop && <BottomNav />}
    </div>
  );
}
