'use client';

import { useState, useCallback } from 'react';
import { UserSearchBar } from '@/components/features/admin/UserSearchBar';
import { UserSearchResults } from '@/components/features/admin/UserSearchResults';
import { searchUsers } from '@/actions/admin/searchUsers';
import type { UserSearchResult } from '@/actions/admin/searchUsers';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserSearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async (query: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await searchUsers({ query });
      if (result.success) {
        setUsers(result.data.users);
        setTotal(result.data.total);
      } else {
        setError(result.error);
        setUsers([]);
        setTotal(0);
      }
    } catch {
      setError('Search failed. Please try again.');
      setUsers([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
      setHasSearched(true);
    }
  }, []);

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6">
      <h2 className="text-xl font-semibold mb-6">User Lookup</h2>
      <div className="space-y-6">
        <UserSearchBar onSearch={handleSearch} isLoading={isLoading} />
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        <UserSearchResults
          users={users}
          total={total}
          isLoading={isLoading}
          hasSearched={hasSearched}
        />
      </div>
    </div>
  );
}
