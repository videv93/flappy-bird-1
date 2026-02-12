'use client';

import { usePathname } from 'next/navigation';
import { AppShell } from '@/components/layout';
import { SuspensionGuard } from '@/components/features/admin/SuspensionGuard';
import { StreamChatProvider } from '@/components/features/stream';

// Page title mapping
const PAGE_TITLES: Record<string, string> = {
  '/home': 'Home',
  '/search': 'Search',
  '/library': 'Library',
  '/activity': 'Activity',
  '/profile': 'Profile',
};

function getPageTitle(pathname: string): string | undefined {
  // Book detail page handles its own header
  if (pathname.startsWith('/book/')) {
    return undefined;
  }

  // Check for exact match first
  if (PAGE_TITLES[pathname]) {
    return PAGE_TITLES[pathname];
  }

  // Check for prefix match (for nested routes)
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(path)) {
      return title;
    }
  }

  return 'Book Circle';
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <SuspensionGuard>
      <StreamChatProvider>
        <AppShell title={title}>{children}</AppShell>
      </StreamChatProvider>
    </SuspensionGuard>
  );
}
