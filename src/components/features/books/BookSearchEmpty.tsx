import { Search } from 'lucide-react';

interface BookSearchEmptyProps {
  query: string;
}

export function BookSearchEmpty({ query }: BookSearchEmptyProps) {
  return (
    <div
      data-testid="book-search-empty"
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
    >
      <Search
        className="h-12 w-12 text-muted-foreground mb-4"
        data-testid="empty-search-icon"
        aria-hidden="true"
      />
      <h3 className="font-medium text-lg mb-2">
        No books found for &quot;{query}&quot;
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Try searching with different keywords, or check the spelling of the
        title or author name.
      </p>
    </div>
  );
}
