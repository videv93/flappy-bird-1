import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BottomNav } from './BottomNav';

// Mock next/navigation
const mockPathname = vi.fn(() => '/home');
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

// Mock window.scrollTo
const mockScrollTo = vi.fn();
Object.defineProperty(window, 'scrollTo', { value: mockScrollTo, writable: true });

describe('BottomNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.mockReturnValue('/home');
  });

  it('renders 5 navigation tabs', () => {
    render(<BottomNav />);

    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /search/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /library/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /activity/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /profile/i })).toBeInTheDocument();
  });

  it('has correct navigation structure with aria attributes', () => {
    render(<BottomNav />);

    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    expect(nav).toBeInTheDocument();
  });

  it('highlights active tab with aria-current', () => {
    mockPathname.mockReturnValue('/home');
    render(<BottomNav />);

    const homeLink = screen.getByRole('link', { name: /home/i });
    expect(homeLink).toHaveAttribute('aria-current', 'page');

    const searchLink = screen.getByRole('link', { name: /search/i });
    expect(searchLink).not.toHaveAttribute('aria-current');
  });

  it('applies active styling to current route', () => {
    mockPathname.mockReturnValue('/profile');
    render(<BottomNav />);

    const profileLink = screen.getByRole('link', { name: /profile/i });
    expect(profileLink).toHaveClass('text-primary');
  });

  it('scrolls to top when same tab is clicked', () => {
    mockPathname.mockReturnValue('/home');
    render(<BottomNav />);

    const homeLink = screen.getByRole('link', { name: /home/i });
    fireEvent.click(homeLink);

    expect(mockScrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('does not scroll when different tab is clicked', () => {
    mockPathname.mockReturnValue('/home');
    render(<BottomNav />);

    const searchLink = screen.getByRole('link', { name: /search/i });
    fireEvent.click(searchLink);

    expect(mockScrollTo).not.toHaveBeenCalled();
  });

  it('has minimum touch targets of 44x44px', () => {
    render(<BottomNav />);

    const links = screen.getAllByRole('link');
    links.forEach(link => {
      expect(link).toHaveClass('min-h-[44px]');
      expect(link).toHaveClass('min-w-[44px]');
    });
  });

  it('is hidden on desktop viewports (lg breakpoint)', () => {
    render(<BottomNav />);

    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    expect(nav).toHaveClass('lg:hidden');
  });

  it('each tab has an icon and label', () => {
    render(<BottomNav />);

    const links = screen.getAllByRole('link');
    links.forEach(link => {
      // Each link should have an SVG icon
      const icon = link.querySelector('svg');
      expect(icon).toBeInTheDocument();

      // Each link should have a text label
      const text = link.querySelector('span');
      expect(text).toBeInTheDocument();
    });
  });

  it('supports keyboard navigation', () => {
    render(<BottomNav />);

    const links = screen.getAllByRole('link');
    links.forEach(link => {
      // Links should be focusable
      link.focus();
      expect(document.activeElement).toBe(link);
    });
  });
});
