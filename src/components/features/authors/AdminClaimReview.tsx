'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Check, X, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { reviewClaim } from '@/actions/authors/reviewClaim';
import type { PendingClaimData } from '@/actions/authors/getPendingClaims';

interface AdminClaimReviewProps {
  claims: PendingClaimData[];
}

export function AdminClaimReview({ claims: initialClaims }: AdminClaimReviewProps) {
  const [claims, setClaims] = useState(initialClaims);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleReview = async (claimId: string, decision: 'approve' | 'reject') => {
    setLoadingId(claimId);
    setErrorId(null);
    setErrorMessage(null);
    const result = await reviewClaim({ claimId, decision });

    if (result.success) {
      setClaims((prev) => prev.filter((c) => c.id !== claimId));
    } else {
      setErrorId(claimId);
      setErrorMessage(result.error);
    }
    setLoadingId(null);
  };

  if (claims.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground" data-testid="no-pending-claims">
        <p className="text-lg">No pending claims to review</p>
        <p className="text-sm mt-1">All author claims have been processed.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="admin-claim-list">
      <p className="text-sm text-muted-foreground">
        {claims.length} pending claim{claims.length !== 1 ? 's' : ''}
      </p>

      {claims.map((claim) => (
        <Card key={claim.id} data-testid={`claim-card-${claim.id}`}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                {claim.user.image && (
                  <AvatarImage src={claim.user.image} alt={claim.user.name || ''} />
                )}
                <AvatarFallback>
                  {(claim.user.name || claim.user.email)[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-base">
                  {claim.user.name || claim.user.email}
                </CardTitle>
                <CardDescription>{claim.user.email}</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="flex gap-3 mb-3">
              {claim.book.coverUrl && (
                <Image
                  src={claim.book.coverUrl}
                  alt={claim.book.title}
                  width={48}
                  height={64}
                  className="rounded object-cover"
                />
              )}
              <div>
                <p className="font-medium">{claim.book.title}</p>
                <p className="text-sm text-muted-foreground">by {claim.book.author}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Method:</span>{' '}
                {claim.verificationMethod}
              </p>
              {claim.verificationUrl && (
                <p className="flex items-center gap-1">
                  <span className="font-medium">URL:</span>{' '}
                  <a
                    href={claim.verificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-2 inline-flex items-center gap-1"
                  >
                    {claim.verificationUrl}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              )}
              {claim.verificationText && (
                <div>
                  <span className="font-medium">Explanation:</span>
                  <p className="mt-1 p-2 bg-muted rounded text-muted-foreground">
                    {claim.verificationText}
                  </p>
                </div>
              )}
              <p className="text-muted-foreground">
                Submitted: {new Date(claim.createdAt).toLocaleDateString()}
              </p>
            </div>
          </CardContent>

          {errorId === claim.id && errorMessage && (
            <div className="px-6 pb-2">
              <p className="text-sm text-destructive" role="alert" data-testid={`error-${claim.id}`}>
                {errorMessage}
              </p>
            </div>
          )}

          <CardFooter className="gap-2">
            <Button
              onClick={() => handleReview(claim.id, 'approve')}
              disabled={loadingId === claim.id}
              className="flex-1 min-h-[44px]"
              data-testid={`approve-${claim.id}`}
            >
              {loadingId === claim.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="mr-1 h-4 w-4" />
                  Approve
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleReview(claim.id, 'reject')}
              disabled={loadingId === claim.id}
              className="flex-1 min-h-[44px]"
              data-testid={`reject-${claim.id}`}
            >
              {loadingId === claim.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <X className="mr-1 h-4 w-4" />
                  Reject
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
