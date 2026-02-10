import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserAccountCard } from './UserAccountCard';

const baseAccount = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  image: null,
  avatarUrl: null,
  bio: 'I love reading!',
  role: 'USER',
  emailVerified: true,
  createdAt: new Date('2026-01-15'),
  suspendedUntil: null,
  suspensionReason: null,
};

const readingStats = {
  currentStreak: 5,
  longestStreak: 12,
  totalReadingTimeHours: 45.3,
  totalSessions: 102,
};

const socialStats = {
  followerCount: 25,
  followingCount: 18,
};

describe('UserAccountCard', () => {
  it('renders account details', () => {
    render(
      <UserAccountCard
        account={baseAccount}
        readingStats={readingStats}
        socialStats={socialStats}
      />
    );
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('USER')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
  });

  it('renders reading stats', () => {
    render(
      <UserAccountCard
        account={baseAccount}
        readingStats={readingStats}
        socialStats={socialStats}
      />
    );
    expect(screen.getByText('5 days')).toBeInTheDocument();
    expect(screen.getByText('12 days')).toBeInTheDocument();
    expect(screen.getByText('45.3h (102 sessions)')).toBeInTheDocument();
  });

  it('renders social stats', () => {
    render(
      <UserAccountCard
        account={baseAccount}
        readingStats={readingStats}
        socialStats={socialStats}
      />
    );
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
  });

  it('shows active status when not suspended', () => {
    render(
      <UserAccountCard
        account={baseAccount}
        readingStats={readingStats}
        socialStats={socialStats}
      />
    );
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows suspended status when suspended', () => {
    render(
      <UserAccountCard
        account={{ ...baseAccount, suspendedUntil: new Date('2027-01-01') }}
        readingStats={readingStats}
        socialStats={socialStats}
      />
    );
    expect(screen.getByText('Suspended')).toBeInTheDocument();
  });

  it('renders bio when present', () => {
    render(
      <UserAccountCard
        account={baseAccount}
        readingStats={readingStats}
        socialStats={socialStats}
      />
    );
    expect(screen.getByText('I love reading!')).toBeInTheDocument();
  });

  it('handles unknown user name', () => {
    render(
      <UserAccountCard
        account={{ ...baseAccount, name: null }}
        readingStats={readingStats}
        socialStats={socialStats}
      />
    );
    expect(screen.getByText('Unknown User')).toBeInTheDocument();
  });
});
