'use client';

import Link from 'next/link';
import { BookOpen } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function LibraryEmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 px-8 py-16"
      data-testid="library-empty-state"
    >
      <BookOpen className="h-16 w-16 text-muted-foreground" />
      <h2 className="text-xl font-semibold text-foreground">
        Start your reading journey
      </h2>
      <p className="text-center text-sm text-muted-foreground">
        Add books to your library to track what you&apos;re reading and discover what
        others are enjoying.
      </p>
      <Button asChild>
        <Link href="/search">Find a Book</Link>
      </Button>
    </div>
  );
}
