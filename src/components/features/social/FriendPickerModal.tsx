'use client';

import { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getFollowing } from '@/actions/social/getFollowing';
import type { FollowingUser } from '@/actions/social/getFollowing';

interface FriendPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (user: FollowingUser) => void;
}

export function FriendPickerModal({ open, onClose, onSelect }: FriendPickerModalProps) {
  const [friends, setFriends] = useState<FollowingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      const result = await getFollowing();
      if (!cancelled && result.success) {
        setFriends(result.data);
      }
      if (!cancelled) {
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const filtered = filter
    ? friends.filter((f) => f.name?.toLowerCase().includes(filter.toLowerCase()))
    : friends;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      data-testid="friend-picker-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-background rounded-t-xl sm:rounded-xl w-full max-w-md max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-medium">Choose a friend</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px]"
            aria-label="Close friend picker"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="px-4 py-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search friends..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-input bg-background min-h-[44px]"
              aria-label="Search friends"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="space-y-2 p-2" data-testid="friend-picker-loading">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8" data-testid="friend-picker-empty">
              {friends.length === 0
                ? 'You need to follow someone first.'
                : 'No friends match your search.'}
            </p>
          ) : (
            filtered.map((friend) => (
              <button
                key={friend.id}
                onClick={() => onSelect(friend)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors min-h-[44px]"
                aria-label={`Invite ${friend.name ?? 'user'} to buddy read`}
              >
                <Avatar className="size-8">
                  <AvatarImage src={friend.image ?? undefined} alt={friend.name ?? 'User'} />
                  <AvatarFallback>{friend.name?.charAt(0) ?? '?'}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{friend.name ?? 'Unknown'}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
