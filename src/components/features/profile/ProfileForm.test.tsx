import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileForm } from './ProfileForm';

describe('ProfileForm', () => {
  const defaultProps = {
    defaultValues: {
      name: 'John Doe',
      bio: 'I love reading',
      favoriteGenres: ['Fiction'],
      showReadingActivity: true,
    },
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    isSubmitting: false,
  };

  it('renders all form fields', () => {
    render(<ProfileForm {...defaultProps} />);

    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /bio/i })).toBeInTheDocument();
    expect(screen.getByText(/favorite genres/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/show my reading activity/i)).toBeInTheDocument();
  });

  it('displays default values correctly', () => {
    render(<ProfileForm {...defaultProps} />);

    expect(screen.getByLabelText(/display name/i)).toHaveValue('John Doe');
    expect(screen.getByRole('textbox', { name: /bio/i })).toHaveValue('I love reading');
  });

  it('shows character counter for name field', () => {
    render(<ProfileForm {...defaultProps} />);
    expect(screen.getByText('8/50')).toBeInTheDocument();
  });

  it('shows character counter for bio field', () => {
    render(<ProfileForm {...defaultProps} />);
    expect(screen.getByText('14/200')).toBeInTheDocument();
  });

  it('calls onSubmit with form data when submitted', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ProfileForm {...defaultProps} onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const onCancel = vi.fn();
    render(<ProfileForm {...defaultProps} onCancel={onCancel} />);

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows loading state when submitting', () => {
    render(<ProfileForm {...defaultProps} isSubmitting={true} />);

    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });

  it('displays validation error for empty name on submit', async () => {
    const onSubmit = vi.fn();
    render(<ProfileForm {...defaultProps} defaultValues={{ ...defaultProps.defaultValues, name: '' }} onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows Fiction genre as checked by default', () => {
    render(<ProfileForm {...defaultProps} />);

    // There are multiple checkboxes, get all and find Fiction specifically
    const checkboxes = screen.getAllByRole('checkbox');
    const fictionCheckbox = checkboxes.find((cb) => cb.getAttribute('aria-label') === 'Fiction');
    expect(fictionCheckbox).toHaveAttribute('data-state', 'checked');
  });

  it('allows toggling genre checkboxes', async () => {
    render(<ProfileForm {...defaultProps} />);

    // Find Mystery checkbox by aria-label
    const checkboxes = screen.getAllByRole('checkbox');
    const mysteryCheckbox = checkboxes.find((cb) => cb.getAttribute('aria-label') === 'Mystery');
    expect(mysteryCheckbox).toHaveAttribute('data-state', 'unchecked');

    await userEvent.click(mysteryCheckbox!);
    expect(mysteryCheckbox).toHaveAttribute('data-state', 'checked');
  });

  it('allows toggling reading activity switch', async () => {
    render(<ProfileForm {...defaultProps} />);

    const activitySwitch = screen.getByRole('switch');
    expect(activitySwitch).toBeChecked();

    await userEvent.click(activitySwitch);
    expect(activitySwitch).not.toBeChecked();
  });
});
