-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "series" TEXT,
ADD COLUMN     "seriesIndex" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "Book_series_idx" ON "Book"("series");
