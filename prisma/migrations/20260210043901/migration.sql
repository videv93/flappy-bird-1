-- CreateEnum
CREATE TYPE "RejectionReason" AS ENUM ('INSUFFICIENT_EVIDENCE', 'NOT_THE_AUTHOR', 'DUPLICATE_CLAIM', 'OTHER');

-- DropIndex
DROP INDEX "author_claims_user_id_book_id_key";

-- AlterTable
ALTER TABLE "author_claims" ADD COLUMN     "admin_notes" TEXT,
ADD COLUMN     "rejection_reason" "RejectionReason";

-- CreateIndex
CREATE INDEX "author_claims_user_id_book_id_idx" ON "author_claims"("user_id", "book_id");
