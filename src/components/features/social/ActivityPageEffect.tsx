'use client';

import { useEffect } from 'react';
import { markActivityViewed } from '@/actions/social/markActivityViewed';
import { useNotificationStore } from '@/stores/useNotificationStore';

export function ActivityPageEffect() {
  const resetUnread = useNotificationStore((s) => s.resetUnread);

  useEffect(() => {
    resetUnread();
    markActivityViewed().catch((error) => {
      console.error('Failed to mark activity as viewed:', error);
    });
  }, [resetUnread]);

  return null;
}
