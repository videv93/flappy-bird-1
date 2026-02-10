import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserActivitySection } from './UserActivitySection';

const baseActivity = {
  lastLogin: new Date('2026-02-09T10:30:00Z'),
  recentKudosGiven: [
    { id: 'k1', receiverId: 'user-2', createdAt: new Date('2026-02-08') },
  ],
  recentKudosReceived: [
    { id: 'k2', giverId: 'user-3', createdAt: new Date('2026-02-07') },
  ],
  currentRoom: null,
};

const baseModerationSummary = {
  warningCount: 2,
  suspensionCount: 1,
  flagsReceived: 3,
  flagsSubmitted: 0,
};

describe('UserActivitySection', () => {
  it('renders last login', () => {
    render(
      <UserActivitySection
        recentActivity={baseActivity}
        moderationSummary={baseModerationSummary}
      />
    );
    expect(screen.getByText(/Last login:/)).toBeInTheDocument();
  });

  it('shows "Never" when no last login', () => {
    render(
      <UserActivitySection
        recentActivity={{ ...baseActivity, lastLogin: null }}
        moderationSummary={baseModerationSummary}
      />
    );
    expect(screen.getByText('Never')).toBeInTheDocument();
  });

  it('shows current room when present', () => {
    render(
      <UserActivitySection
        recentActivity={{
          ...baseActivity,
          currentRoom: { bookId: 'book-1', joinedAt: new Date('2026-02-09') },
        }}
        moderationSummary={baseModerationSummary}
      />
    );
    expect(screen.getByText(/In room/)).toBeInTheDocument();
  });

  it('shows "None" when no current room', () => {
    render(
      <UserActivitySection
        recentActivity={baseActivity}
        moderationSummary={baseModerationSummary}
      />
    );
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  it('renders kudos given', () => {
    render(
      <UserActivitySection
        recentActivity={baseActivity}
        moderationSummary={baseModerationSummary}
      />
    );
    expect(screen.getByText(/Recent kudos given/)).toBeInTheDocument();
    expect(screen.getByText(/To user-2/)).toBeInTheDocument();
  });

  it('renders kudos received', () => {
    render(
      <UserActivitySection
        recentActivity={baseActivity}
        moderationSummary={baseModerationSummary}
      />
    );
    expect(screen.getByText(/Recent kudos received/)).toBeInTheDocument();
    expect(screen.getByText(/From user-3/)).toBeInTheDocument();
  });

  it('renders moderation summary', () => {
    render(
      <UserActivitySection
        recentActivity={baseActivity}
        moderationSummary={baseModerationSummary}
      />
    );
    expect(screen.getByText('Warnings')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Suspensions')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Flags Received')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Flags Submitted')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
