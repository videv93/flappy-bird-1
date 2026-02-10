'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getSessionHistory } from '@/actions/admin/getSessionHistory';
import type { SessionRecord } from '@/actions/admin/getSessionHistory';

interface UserSessionsListProps {
  userId: string;
}

export function UserSessionsList({ userId }: UserSessionsListProps) {
  const [sessions, setSessions] = useState<SessionRecord[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  async function handleLoadSessions() {
    setConfirmed(true);
    setIsLoading(true);
    setError(null);
    try {
      const result = await getSessionHistory(userId);
      if (result.success) {
        setSessions(result.data);
      } else {
        setError(result.error);
      }
    } catch {
      setError('Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Auth Sessions</CardTitle>
      </CardHeader>
      <CardContent>
        {!confirmed && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              Session data contains sensitive information. Loading will be logged for audit purposes.
            </p>
            <Button
              variant="secondary"
              className="min-h-[44px]"
              onClick={handleLoadSessions}
            >
              Show Sessions
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="space-y-3" data-testid="sessions-loading">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {sessions && sessions.length === 0 && (
          <p className="text-sm text-muted-foreground">No sessions found.</p>
        )}

        {sessions && sessions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Token</th>
                  <th className="pb-2 font-medium">Browser</th>
                  <th className="pb-2 font-medium">OS</th>
                  <th className="pb-2 font-medium">IP</th>
                  <th className="pb-2 font-medium">Created</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-2 font-mono text-xs">{s.maskedToken}</td>
                    <td className="py-2">{s.deviceInfo.browser}</td>
                    <td className="py-2">{s.deviceInfo.os}</td>
                    <td className="py-2 text-muted-foreground">{s.ipAddress ?? 'N/A'}</td>
                    <td className="py-2 text-muted-foreground">
                      {new Date(s.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2">
                      {s.isActive ? (
                        <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 px-2 py-0.5 rounded">
                          Active
                        </span>
                      ) : (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                          Expired
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
