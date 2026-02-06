import { get, set, del } from 'idb-keyval';
import type { StateStorage } from 'zustand/middleware';

/**
 * IndexedDB storage adapter for Zustand persist middleware.
 * Uses idb-keyval for simple key-value storage.
 * SSR-safe: returns null/no-op when indexedDB is unavailable.
 */
export const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (typeof indexedDB === 'undefined') return null;
    return (await get(name)) ?? null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (typeof indexedDB === 'undefined') return;
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    if (typeof indexedDB === 'undefined') return;
    await del(name);
  },
};
