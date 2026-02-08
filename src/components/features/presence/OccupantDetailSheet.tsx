'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import type { PresenceMember } from '@/stores/usePresenceStore';

interface OccupantDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Map<string, PresenceMember>;
}

function getInitial(name: string): string {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}

export function OccupantDetailSheet({
  open,
  onOpenChange,
  members,
}: OccupantDetailSheetProps) {
  const memberList = Array.from(members.values());
  const count = memberList.length;
  const label =
    count === 1 ? '1 reader in this room' : `${count} readers in this room`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[70vh]">
        <SheetHeader>
          <SheetTitle className="text-amber-800">{label}</SheetTitle>
          <SheetDescription className="sr-only">
            List of readers currently in this reading room
          </SheetDescription>
        </SheetHeader>
        <div className="overflow-y-auto px-4 pb-4" data-testid="occupant-list">
          {memberList.map((member) => (
            <Link
              key={member.id}
              href={`/profile/${member.id}`}
              className="flex items-center gap-3 rounded-lg px-2 py-2 min-h-[44px] hover:bg-amber-50 transition-colors"
              aria-label={`${member.name}'s profile`}
              onClick={() => onOpenChange(false)}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full border-2 border-amber-200 bg-amber-100 flex items-center justify-center overflow-hidden">
                {member.avatarUrl ? (
                  <img
                    src={member.avatarUrl}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span
                    className="text-sm font-medium text-amber-700"
                    aria-hidden="true"
                  >
                    {getInitial(member.name)}
                  </span>
                )}
              </div>
              <span className="text-sm font-medium text-amber-900 flex-1">
                {member.name}
              </span>
              <ChevronRight
                className="h-4 w-4 text-amber-400 flex-shrink-0"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
