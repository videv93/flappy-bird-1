import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReadingStatusSelector, getReadingStatusLabel } from './ReadingStatusSelector';

describe('ReadingStatusSelector', () => {
  it('renders all three status options', () => {
    render(<ReadingStatusSelector onSelect={vi.fn()} />);

    expect(screen.getByRole('radio', { name: /currently reading/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /finished/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /want to read/i })).toBeInTheDocument();
  });

  it('calls onSelect when option is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ReadingStatusSelector onSelect={onSelect} />);

    await user.click(screen.getByRole('radio', { name: /currently reading/i }));
    expect(onSelect).toHaveBeenCalledWith('CURRENTLY_READING');

    await user.click(screen.getByRole('radio', { name: /finished/i }));
    expect(onSelect).toHaveBeenCalledWith('FINISHED');

    await user.click(screen.getByRole('radio', { name: /want to read/i }));
    expect(onSelect).toHaveBeenCalledWith('WANT_TO_READ');
  });

  it('shows selected state for value prop', () => {
    render(<ReadingStatusSelector value="FINISHED" onSelect={vi.fn()} />);

    const finishedOption = screen.getByRole('radio', { name: /finished/i });
    expect(finishedOption).toHaveAttribute('aria-checked', 'true');

    const currentlyReadingOption = screen.getByRole('radio', { name: /currently reading/i });
    expect(currentlyReadingOption).toHaveAttribute('aria-checked', 'false');
  });

  it('disables all options when disabled prop is true', () => {
    render(<ReadingStatusSelector onSelect={vi.fn()} disabled />);

    expect(screen.getByRole('radio', { name: /currently reading/i })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /finished/i })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /want to read/i })).toBeDisabled();
  });

  it('does not call onSelect when disabled', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ReadingStatusSelector onSelect={onSelect} disabled />);

    await user.click(screen.getByRole('radio', { name: /currently reading/i }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('has radiogroup role with label', () => {
    render(<ReadingStatusSelector onSelect={vi.fn()} />);

    expect(screen.getByRole('radiogroup', { name: /select reading status/i })).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<ReadingStatusSelector onSelect={vi.fn()} className="custom-class" />);

    const radiogroup = screen.getByRole('radiogroup');
    expect(radiogroup).toHaveClass('custom-class');
  });
});

describe('getReadingStatusLabel', () => {
  it('returns correct label for CURRENTLY_READING', () => {
    expect(getReadingStatusLabel('CURRENTLY_READING')).toBe('Currently Reading');
  });

  it('returns correct label for FINISHED', () => {
    expect(getReadingStatusLabel('FINISHED')).toBe('Finished');
  });

  it('returns correct label for WANT_TO_READ', () => {
    expect(getReadingStatusLabel('WANT_TO_READ')).toBe('Want to Read');
  });
});
