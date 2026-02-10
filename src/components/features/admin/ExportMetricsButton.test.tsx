import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExportMetricsButton } from './ExportMetricsButton';

describe('ExportMetricsButton', () => {
  it('renders export button', () => {
    render(<ExportMetricsButton />);
    expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
  });

  it('has minimum 44px touch target', () => {
    render(<ExportMetricsButton />);
    const button = screen.getByRole('button', { name: /export csv/i });
    expect(button).toHaveClass('min-h-[44px]');
  });

  it('shows loading state during export', async () => {
    const mockBlob = new Blob(['csv data'], { type: 'text/csv' });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:url');
    global.URL.revokeObjectURL = vi.fn();

    render(<ExportMetricsButton />);
    const button = screen.getByRole('button', { name: /export csv/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /export csv/i })).not.toBeDisabled();
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/admin/export/metrics');
  });
});
