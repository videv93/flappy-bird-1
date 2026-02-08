import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KudosList } from './KudosList';
import { getKudosReceived } from '@/actions/social';
import type { KudosWithDetails } from '@/actions/social';
import { toast } from 'sonner';

vi.mock('@/actions/social', () => ({
  getKudosReceived: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

const mockGetKudosReceived = getKudosReceived as ReturnType<typeof vi.fn>;

const mockKudos: KudosWithDetails[] = [
  {
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
  },
  {
    id: 'kudos-2',
    createdAt: new Date('2026-02-06T10:00:00Z'),
    giver: {
      id: 'user-3',
      name: 'Bob Smith',
      image: '/bob.jpg',
    },
    session: {
      id: 'session-2',
      book: {
        id: 'book-2',
        title: 'The Martian',
        coverUrl: '/martian.jpg',
      },
    },
  },
];

describe('KudosList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render list of kudos correctly', () => {
    render(<KudosList initialKudos={mockKudos} initialTotal={2} />);

    expect(screen.getByText('Alice Reader')).toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    expect(screen.getByText('Project Hail Mary')).toBeInTheDocument();
    expect(screen.getByText('The Martian')).toBeInTheDocument();
  });

  it('should show total count', () => {
    render(<KudosList initialKudos={mockKudos} initialTotal={42} />);

    expect(screen.getByText(/42 total/)).toBeInTheDocument();
  });

  it('should show empty state when no kudos', () => {
    render(<KudosList initialKudos={[]} initialTotal={0} />);

    expect(
      screen.getByText(/No kudos yet. Keep reading and share your progress with friends!/)
    ).toBeInTheDocument();
  });

  it('should show Load More button when hasMore is true', () => {
    // initialKudos.length (2) < initialTotal (10)
    render(<KudosList initialKudos={mockKudos} initialTotal={10} />);

    expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument();
  });

  it('should hide Load More button when all kudos loaded', () => {
    // initialKudos.length (2) === initialTotal (2)
    render(<KudosList initialKudos={mockKudos} initialTotal={2} />);

    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
  });

  it('should fetch next page with correct offset when Load More clicked', async () => {
    const user = userEvent.setup();

    mockGetKudosReceived.mockResolvedValueOnce({
      success: true,
      data: {
        kudos: [
          {
            id: 'kudos-3',
            createdAt: new Date('2026-02-05T10:00:00Z'),
            giver: {
              id: 'user-4',
              name: 'Charlie Brown',
              image: '/charlie.jpg',
            },
            session: {
              id: 'session-3',
              book: {
                id: 'book-3',
                title: 'Seveneves',
                coverUrl: '/seveneves.jpg',
              },
            },
          },
        ],
        total: 3,
        hasMore: false,
      },
    });

    render(<KudosList initialKudos={mockKudos} initialTotal={3} />);

    const loadMoreButton = screen.getByRole('button', { name: /load more/i });
    await user.click(loadMoreButton);

    await waitFor(() => {
      expect(mockGetKudosReceived).toHaveBeenCalledWith({
        limit: 20,
        offset: 2, // Length of initial kudos
      });
    });
  });

  it('should show loading state while fetching', async () => {
    const user = userEvent.setup();

    // Never resolve to keep in loading state
    mockGetKudosReceived.mockImplementation(
      () => new Promise(() => {})
    );

    render(<KudosList initialKudos={mockKudos} initialTotal={10} />);

    const loadMoreButton = screen.getByRole('button', { name: /load more/i });
    await user.click(loadMoreButton);

    await waitFor(() => {
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  it('should handle error from getKudosReceived with toast', async () => {
    const user = userEvent.setup();

    mockGetKudosReceived.mockResolvedValueOnce({
      success: false,
      error: 'Failed to load kudos',
    });

    render(<KudosList initialKudos={mockKudos} initialTotal={10} />);

    const loadMoreButton = screen.getByRole('button', { name: /load more/i });
    await user.click(loadMoreButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to load kudos');
    });
  });

  it('should append new kudos to list on successful load', async () => {
    const user = userEvent.setup();

    mockGetKudosReceived.mockResolvedValueOnce({
      success: true,
      data: {
        kudos: [
          {
            id: 'kudos-3',
            createdAt: new Date('2026-02-05T10:00:00Z'),
            giver: {
              id: 'user-4',
              name: 'Charlie Brown',
              image: '/charlie.jpg',
            },
            session: {
              id: 'session-3',
              book: {
                id: 'book-3',
                title: 'Seveneves',
                coverUrl: '/seveneves.jpg',
              },
            },
          },
        ],
        total: 3,
        hasMore: false,
      },
    });

    render(<KudosList initialKudos={mockKudos} initialTotal={3} />);

    // Initially 2 kudos
    expect(screen.getByText('Alice Reader')).toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    expect(screen.queryByText('Charlie Brown')).not.toBeInTheDocument();

    const loadMoreButton = screen.getByRole('button', { name: /load more/i });
    await user.click(loadMoreButton);

    // After loading, 3 kudos
    await waitFor(() => {
      expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
    });

    expect(screen.getByText('Alice Reader')).toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
  });

  it('should hide Load More button after loading all kudos', async () => {
    const user = userEvent.setup();

    mockGetKudosReceived.mockResolvedValueOnce({
      success: true,
      data: {
        kudos: [],
        total: 2,
        hasMore: false,
      },
    });

    render(<KudosList initialKudos={mockKudos} initialTotal={3} />);

    const loadMoreButton = screen.getByRole('button', { name: /load more/i });
    expect(loadMoreButton).toBeInTheDocument();

    await user.click(loadMoreButton);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
    });
  });

  it('should have accessible labels and ARIA attributes', () => {
    render(<KudosList initialKudos={mockKudos} initialTotal={10} />);

    const heading = screen.getByRole('heading', { name: /kudos received/i });
    expect(heading).toBeInTheDocument();

    const loadMoreButton = screen.getByRole('button', { name: /load more/i });
    expect(loadMoreButton).toBeInTheDocument();
  });

  it('should show empty state icon (heart)', () => {
    const { container } = render(<KudosList initialKudos={[]} initialTotal={0} />);

    // Heart icon should be in the DOM (lucide-react Heart component renders as svg)
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
