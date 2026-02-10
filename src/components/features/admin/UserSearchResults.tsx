'use client';

import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import type { UserSearchResult } from '@/actions/admin/searchUsers';

interface UserSearchResultsProps {
  users: UserSearchResult[];
  total: number;
  isLoading?: boolean;
  hasSearched?: boolean;
}

export function UserSearchResults({
  users,
  total,
  isLoading = false,
  hasSearched = false,
}: UserSearchResultsProps) {
  if (isLoading) {
    return (
      <div className="space-y-3" data-testid="search-loading">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (!hasSearched) {
    return null;
  }

  if (users.length === 0) {
    return (
      <div className="rounded-lg border border-border p-8 text-center">
        <p className="text-muted-foreground">No users found matching your search.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-3">
        {total} result{total !== 1 ? 's' : ''} found
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Email</th>
              <th className="pb-2 font-medium">Role</th>
              <th className="pb-2 font-medium">Joined</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isSuspended =
                user.suspendedUntil && new Date(user.suspendedUntil) > new Date();
              return (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="py-3">{user.name ?? 'N/A'}</td>
                  <td className="py-3 text-muted-foreground">{user.email}</td>
                  <td className="py-3">
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3">
                    {isSuspended ? (
                      <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                        Suspended
                      </span>
                    ) : (
                      <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 px-2 py-0.5 rounded">
                        Active
                      </span>
                    )}
                    {user.warningCount > 0 && (
                      <span className="ml-1 text-xs text-yellow-600">
                        {user.warningCount}w
                      </span>
                    )}
                  </td>
                  <td className="py-3">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="text-amber-700 dark:text-amber-400 hover:underline min-h-[44px] inline-flex items-center"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
