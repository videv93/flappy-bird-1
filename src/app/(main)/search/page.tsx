'use client';

import { BookSearch } from '@/components/features/books';

export default function SearchPage() {
  return (
    <div className="flex flex-col h-full p-4">
      <BookSearch />
    </div>
  );
}
