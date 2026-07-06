-- CreateEnum
CREATE TYPE "BookSource" AS ENUM ('EPUB', 'OPEN_LIBRARY');

-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "coverUrl" TEXT,
ADD COLUMN     "openLibraryId" TEXT,
ADD COLUMN     "source" "BookSource" NOT NULL DEFAULT 'EPUB',
ALTER COLUMN "epubPath" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Book_openLibraryId_key" ON "Book"("openLibraryId");

