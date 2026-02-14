'use client';

import { useState, useEffect, useCallback } from 'react';
import { BuddyReadInvitationCard } from './BuddyReadInvitationCard';
import { getBuddyReadInvitations } from '@/actions/social/getBuddyReadInvitations';
import type { BuddyReadInvitationData } from '@/actions/social/getBuddyReadInvitations';

export function BuddyReadInvitations() {
  const [invitations, setInvitations] = useState<BuddyReadInvitationData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const result = await getBuddyReadInvitations();
      if (!cancelled && result.success) {
        setInvitations(result.data);
      }
      if (!cancelled) {
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRespond = useCallback(
    (invitationId: string) => {
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    },
    []
  );

  if (loading) {
    return (
      <div className="space-y-3 p-4" data-testid="buddy-read-loading">
        {[1, 2].map((i) => (
          <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground" data-testid="buddy-read-empty">
        No buddy read invitations right now.
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4" data-testid="buddy-read-invitations">
      {invitations.map((inv) => (
        <BuddyReadInvitationCard
          key={inv.id}
          invitation={inv}
          onRespond={handleRespond}
        />
      ))}
    </div>
  );
}
