'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Shield,
  Users,
  BookCheck,
  BarChart3,
  DollarSign,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface AdminNavItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/moderation', icon: Shield, label: 'Moderation' },
  { href: '/admin/users', icon: Users, label: 'Users' },
  { href: '/admin/claims', icon: BookCheck, label: 'Authors' },
  { href: '/admin/metrics', icon: BarChart3, label: 'Metrics' },
  { href: '/admin/affiliate', icon: DollarSign, label: 'Affiliate' },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header
        role="banner"
        className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      >
        <div className="flex h-14 items-center gap-3 px-4">
          <Link
            href="/home"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
            aria-label="Back to app"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-600" aria-hidden />
            <h1 className="text-lg font-semibold text-foreground">Admin</h1>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        {isDesktop && (
          <nav
            aria-label="Admin navigation"
            role="navigation"
            className="hidden lg:flex lg:flex-col lg:w-56 lg:fixed lg:top-14 lg:bottom-0 lg:border-r lg:border-border lg:bg-background"
          >
            <div className="flex flex-col gap-1 p-4">
              {ADMIN_NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      active
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}

        {/* Main Content */}
        <main
          role="main"
          className={cn('flex-1 min-h-[calc(100vh-3.5rem)]', isDesktop && 'lg:ml-56', !isDesktop && 'pb-16')}
        >
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      {!isDesktop && (
        <nav
          aria-label="Admin navigation"
          role="navigation"
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden"
        >
          <div className="flex h-16 items-center justify-around px-2">
            {ADMIN_NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  aria-label={item.label}
                  className={cn(
                    'flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    active
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
