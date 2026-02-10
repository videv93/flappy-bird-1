import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserSearchResults } from './UserSearchResults';
import type { UserSearchResult } from '@/actions/admin/searchUsers';

const mockUsers: UserSearchResult[] = [
  {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'USER',
    createdAt: new Date('2026-01-01'),
    suspendedUntil: null,
    warningCount: 1,
    suspensionCount: 0,
  },
  {
    id: 'user-2',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'ADMIN',
    createdAt: new Date('2025-06-15'),
    suspendedUntil: new Date('2027-01-01'),
    warningCount: 0,
    suspensionCount: 1,
  },
];

describe('UserSearchResults', () => {
  it('renders nothing when no search performed', () => {
    const { container } = render(
      <UserSearchResults users={[]} total={0} hasSearched={false} />
    );
    expect(container.textContent).toBe('');
  });

  it('shows loading skeletons', () => {
    render(<UserSearchResults users={[]} total={0} isLoading hasSearched />);
    expect(screen.getByTestId('search-loading')).toBeInTheDocument();
  });

  it('shows empty state when no results', () => {
    render(<UserSearchResults users={[]} total={0} hasSearched />);
    expect(screen.getByText('No users found matching your search.')).toBeInTheDocument();
  });

  it('renders table with user rows', () => {
    render(<UserSearchResults users={mockUsers} total={2} hasSearched />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('2 results found')).toBeInTheDocument();
  });

  it('shows role badges', () => {
    render(<UserSearchResults users={mockUsers} total={2} hasSearched />);
    expect(screen.getByText('USER')).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });

  it('shows suspension status', () => {
    render(<UserSearchResults users={mockUsers} total={2} hasSearched />);
    expect(screen.getByText('Suspended')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows warning count indicator', () => {
    render(<UserSearchResults users={mockUsers} total={2} hasSearched />);
    expect(screen.getByText('1w')).toBeInTheDocument();
  });

  it('links to user detail page', () => {
    render(<UserSearchResults users={mockUsers} total={2} hasSearched />);
    const links = screen.getAllByText('View');
    expect(links[0].closest('a')).toHaveAttribute('href', '/admin/users/user-1');
    expect(links[1].closest('a')).toHaveAttribute('href', '/admin/users/user-2');
  });

  it('shows singular result text for 1 result', () => {
    render(
      <UserSearchResults users={[mockUsers[0]]} total={1} hasSearched />
    );
    expect(screen.getByText('1 result found')).toBeInTheDocument();
  });
});
