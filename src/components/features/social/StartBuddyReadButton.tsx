'use client';

import { useState } from 'react';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FriendPickerModal } from './FriendPickerModal';
import { createBuddyRead } from '@/actions/social/createBuddyRead';
import { toast } from 'sonner';
import type { FollowingUser } from '@/actions/social/getFollowing';

interface StartBuddyReadButtonProps {
  bookId: string;
}

export function StartBuddyReadButton({ bookId }: StartBuddyReadButtonProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSelect = async (friend: FollowingUser) => {
    setSending(true);
    const result = await createBuddyRead({ bookId, inviteeId: friend.id });
    setSending(false);
    setShowPicker(false);

    if (result.success) {
      toast.success(`Buddy read invitation sent to ${friend.name ?? 'your friend'}!`);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="min-h-[44px]"
        onClick={() => setShowPicker(true)}
        disabled={sending}
        aria-label="Start a buddy read"
        data-testid="start-buddy-read-button"
      >
        <Users className="size-4" />
        Buddy Read
      </Button>

      <FriendPickerModal
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handleSelect}
      />
    </>
  );
}
