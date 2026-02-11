'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  Loader2,
  CheckCircle,
  AlertCircle,
  Search,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getPaymentStatus } from '@/actions/billing';

type PageState = 'loading' | 'success' | 'processing' | 'slow' | 'error';

const MAX_POLL_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 3000;

export default function UpgradeSuccessPage() {
  const searchParams = useSearchParams();
  const checkoutId = searchParams.get('checkout_id');

  const [pageState, setPageState] = useState<PageState>('loading');
  const pollCountRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkStatus = useCallback(async () => {
    if (!checkoutId) {
      setPageState('error');
      return;
    }

    const result = await getPaymentStatus(checkoutId);

    if (!result.success) {
      setPageState('error');
      return;
    }

    if (result.data.isPremium) {
      setPageState('success');
      return;
    }

    // Payment still processing — poll if we haven't exceeded max attempts
    pollCountRef.current += 1;
    if (pollCountRef.current < MAX_POLL_ATTEMPTS) {
      setPageState('processing');
      pollTimerRef.current = setTimeout(checkStatus, POLL_INTERVAL_MS);
    } else {
      // Max attempts reached — show slow state with manual retry
      setPageState('slow');
    }
  }, [checkoutId]);

  useEffect(() => {
    checkStatus();

    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
    };
  }, [checkStatus]);

  if (!checkoutId) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 px-8 py-16">
        <AlertCircle className="h-16 w-16 text-red-500" aria-hidden />
        <h1 className="text-2xl font-semibold text-foreground">
          Missing Checkout Information
        </h1>
        <p className="max-w-sm text-center text-sm text-muted-foreground">
          We couldn&apos;t find your checkout details. Please try the upgrade
          process again.
        </p>
        <Button asChild className="min-h-[44px] min-w-[200px]">
          <Link href="/upgrade">Try Again</Link>
        </Button>
      </div>
    );
  }

  const handleRetry = () => {
    pollCountRef.current = 0;
    setPageState('loading');
    checkStatus();
  };

  if (pageState === 'slow') {
    return (
      <div className="flex flex-col items-center justify-center gap-6 px-8 py-16">
        <Loader2 className="h-16 w-16 text-amber-500" aria-hidden />
        <h1 className="text-2xl font-semibold text-foreground">
          Taking Longer Than Expected
        </h1>
        <p className="max-w-sm text-center text-sm text-muted-foreground">
          Your payment is being processed. This can sometimes take a minute.
          Please check back shortly.
        </p>
        <Button onClick={handleRetry} className="min-h-[44px] min-w-[200px]">
          Check Again
        </Button>
        <Button asChild variant="ghost" className="min-h-[44px]">
          <Link href="/library">Go to Library</Link>
        </Button>
      </div>
    );
  }

  if (pageState === 'loading' || pageState === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center gap-6 px-8 py-16">
        <Loader2 className="h-16 w-16 animate-spin text-amber-500" aria-hidden />
        <h1 className="text-2xl font-semibold text-foreground">
          Verifying Your Payment...
        </h1>
        <p className="max-w-sm text-center text-sm text-muted-foreground">
          We&apos;re confirming your premium upgrade. This usually takes just a
          moment.
        </p>
      </div>
    );
  }

  if (pageState === 'success') {
    return (
      <div className="flex flex-col items-center justify-center gap-6 px-8 py-16">
        <div className="relative">
          <CheckCircle className="h-16 w-16 text-green-500" aria-hidden />
          <Sparkles
            className="absolute -right-2 -top-2 h-6 w-6 text-amber-500"
            aria-hidden
          />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">
          Welcome to Premium!
        </h1>
        <p className="max-w-sm text-center text-sm text-muted-foreground">
          You now have <strong>unlimited book tracking</strong>. Start building
          your dream library!
        </p>

        <Button asChild className="min-h-[44px] min-w-[200px]">
          <Link href="/search">
            <Search className="mr-2 h-4 w-4" />
            Start Adding Books
          </Link>
        </Button>

        <Button asChild variant="ghost" className="min-h-[44px]">
          <Link href="/library">Go to Library</Link>
        </Button>
      </div>
    );
  }

  // Error state
  return (
    <div className="flex flex-col items-center justify-center gap-6 px-8 py-16">
      <AlertCircle className="h-16 w-16 text-red-500" aria-hidden />
      <h1 className="text-2xl font-semibold text-foreground">
        Something Went Wrong
      </h1>
      <p className="max-w-sm text-center text-sm text-muted-foreground">
        We couldn&apos;t verify your payment. Don&apos;t worry — if you were
        charged, your premium access will be activated shortly.
      </p>
      <Button asChild className="min-h-[44px] min-w-[200px]">
        <Link href="/upgrade">Try Again</Link>
      </Button>
      <Button asChild variant="ghost" className="min-h-[44px]">
        <Link href="/library">Back to Library</Link>
      </Button>
    </div>
  );
}
