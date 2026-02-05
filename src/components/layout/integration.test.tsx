import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BottomNav } from './BottomNav';
import { SideNav } from './SideNav';

// Mock next/navigation
let mockPathname = '/home';
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

// Mock window.scrollTo
const mockScrollTo = vi.fn();
Object.defineProperty(window, 'scrollTo', { value: mockScrollTo, writable: true });

describe('Navigation Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = '/home';
  });

  describe('BottomNav', () => {
    it('renders on mobile viewport with all 5 tabs', () => {
      render(<BottomNav />);

      const nav = screen.getByRole('navigation', { name: /main navigation/i });
      expect(nav).toBeInTheDocument();

      // All tabs should be present
      expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /search/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /library/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /activity/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /profile/i })).toBeInTheDocument();
    });

    it('highlights active tab correctly', () => {
      mockPathname = '/profile';
      render(<BottomNav />);

      const profileLink = screen.getByRole('link', { name: /profile/i });
      expect(profileLink).toHaveAttribute('aria-current', 'page');
      expect(profileLink).toHaveClass('text-primary');

      const homeLink = screen.getByRole('link', { name: /home/i });
      expect(homeLink).not.toHaveAttribute('aria-current');
      expect(homeLink).toHaveClass('text-muted-foreground');
    });

    it('scrolls to top when same tab is clicked', async () => {
      mockPathname = '/home';
      render(<BottomNav />);

      const homeLink = screen.getByRole('link', { name: /home/i });
      fireEvent.click(homeLink);

      await waitFor(() => {
        expect(mockScrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
      });
    });

    it('has correct touch target sizes (44x44px minimum)', () => {
      render(<BottomNav />);

      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveClass('min-h-[44px]');
        expect(link).toHaveClass('min-w-[44px]');
      });
    });

    it('supports keyboard navigation through tabs', () => {
      render(<BottomNav />);

      const links = screen.getAllByRole('link');

      // Tab through all links
      links.forEach((link) => {
        link.focus();
        expect(document.activeElement).toBe(link);
      });
    });

    it('is hidden on desktop via CSS class (lg breakpoint)', () => {
      render(<BottomNav />);

      const nav = screen.getByRole('navigation', { name: /main navigation/i });
      expect(nav).toHaveClass('lg:hidden');
    });

    it('is visible on tablet viewports (768-1023px) via CSS', () => {
      // BottomNav uses lg:hidden, so it's visible below 1024px (including tablet)
      // SideNav uses hidden lg:flex, so it's hidden below 1024px
      // This ensures tablet breakpoint (768-1023px) has visible navigation
      render(<BottomNav />);

      const nav = screen.getByRole('navigation', { name: /main navigation/i });
      // Verify it's NOT hidden at md (768px) - only hidden at lg (1024px)
      expect(nav).not.toHaveClass('md:hidden');
      expect(nav).toHaveClass('lg:hidden');
    });
  });

  describe('SideNav', () => {
    it('renders on desktop viewport with all 5 tabs', () => {
      render(<SideNav />);

      const nav = screen.getByRole('navigation', { name: /sidebar navigation/i });
      expect(nav).toBeInTheDocument();

      // All tabs should be present
      expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /search/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /library/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /activity/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /profile/i })).toBeInTheDocument();
    });

    it('highlights active tab correctly', () => {
      mockPathname = '/library';
      render(<SideNav />);

      const libraryLink = screen.getByRole('link', { name: /library/i });
      expect(libraryLink).toHaveAttribute('aria-current', 'page');
      expect(libraryLink).toHaveClass('text-primary');

      const homeLink = screen.getByRole('link', { name: /home/i });
      expect(homeLink).not.toHaveAttribute('aria-current');
      expect(homeLink).toHaveClass('text-muted-foreground');
    });

    it('is hidden on mobile via CSS class', () => {
      render(<SideNav />);

      const nav = screen.getByRole('navigation', { name: /sidebar navigation/i });
      expect(nav).toHaveClass('hidden');
      expect(nav).toHaveClass('lg:flex');
    });

    it('supports keyboard navigation', () => {
      render(<SideNav />);

      const links = screen.getAllByRole('link');

      links.forEach(link => {
        link.focus();
        expect(document.activeElement).toBe(link);
      });
    });
  });

  describe('Navigation consistency', () => {
    it('BottomNav and SideNav have same navigation items', () => {
      const { unmount } = render(<BottomNav />);
      const bottomNavLinks = screen.getAllByRole('link').map(link => link.getAttribute('href'));
      unmount();

      render(<SideNav />);
      const sideNavLinks = screen.getAllByRole('link').map(link => link.getAttribute('href'));

      expect(bottomNavLinks).toEqual(sideNavLinks);
    });

    it('both navigations point to correct routes', () => {
      render(<BottomNav />);

      expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/home');
      expect(screen.getByRole('link', { name: /search/i })).toHaveAttribute('href', '/search');
      expect(screen.getByRole('link', { name: /library/i })).toHaveAttribute('href', '/library');
      expect(screen.getByRole('link', { name: /activity/i })).toHaveAttribute('href', '/activity');
      expect(screen.getByRole('link', { name: /profile/i })).toHaveAttribute('href', '/profile');
    });
  });

  describe('Accessibility', () => {
    it('BottomNav has proper ARIA attributes', () => {
      render(<BottomNav />);

      const nav = screen.getByRole('navigation', { name: /main navigation/i });
      expect(nav).toHaveAttribute('aria-label', 'Main navigation');
      expect(nav).toHaveAttribute('role', 'navigation');
    });

    it('SideNav has proper ARIA attributes', () => {
      render(<SideNav />);

      const nav = screen.getByRole('navigation', { name: /sidebar navigation/i });
      expect(nav).toHaveAttribute('aria-label', 'Sidebar navigation');
      expect(nav).toHaveAttribute('role', 'navigation');
    });

    it('links have descriptive aria-labels', () => {
      render(<BottomNav />);

      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveAttribute('aria-label');
        expect(link.getAttribute('aria-label')).toMatch(/Navigate to/);
      });
    });
  });
});
