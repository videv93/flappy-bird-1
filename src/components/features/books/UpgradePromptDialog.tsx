'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface UpgradePromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBookCount: number;
  maxBooks: number;
}

export function UpgradePromptDialog({
  open,
  onOpenChange,
  currentBookCount,
  maxBooks,
}: UpgradePromptDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="upgrade-prompt-dialog">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-amber-100">
            <Sparkles className="size-8 text-amber-600" aria-hidden />
          </AlertDialogMedia>
          <AlertDialogTitle>You&apos;re a power reader!</AlertDialogTitle>
          <AlertDialogDescription>
            You&apos;ve used{' '}
            <strong>
              {currentBookCount}/{maxBooks} books
            </strong>{' '}
            in your free library. Upgrade to Premium for{' '}
            <strong>unlimited book tracking</strong> with a one-time payment of
            $9.99.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-[44px]">
            Maybe Later
          </AlertDialogCancel>
          <AlertDialogAction asChild className="min-h-[44px]">
            <Link href="/upgrade">Upgrade to Premium</Link>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
