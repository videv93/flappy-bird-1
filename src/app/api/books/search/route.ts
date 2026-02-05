/**
 * Book Search API Route
 * GET /api/books/search?q=query
 *
 * Searches for books using OpenLibrary (primary) with Google Books fallback
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { searchBooks } from '@/services/books';

// Request validation schema
const searchSchema = z.object({
  q: z
    .string()
    .min(3, 'Search query must be at least 3 characters')
    .max(200, 'Search query must be at most 200 characters'),
  limit: z
    .string()
    .nullish()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().min(1).max(40)),
});

// Error response type following architecture spec
interface ApiError {
  error: {
    code:
      | 'VALIDATION_ERROR'
      | 'NOT_FOUND'
      | 'UNAUTHORIZED'
      | 'FORBIDDEN'
      | 'RATE_LIMITED'
      | 'INTERNAL_ERROR';
    message: string;
    details?: Record<string, string[]>;
  };
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);

    // Validate query parameters
    const parseResult = searchSchema.safeParse({
      q: searchParams.get('q'),
      limit: searchParams.get('limit'),
    });

    if (!parseResult.success) {
      const response: ApiError = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid search query',
          details: parseResult.error.flatten().fieldErrors as Record<string, string[]>,
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    const { q, limit } = parseResult.data;

    // Search for books
    const results = await searchBooks(q, limit);

    return NextResponse.json(results);
  } catch (error) {
    // Log error for debugging (would be Sentry in production)
    console.error('Book search error:', error);

    const response: ApiError = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to search books. Please try again.',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
