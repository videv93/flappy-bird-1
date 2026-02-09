import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIdleTimeout } from './useIdleTimeout';

describe('useIdleTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires callback after timeout when enabled', () => {
    const callback = vi.fn();
    renderHook(() => useIdleTimeout(callback, 5000, true));

    expect(callback).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does not fire callback when disabled', () => {
    const callback = vi.fn();
    renderHook(() => useIdleTimeout(callback, 5000, false));

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('resets timer on mousemove activity', () => {
    const callback = vi.fn();
    renderHook(() => useIdleTimeout(callback, 5000, true));

    // Advance 3 seconds (not yet at timeout)
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Simulate user activity
    act(() => {
      document.dispatchEvent(new Event('mousemove'));
    });

    // Advance another 3 seconds (6 seconds total from start, but only 3 since reset)
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(callback).not.toHaveBeenCalled();

    // Advance remaining 2 seconds to reach timeout from last activity
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('resets timer on keydown activity', () => {
    const callback = vi.fn();
    renderHook(() => useIdleTimeout(callback, 5000, true));

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    act(() => {
      document.dispatchEvent(new Event('keydown'));
    });

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(callback).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('resets timer on touchstart activity', () => {
    const callback = vi.fn();
    renderHook(() => useIdleTimeout(callback, 5000, true));

    act(() => {
      vi.advanceTimersByTime(4500);
    });

    act(() => {
      document.dispatchEvent(new Event('touchstart'));
    });

    act(() => {
      vi.advanceTimersByTime(4500);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('resets timer on scroll activity', () => {
    const callback = vi.fn();
    renderHook(() => useIdleTimeout(callback, 5000, true));

    act(() => {
      vi.advanceTimersByTime(4500);
    });

    act(() => {
      document.dispatchEvent(new Event('scroll'));
    });

    act(() => {
      vi.advanceTimersByTime(4500);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('cleans up event listeners on unmount', () => {
    const callback = vi.fn();
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = renderHook(() => useIdleTimeout(callback, 5000, true));

    unmount();

    const removedEvents = removeEventListenerSpy.mock.calls.map((c) => c[0]);
    expect(removedEvents).toContain('mousemove');
    expect(removedEvents).toContain('keydown');
    expect(removedEvents).toContain('touchstart');
    expect(removedEvents).toContain('scroll');

    removeEventListenerSpy.mockRestore();
  });

  it('clears timer on unmount (callback does not fire)', () => {
    const callback = vi.fn();
    const { unmount } = renderHook(() => useIdleTimeout(callback, 5000, true));

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    unmount();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('stops when enabled changes to false', () => {
    const callback = vi.fn();
    const { rerender } = renderHook(
      ({ enabled }) => useIdleTimeout(callback, 5000, enabled),
      { initialProps: { enabled: true } },
    );

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    rerender({ enabled: false });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('starts when enabled changes to true', () => {
    const callback = vi.fn();
    const { rerender } = renderHook(
      ({ enabled }) => useIdleTimeout(callback, 5000, enabled),
      { initialProps: { enabled: false } },
    );

    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(callback).not.toHaveBeenCalled();

    rerender({ enabled: true });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('reset() restarts the timer', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useIdleTimeout(callback, 5000, true));

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    act(() => {
      result.current.reset();
    });

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(callback).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('fires callback only once (does not repeat)', () => {
    const callback = vi.fn();
    renderHook(() => useIdleTimeout(callback, 5000, true));

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(callback).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });
});
