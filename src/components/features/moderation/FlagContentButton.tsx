'use client';

import { useState } from 'react';
import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FlagContentDialog } from './FlagContentDialog';

interface FlagContentButtonProps {
  contentType: 'PROFILE_BIO' | 'READING_ROOM_DESCRIPTION';
  contentId: string;
}

export function FlagContentButton({ contentType, contentId }: FlagContentButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setDialogOpen(true)}
        className="min-h-[44px] text-muted-foreground hover:text-destructive"
        aria-label="Report content"
      >
        <Flag className="h-4 w-4" />
        <span className="sr-only sm:not-sr-only sm:ml-1">Report</span>
      </Button>

      <FlagContentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contentType={contentType}
        contentId={contentId}
      />
    </>
  );
}
