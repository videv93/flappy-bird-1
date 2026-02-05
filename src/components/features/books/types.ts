// Re-export types from services for component usage
export type { BookSearchResult, BookSearchResponse } from '@/services/books/types';

// Component-specific types
export type SearchState = 'idle' | 'loading' | 'success' | 'error' | 'empty';
