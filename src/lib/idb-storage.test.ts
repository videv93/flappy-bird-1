import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get, set, del } from 'idb-keyval';
import { idbStorage } from './idb-storage';

vi.mock('idb-keyval');

const mockGet = vi.mocked(get);
const mockSet = vi.mocked(set);
const mockDel = vi.mocked(del);

// jsdom does not provide indexedDB — stub it for tests that need it
const fakeIndexedDB = {} as IDBFactory;

describe('idbStorage', () => {
  const store = new Map<string, unknown>();

  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();

    // Provide indexedDB so SSR guard passes
    globalThis.indexedDB = fakeIndexedDB;

    mockGet.mockImplementation((key: IDBValidKey) =>
      Promise.resolve(store.get(String(key)))
    );
    mockSet.mockImplementation((key: IDBValidKey, value: unknown) => {
      store.set(String(key), value);
      return Promise.resolve();
    });
    mockDel.mockImplementation((key: IDBValidKey) => {
      store.delete(String(key));
      return Promise.resolve();
    });
  });

  afterEach(() => {
    // Restore original state
    globalThis.indexedDB = fakeIndexedDB;
  });

  it('getItem returns null for non-existent key', async () => {
    const result = await idbStorage.getItem('missing');
    expect(result).toBeNull();
  });

  it('setItem and getItem round-trip works', async () => {
    await idbStorage.setItem('test-key', '{"count":42}');
    const result = await idbStorage.getItem('test-key');
    expect(result).toBe('{"count":42}');
  });

  it('removeItem deletes the value', async () => {
    await idbStorage.setItem('to-delete', 'value');
    expect(await idbStorage.getItem('to-delete')).toBe('value');

    await idbStorage.removeItem('to-delete');
    expect(await idbStorage.getItem('to-delete')).toBeNull();
  });

  it('getItem returns null when indexedDB is undefined (SSR)', async () => {
    // @ts-expect-error - deliberately removing for SSR simulation
    delete globalThis.indexedDB;

    const result = await idbStorage.getItem('any-key');
    expect(result).toBeNull();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('setItem is a no-op when indexedDB is undefined (SSR)', async () => {
    // @ts-expect-error - deliberately removing for SSR simulation
    delete globalThis.indexedDB;

    await idbStorage.setItem('key', 'value');
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('removeItem is a no-op when indexedDB is undefined (SSR)', async () => {
    // @ts-expect-error - deliberately removing for SSR simulation
    delete globalThis.indexedDB;

    await idbStorage.removeItem('key');
    expect(mockDel).not.toHaveBeenCalled();
  });
});
