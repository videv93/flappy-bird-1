import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KudosListItem } from './KudosListItem';
import type { KudosWithDetails } from '@/actions/social';

// Mock Avatar components
vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="avatar" className={className}>{children}</div>
  ),
  AvatarImage: ({ src, alt }: { src?: string; alt: string }) => (
    <img src={src} alt={alt} data-testid="avatar-image" />
  ),
  AvatarFallback: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="avatar-fallback">{children}</div>
  ),
}));

const mockKudos: KudosWithDetails = {
  id: 'kudos-1',
  createdAt: new Date('2026-02-07T10:00:00Z'),
  giver: {
    id: 'user-2',
    name: 'Alice Reader',
    image: '/alice.jpg',
  },
  session: {
    id: 'session-1',
    book: {
      id: 'book-1',
      title: 'Project Hail Mary',
      coverUrl: '/cover.jpg',
    },
  },
};

describe('KudosListItem', () => {
  it('should render giver avatar and name', () => {
    render(<KudosListItem kudos={mockKudos} />);

    expect(screen.getByTestId('avatar-image')).toBeInTheDocument();
    expect(screen.getByText('Alice Reader')).toBeInTheDocument();
  });

  it('should link to giver profile', () => {
    render(<KudosListItem kudos={mockKudos} />);

    const links = screen.getAllByRole('link', { name: /Alice Reader/ });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toHaveAttribute('href', '/user/user-2');
  });

  it('should render book cover and title', () => {
    render(<KudosListItem kudos={mockKudos} />);

    const bookImage = screen.getByAltText('Project Hail Mary');
    expect(bookImage).toBeInTheDocument();
    expect(bookImage).toHaveAttribute('src', expect.stringContaining('cover.jpg'));

    expect(screen.getByText('Project Hail Mary')).toBeInTheDocument();
  });

  it('should link to book page for session context', () => {
    render(<KudosListItem kudos={mockKudos} />);

    const bookLink = screen.getByRole('link', {
      name: /kudos for Project Hail Mary/i,
    });
    expect(bookLink).toBeInTheDocument();
    expect(bookLink).toHaveAttribute('href', '/book/book-1');
  });

  it('should format relative timestamp correctly', () => {
    const recentKudos = {
      ...mockKudos,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    };

    render(<KudosListItem kudos={recentKudos} />);

    expect(screen.getByText(/2h ago/)).toBeInTheDocument();
  });

  it('should handle missing giver image with initials fallback', () => {
    const kudosNoImage = {
      ...mockKudos,
      giver: { ...mockKudos.giver, image: null },
    };

    render(<KudosListItem kudos={kudosNoImage} />);

    const fallback = screen.getByTestId('avatar-fallback');
    expect(fallback).toBeInTheDocument();
    expect(fallback).toHaveTextContent('AR'); // Alice Reader initials
  });

  it('should handle missing book cover', () => {
    const kudosNoCover = {
      ...mockKudos,
      session: {
        ...mockKudos.session,
        book: { ...mockKudos.session.book, coverUrl: null },
      },
    };

    render(<KudosListItem kudos={kudosNoCover} />);

    // Should still render book title without cover
    expect(screen.getByText('Project Hail Mary')).toBeInTheDocument();
  });

  it('should have minimum 44px touch targets on clickable elements', () => {
    render(<KudosListItem kudos={mockKudos} />);

    const links = screen.getAllByRole('link');
    // All links should have min-h-[44px] class for touch targets
    links.forEach((link) => {
      const classes = link.className;
      expect(classes).toContain('min-h-[44px]');
    });
  });

  it('should have proper aria-labels for accessibility', () => {
    render(<KudosListItem kudos={mockKudos} />);

    const profileLink = screen.getByLabelText(/View Alice Reader's profile/i);
    expect(profileLink).toBeInTheDocument();

    const activityLink = screen.getByLabelText(/View kudos for Project Hail Mary/i);
    expect(activityLink).toBeInTheDocument();
  });

  it('should handle anonymous giver (null name)', () => {
    const kudosAnonymous = {
      ...mockKudos,
      giver: { ...mockKudos.giver, name: null },
    };

    render(<KudosListItem kudos={kudosAnonymous} />);

    expect(screen.getByText('Anonymous')).toBeInTheDocument();
    const fallback = screen.getByTestId('avatar-fallback');
    expect(fallback).toHaveTextContent('?'); // getInitials(null) returns '?'
  });
});
