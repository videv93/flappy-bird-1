import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthorEngagementMetrics } from './AuthorEngagementMetrics';

vi.mock('@/actions/authors/getBookEngagement', () => ({
  getBookEngagement: vi.fn(),
}));

import { getBookEngagement } from '@/actions/authors/getBookEngagement';

const mockGetBookEngagement = getBookEngagement as ReturnType<typeof vi.fn>;

describe('AuthorEngagementMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading skeleton initially', () => {
    mockGetBookEngagement.mockReturnValue(new Promise(() => {})); // Never resolves
    render(<AuthorEngagementMetrics bookId="book-1" />);

    expect(screen.getByTestId('engagement-metrics-loading')).toBeInTheDocument();
  });

  it('renders metrics on success', async () => {
    mockGetBookEngagement.mockResolvedValue({
      success: true,
      data: { libraryCount: 42, currentlyReadingCount: 15, roomOccupantCount: 5 },
    });

    render(<AuthorEngagementMetrics bookId="book-1" />);

    await waitFor(() => {
      expect(screen.getByTestId('engagement-metrics')).toBeInTheDocument();
    });
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('In Library')).toBeInTheDocument();
    expect(screen.getByText('Reading Now')).toBeInTheDocument();
    expect(screen.getByText('In Room')).toBeInTheDocument();
  });

  it('renders nothing when request fails', async () => {
    mockGetBookEngagement.mockResolvedValue({
      success: false,
      error: 'Not a verified author',
    });

    const { container } = render(<AuthorEngagementMetrics bookId="book-1" />);

    await waitFor(() => {
      expect(screen.queryByTestId('engagement-metrics-loading')).not.toBeInTheDocument();
    });
    expect(screen.queryByTestId('engagement-metrics')).not.toBeInTheDocument();
  });

  it('calls getBookEngagement with correct bookId', async () => {
    mockGetBookEngagement.mockResolvedValue({ success: false, error: 'err' });

    render(<AuthorEngagementMetrics bookId="my-book-123" />);

    await waitFor(() => {
      expect(mockGetBookEngagement).toHaveBeenCalledWith('my-book-123');
    });
  });
});
