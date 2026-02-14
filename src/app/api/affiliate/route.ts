import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateAffiliateLink } from '@/lib/affiliate/affiliate-manager';
import type { AffiliateProvider } from '@/lib/affiliate/affiliate-manager';

const VALID_PROVIDERS: AffiliateProvider[] = ['amazon', 'bookshop'];

function isValidIsbn(isbn: string): boolean {
  return /^(\d{9}[\dX]|\d{13})$/.test(isbn);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const isbn = searchParams.get('isbn');
  const provider = searchParams.get('provider') as AffiliateProvider | null;
  const bookId = searchParams.get('bookId');
  const source = searchParams.get('source');
  const variant = searchParams.get('variant');

  if (!isbn || !isValidIsbn(isbn)) {
    return NextResponse.json({ error: 'Valid ISBN required' }, { status: 400 });
  }

  if (!provider || !VALID_PROVIDERS.includes(provider)) {
    return NextResponse.json(
      { error: 'Valid provider required (amazon or bookshop)' },
      { status: 400 }
    );
  }

  // Track click for authenticated users
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (session?.user && bookId) {
      const countryCode =
        request.headers.get('x-vercel-ip-country') ||
        request.headers.get('cf-ipcountry') ||
        null;

      await prisma.affiliateClick.create({
        data: {
          userId: session.user.id,
          bookId,
          provider,
          ...(source && { source }),
          ...(variant && { variant }),
          ...(countryCode && { countryCode }),
        },
      });
    }
  } catch {
    // Don't block redirect if tracking fails
  }

  const affiliateUrl = generateAffiliateLink(isbn, provider);
  return NextResponse.redirect(affiliateUrl);
}
