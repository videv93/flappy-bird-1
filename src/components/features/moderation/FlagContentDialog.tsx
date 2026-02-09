'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { flagContent } from '@/actions/moderation/flagContent';
import { toast } from 'sonner';

interface FlagContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: 'PROFILE_BIO' | 'READING_ROOM_DESCRIPTION';
  contentId: string;
}

export function FlagContentDialog({
  open,
  onOpenChange,
  contentType,
  contentId,
}: FlagContentDialogProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isValid = reason.trim().length >= 10;

  async function handleSubmit() {
    if (!isValid) {
      setError('Reason must be at least 10 characters');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const result = await flagContent({
        contentType,
        contentId,
        reason: reason.trim(),
      });

      if (result.success) {
        toast.success('Report submitted. Thank you for helping keep our community safe.');
        setReason('');
        onOpenChange(false);
      } else {
        setError(result.error);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Report Content</AlertDialogTitle>
          <AlertDialogDescription>
            Please describe why this content should be reviewed by our moderation team.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="flag-reason">Reason</Label>
          <Textarea
            id="flag-reason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError('');
            }}
            placeholder="Describe why this content is inappropriate (min 10 characters)..."
            rows={3}
            className="text-sm"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <p className="text-xs text-muted-foreground">
            {reason.trim().length}/500 characters
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            disabled={submitting || !isValid}
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
