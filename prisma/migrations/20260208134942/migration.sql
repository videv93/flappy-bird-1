-- AlterTable
ALTER TABLE "users" ADD COLUMN     "last_activity_viewed_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "room_presences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),
    "is_author" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "room_presences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "room_presences_user_id_idx" ON "room_presences"("user_id");

-- CreateIndex
CREATE INDEX "room_presences_book_id_idx" ON "room_presences"("book_id");

-- CreateIndex
CREATE INDEX "room_presences_book_id_left_at_idx" ON "room_presences"("book_id", "left_at");

-- CreateIndex
CREATE UNIQUE INDEX "room_presences_user_id_book_id_left_at_key" ON "room_presences"("user_id", "book_id", "left_at");

-- AddForeignKey
ALTER TABLE "room_presences" ADD CONSTRAINT "room_presences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_presences" ADD CONSTRAINT "room_presences_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
