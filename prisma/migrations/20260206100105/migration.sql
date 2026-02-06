-- CreateTable
CREATE TABLE "reading_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3) NOT NULL,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reading_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reading_sessions_user_id_idx" ON "reading_sessions"("user_id");

-- CreateIndex
CREATE INDEX "reading_sessions_book_id_idx" ON "reading_sessions"("book_id");

-- CreateIndex
CREATE INDEX "reading_sessions_user_id_book_id_idx" ON "reading_sessions"("user_id", "book_id");

-- AddForeignKey
ALTER TABLE "reading_sessions" ADD CONSTRAINT "reading_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_sessions" ADD CONSTRAINT "reading_sessions_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
