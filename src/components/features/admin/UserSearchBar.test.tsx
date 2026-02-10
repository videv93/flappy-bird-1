import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserSearchBar } from './UserSearchBar';

describe('UserSearchBar', () => {
  it('renders search input and button', () => {
    render(<UserSearchBar onSearch={vi.fn()} />);
    expect(screen.getByLabelText('Search users')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls onSearch with trimmed query on submit', async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    render(<UserSearchBar onSearch={onSearch} />);

    await user.type(screen.getByLabelText('Search users'), '  test@example.com  ');
    await user.click(screen.getByRole('button'));

    expect(onSearch).toHaveBeenCalledWith('test@example.com');
  });

  it('does not call onSearch with empty query', async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    render(<UserSearchBar onSearch={onSearch} />);

    await user.click(screen.getByRole('button'));
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('disables input and button when loading', () => {
    render(<UserSearchBar onSearch={vi.fn()} isLoading />);
    expect(screen.getByLabelText('Search users')).toBeDisabled();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('has minimum 44px touch target on button', () => {
    render(<UserSearchBar onSearch={vi.fn()} />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('min-h-[44px]');
  });
});
