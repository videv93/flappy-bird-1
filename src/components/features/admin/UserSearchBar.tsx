'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search } from 'lucide-react';

interface UserSearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export function UserSearchBar({ onSearch, isLoading = false }: UserSearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (trimmed) {
        onSearch(trimmed);
      }
    },
    [query, onSearch]
  );

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by email, username, or user ID..."
        disabled={isLoading}
        className="flex-1"
        aria-label="Search users"
      />
      <Button
        type="submit"
        disabled={isLoading || !query.trim()}
        className="min-h-[44px] min-w-[44px]"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Search className="h-4 w-4" />
        )}
        <span className="hidden sm:inline ml-2">Search</span>
      </Button>
    </form>
  );
}
