'use client';

import { PageHeader } from '@/components/layout';
import { LibraryView } from '@/components/features/books/LibraryView';

export default function LibraryPage() {
  return (
    <>
      <PageHeader title="Library" />
      <LibraryView />
    </>
  );
}
