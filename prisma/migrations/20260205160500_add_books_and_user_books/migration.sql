-- CreateEnum
CREATE TYPE "ReadingStatus" AS ENUM ('CURRENTLY_READING', 'FINISHED', 'WANT_TO_READ');

-- CreateTable
CREATE TABLE "books" (
    "id" TEXT NOT NULL,
    "isbn_10" TEXT,
    "isbn_13" TEXT,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "cover_url" TEXT,
    "page_count" INTEGER,
    "published_year" INTEGER,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_books" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "status" "ReadingStatus" NOT NULL DEFAULT 'WANT_TO_READ',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "date_added" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_finished" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_books_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "books_isbn_10_key" ON "books"("isbn_10");

-- CreateIndex
CREATE UNIQUE INDEX "books_isbn_13_key" ON "books"("isbn_13");

-- CreateIndex
CREATE INDEX "books_isbn_10_idx" ON "books"("isbn_10");

-- CreateIndex
CREATE INDEX "books_isbn_13_idx" ON "books"("isbn_13");

-- CreateIndex
CREATE INDEX "user_books_user_id_idx" ON "user_books"("user_id");

-- CreateIndex
CREATE INDEX "user_books_book_id_idx" ON "user_books"("book_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_books_user_id_book_id_key" ON "user_books"("user_id", "book_id");

-- AddForeignKey
ALTER TABLE "user_books" ADD CONSTRAINT "user_books_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_books" ADD CONSTRAINT "user_books_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
