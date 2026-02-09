import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModerationEmptyState } from './ModerationEmptyState';

describe('ModerationEmptyState', () => {
  it('renders empty state message', () => {
    render(<ModerationEmptyState />);

    expect(screen.getByText('No pending items')).toBeInTheDocument();
    expect(screen.getByText('Great work!')).toBeInTheDocument();
  });
});
