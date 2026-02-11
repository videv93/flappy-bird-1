'use client';

import { useEffect, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Loader2, BookOpen, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { createCheckout } from '@/actions/billing';
import { getBookLimitInfo } from '@/actions/books';
import { PREMIUM_PRICE_AMOUNT } from '@/lib/config/constants';

const formattedPrice = `$${(PREMIUM_PRICE_AMOUNT / 100).toFixed(2)}`;

export default function UpgradePage() {
  const [isPending, startTransition] = useTransition();
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const searchParams = useSearchParams();

  const cancelled = searchParams.get('cancelled');

  useEffect(() => {
    if (cancelled === 'true') {
      toast.error(
        'Checkout not completed. You can try again whenever you\'re ready.',
      );
    }
  }, [cancelled]);

  useEffect(() => {
    getBookLimitInfo()
      .then((result) => {
        if (result.success) {
          setIsPremium(result.data.isPremium);
        } else {
          // Allow checkout attempt — the server action has its own premium guard
          setIsPremium(false);
        }
      })
      .catch(() => {
        setIsPremium(false);
      });
  }, []);

  const handleCheckout = () => {
    startTransition(async () => {
      const result = await createCheckout();
      if (result.success) {
        window.location.href = result.data.checkoutUrl;
      } else if (result.error === 'Already premium') {
        toast.error("You're already a premium member!");
        setIsPremium(true);
      } else {
        toast.error(result.error);
      }
    });
  };

  if (isPremium === null) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 px-8 py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (isPremium) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 px-8 py-16">
        <CheckCircle className="h-16 w-16 text-green-500" aria-hidden />
        <h1 className="text-2xl font-semibold text-foreground">
          You&apos;re Already Premium!
        </h1>
        <p className="max-w-sm text-center text-sm text-muted-foreground">
          You have unlimited book tracking. Enjoy your reading journey!
        </p>
        <Button asChild variant="outline">
          <Link href="/library">Back to Library</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 px-8 py-16">
      <Sparkles className="h-16 w-16 text-amber-500" aria-hidden />
      <h1 className="text-2xl font-semibold text-foreground">
        Upgrade to Premium
      </h1>
      <p className="max-w-sm text-center text-sm text-muted-foreground">
        You&apos;re a power reader! Unlock{' '}
        <strong>unlimited book tracking</strong> for a one-time payment of{' '}
        <strong>{formattedPrice}</strong>.
      </p>

      <div className="flex flex-col items-center gap-2 rounded-lg border bg-muted/50 p-4">
        <BookOpen className="h-6 w-6 text-amber-600" aria-hidden />
        <span className="text-sm font-medium">What you get</span>
        <ul className="text-sm text-muted-foreground">
          <li>Unlimited book tracking</li>
          <li>No more 3-book limit</li>
          <li>One-time payment, forever access</li>
        </ul>
      </div>

      <Button
        onClick={handleCheckout}
        disabled={isPending}
        className="min-h-[44px] min-w-[200px]"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating checkout...
          </>
        ) : (
          'Proceed to Payment'
        )}
      </Button>

      <Button asChild variant="ghost" className="min-h-[44px]">
        <Link href="/library">Back to Library</Link>
      </Button>
    </div>
  );
}
