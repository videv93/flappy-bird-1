import { cache } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getBookById } from '@/actions/books';
import { getBookSessions } from '@/actions/sessions';
import { BookDetail } from '@/components/features/books';
import { PageHeader, BackButton } from '@/components/layout';

// Cache the server action to deduplicate calls between generateMetadata and page render
const getCachedBookById = cache(getBookById);

interface BookPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: BookPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getCachedBookById(id);

  if (!result.success) {
    return { title: 'Book Not Found' };
  }

  const { book } = result.data;
  return {
    title: `${book.title} by ${book.author}`,
    description: book.description || `View details for ${book.title}`,
    openGraph: {
      title: book.title,
      description: book.description || undefined,
      images: book.coverUrl ? [book.coverUrl] : undefined,
    },
  };
}

export default async function BookPage({ params }: BookPageProps) {
  const { id } = await params;
  const result = await getCachedBookById(id);

  if (!result.success) {
    notFound();
  }

  // Fetch sessions for the book (returns empty if not authenticated)
  const sessionsResult = await getBookSessions({ bookId: result.data.book.id });
  const initialSessions = sessionsResult.success ? sessionsResult.data.sessions : [];
  const initialCursor = sessionsResult.success ? sessionsResult.data.nextCursor : null;

  return (
    <>
      <PageHeader
        title="Book Details"
        leftSlot={<BackButton fallbackHref="/search" />}
      />
      <BookDetail
        data={result.data}
        initialSessions={initialSessions}
        initialCursor={initialCursor}
      />
    </>
  );
}
