import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '@/lib/idb-storage';

interface TimerState {
  // Persisted state
  startTime: number | null;
  currentBookId: string | null;
  currentBookTitle: string | null;

  // Runtime-only state (NOT persisted)
  isRunning: boolean;
  _hasHydrated: boolean;

  // Actions
  start: (bookId: string, bookTitle: string) => void;
  stop: () => void;
  reset: () => void;

  // Computed
  getElapsedSeconds: () => number;
  isActive: () => boolean;
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      startTime: null,
      currentBookId: null,
      currentBookTitle: null,
      isRunning: false,
      _hasHydrated: false,

      start: (bookId: string, bookTitle: string) =>
        set({
          isRunning: true,
          startTime: Date.now(),
          currentBookId: bookId,
          currentBookTitle: bookTitle,
        }),

      stop: () => set({ isRunning: false }),

      reset: () =>
        set({
          isRunning: false,
          startTime: null,
          currentBookId: null,
          currentBookTitle: null,
        }),

      getElapsedSeconds: () => {
        const { startTime } = get();
        if (!startTime) return 0;
        return Math.floor((Date.now() - startTime) / 1000);
      },

      isActive: () => {
        const { isRunning, currentBookId } = get();
        return isRunning && currentBookId !== null;
      },
    }),
    {
      name: 'timer-store',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        startTime: state.startTime,
        currentBookId: state.currentBookId,
        currentBookTitle: state.currentBookTitle,
      }),
      onRehydrateStorage: () => {
        return (state) => {
          if (state?.startTime) {
            useTimerStore.setState({ isRunning: true });
          }
          useTimerStore.setState({ _hasHydrated: true });
        };
      },
    }
  )
);
