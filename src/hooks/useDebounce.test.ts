import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));

    expect(result.current).toBe('initial');
  });

  it('debounces value changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } }
    );

    // Update value
    rerender({ value: 'updated' });

    // Value should not change immediately
    expect(result.current).toBe('initial');

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Now value should be updated
    expect(result.current).toBe('updated');
  });

  it('uses default delay of 300ms', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });

    // Not updated at 299ms
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe('initial');

    // Updated at 300ms
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('updated');
  });

  it('respects custom delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });

    // Not updated at 499ms
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(result.current).toBe('initial');

    // Updated at 500ms
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('updated');
  });

  it('cancels previous timer on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } }
    );

    // Rapid changes
    rerender({ value: 'change1' });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: 'change2' });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: 'final' });

    // Value should still be initial
    expect(result.current).toBe('initial');

    // Wait for debounce
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should be the final value, not intermediate ones
    expect(result.current).toBe('final');
  });

  it('works with different types', () => {
    // Number
    const { result: numResult, rerender: numRerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 0 } }
    );

    numRerender({ value: 42 });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(numResult.current).toBe(42);

    // Object
    const initialObj = { foo: 'bar' };
    const updatedObj = { foo: 'baz' };
    const { result: objResult, rerender: objRerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: initialObj } }
    );

    objRerender({ value: updatedObj });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(objResult.current).toBe(updatedObj);
  });
});
