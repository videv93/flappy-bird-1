import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppShell } from './AppShell';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/home',
}));

// Mock useMediaQuery hook
const mockUseMediaQuery = vi.fn();
vi.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: (query: string) => mockUseMediaQuery(query),
}));

// Mock useReducedMotion hook
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

// Mock useOfflineSync hook (avoids transitive auth/prisma imports)
vi.mock('@/hooks/useOfflineSync', () => ({
  useOfflineSync: () => {},
}));

// Mock sessions action (transitively imported via ActiveSessionIndicator barrel)
vi.mock('@/actions/sessions', () => ({
  saveReadingSession: vi.fn(),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    main: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
      <main {...props}>{children}</main>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to mobile viewport
    mockUseMediaQuery.mockImplementation((query: string) => {
      if (query === '(min-width: 1024px)') return false;
      return false;
    });
  });

  it('renders children content', () => {
    render(
      <AppShell title="Test">
        <div data-testid="content">Content</div>
      </AppShell>
    );

    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('renders PageHeader with title', () => {
    render(
      <AppShell title="Home">
        <div>Content</div>
      </AppShell>
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Home');
  });

  it('renders BottomNav on mobile viewport', () => {
    mockUseMediaQuery.mockImplementation((query: string) => {
      if (query === '(min-width: 1024px)') return false;
      return false;
    });

    render(
      <AppShell title="Test">
        <div>Content</div>
      </AppShell>
    );

    // BottomNav should be present (it's hidden via CSS on desktop)
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
  });

  it('renders SideNav on desktop viewport', () => {
    mockUseMediaQuery.mockImplementation((query: string) => {
      if (query === '(min-width: 1024px)') return true;
      return false;
    });

    render(
      <AppShell title="Test">
        <div>Content</div>
      </AppShell>
    );

    // SideNav should be visible on desktop
    expect(screen.getByRole('navigation', { name: /sidebar navigation/i })).toBeInTheDocument();
  });

  it('passes leftSlot to PageHeader', () => {
    render(
      <AppShell title="Test" leftSlot={<button>Back</button>}>
        <div>Content</div>
      </AppShell>
    );

    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
  });

  it('passes rightSlot to PageHeader', () => {
    render(
      <AppShell title="Test" rightSlot={<button>Settings</button>}>
        <div>Content</div>
      </AppShell>
    );

    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
  });

  it('has main content area with proper structure', () => {
    render(
      <AppShell title="Test">
        <div>Content</div>
      </AppShell>
    );

    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
  });

  it('adds padding bottom for BottomNav on mobile', () => {
    mockUseMediaQuery.mockImplementation((query: string) => {
      if (query === '(min-width: 1024px)') return false;
      return false;
    });

    render(
      <AppShell title="Test">
        <div>Content</div>
      </AppShell>
    );

    const main = screen.getByRole('main');
    expect(main).toHaveClass('pb-16');
  });
});
