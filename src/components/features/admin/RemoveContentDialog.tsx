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
import { Button } from '@/components/ui/button';
import { removeContent } from '@/actions/admin/removeContent';
import { toast } from 'sonner';

const VIOLATION_TYPES = [
  { value: 'SPAM', label: 'Spam' },
  { value: 'HARASSMENT', label: 'Harassment' },
  { value: 'SPOILERS', label: 'Spoilers' },
  { value: 'INAPPROPRIATE', label: 'Inappropriate' },
  { value: 'OTHER', label: 'Other' },
] as const;

type ViolationType = (typeof VIOLATION_TYPES)[number]['value'];

interface RemoveContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moderationItemId: string;
  onSuccess?: () => void;
}

export function RemoveContentDialog({
  open,
  onOpenChange,
  moderationItemId,
  onSuccess,
}: RemoveContentDialogProps) {
  const [violationType, setViolationType] = useState<ViolationType | ''>('');
  const [adminNotes, setAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isValid = violationType !== '';

  function handleClose() {
    setViolationType('');
    setAdminNotes('');
    setError('');
    onOpenChange(false);
  }

  async function handleSubmit() {
    if (!isValid) {
      setError('Please select a violation type');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const result = await removeContent({
        moderationItemId,
        violationType,
        adminNotes: adminNotes.trim() || undefined,
      });

      if (result.success) {
        toast.success('Content removed successfully');
        handleClose();
        onSuccess?.();
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
          <AlertDialogTitle>Remove Content</AlertDialogTitle>
          <AlertDialogDescription>
            Select the violation type and optionally add notes explaining the decision.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Violation Type</Label>
            <div className="flex flex-wrap gap-2">
              {VIOLATION_TYPES.map((type) => (
                <Button
                  key={type.value}
                  type="button"
                  variant={violationType === type.value ? 'default' : 'outline'}
                  size="sm"
                  className="min-h-[44px]"
                  onClick={() => {
                    setViolationType(type.value);
                    if (error) setError('');
                  }}
                >
                  {type.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="removal-notes">Notes (optional)</Label>
            <Textarea
              id="removal-notes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Explain the removal decision..."
              rows={3}
              maxLength={1000}
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {adminNotes.length}/1000 characters
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting} onClick={handleClose}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            disabled={submitting || !isValid}
          >
            {submitting ? 'Removing...' : 'Remove Content'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
