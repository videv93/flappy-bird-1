import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionList } from './SessionList';
import type { ReadingSession } from '@prisma/client';

vi.mock('@/actions/sessions', () => ({
  getBookSessions: vi.fn(),
  saveReadingSession: vi.fn(),
}));

import { getBookSessions } from '@/actions/sessions';

const mockGetBookSessions = vi.mocked(getBookSessions);

function makeSession(id: string, overrides: Partial<ReadingSession> = {}): ReadingSession {
  return {
    id,
    userId: 'user-1',
    bookId: 'book-123',
    duration: 1800,
    startedAt: new Date('2026-02-06T14:30:00Z'),
    endedAt: new Date('2026-02-06T15:00:00Z'),
    syncedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('SessionList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no sessions', () => {
    render(
      <SessionList bookId="book-123" initialSessions={[]} initialCursor={null} />
    );

    expect(screen.getByTestId('session-list-empty')).toBeInTheDocument();
    expect(screen.getByText(/No reading sessions yet/)).toBeInTheDocument();
  });

  it('renders sessions with date, duration, and time of day', () => {
    const sessions = [makeSession('rs-1'), makeSession('rs-2')];

    render(
      <SessionList bookId="book-123" initialSessions={sessions} initialCursor={null} />
    );

    const items = screen.getAllByTestId('session-list-item');
    expect(items).toHaveLength(2);

    // Duration: 1800 seconds = 30:00
    expect(screen.getAllByText('30:00')).toHaveLength(2);
  });

  it('does not show "Show more" when no nextCursor', () => {
    render(
      <SessionList
        bookId="book-123"
        initialSessions={[makeSession('rs-1')]}
        initialCursor={null}
      />
    );

    expect(screen.queryByTestId('session-list-load-more')).not.toBeInTheDocument();
  });

  it('shows "Show more" button when nextCursor exists', () => {
    render(
      <SessionList
        bookId="book-123"
        initialSessions={[makeSession('rs-1')]}
        initialCursor="rs-cursor"
      />
    );

    expect(screen.getByTestId('session-list-load-more')).toBeInTheDocument();
    expect(screen.getByText('Show more')).toBeInTheDocument();
  });

  it('loads more sessions on "Show more" click', async () => {
    const user = userEvent.setup();
    const newSessions = [makeSession('rs-2', { duration: 600 })];

    mockGetBookSessions.mockResolvedValue({
      success: true,
      data: { sessions: newSessions, nextCursor: null },
    });

    render(
      <SessionList
        bookId="book-123"
        initialSessions={[makeSession('rs-1')]}
        initialCursor="rs-cursor"
      />
    );

    await user.click(screen.getByTestId('session-list-load-more'));

    await waitFor(() => {
      const items = screen.getAllByTestId('session-list-item');
      expect(items).toHaveLength(2);
    });

    expect(mockGetBookSessions).toHaveBeenCalledWith({
      bookId: 'book-123',
      cursor: 'rs-cursor',
    });

    // "Show more" disappears when nextCursor is null
    expect(screen.queryByTestId('session-list-load-more')).not.toBeInTheDocument();
  });

  it('shows loading state during "Show more" fetch', async () => {
    const user = userEvent.setup();

    let resolvePromise: (value: unknown) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    mockGetBookSessions.mockReturnValue(promise as never);

    render(
      <SessionList
        bookId="book-123"
        initialSessions={[makeSession('rs-1')]}
        initialCursor="rs-cursor"
      />
    );

    await user.click(screen.getByTestId('session-list-load-more'));

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    resolvePromise!({
      success: true,
      data: { sessions: [], nextCursor: null },
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  it('has minimum 44px touch target on Show more button', () => {
    render(
      <SessionList
        bookId="book-123"
        initialSessions={[makeSession('rs-1')]}
        initialCursor="rs-cursor"
      />
    );

    const button = screen.getByTestId('session-list-load-more');
    expect(button.className).toContain('min-h-[44px]');
  });
});
