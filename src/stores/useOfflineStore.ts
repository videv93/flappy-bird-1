import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '@/lib/idb-storage';

export interface PendingSession {
  bookId: string;
  duration: number;
  startedAt: string;
  endedAt: string;
}

interface OfflineState {
  // Persisted state
  pendingSessions: PendingSession[];

  // Runtime-only state
  _hasHydrated: boolean;

  // Actions
  queueSession: (session: PendingSession) => void;
  removeSession: (index: number) => void;
  clearSessions: () => void;

  // Computed
  getPendingSessions: () => PendingSession[];
  hasPendingSessions: () => boolean;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      pendingSessions: [],
      _hasHydrated: false,

      queueSession: (session: PendingSession) =>
        set((state) => ({
          pendingSessions: [...state.pendingSessions, session],
        })),

      removeSession: (index: number) =>
        set((state) => ({
          pendingSessions: state.pendingSessions.filter((_, i) => i !== index),
        })),

      clearSessions: () => set({ pendingSessions: [] }),

      getPendingSessions: () => get().pendingSessions,

      hasPendingSessions: () => get().pendingSessions.length > 0,
    }),
    {
      name: 'offline-store',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        pendingSessions: state.pendingSessions,
      }),
      onRehydrateStorage: () => {
        return () => {
          useOfflineStore.setState({ _hasHydrated: true });
        };
      },
    }
  )
);
