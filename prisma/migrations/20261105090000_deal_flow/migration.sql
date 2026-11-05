-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('pending', 'agreed', 'declined');

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "offerAmount" INTEGER,
ADD COLUMN     "offerDays" INTEGER,
ADD COLUMN     "offerDecidedAt" TIMESTAMP(3),
ADD COLUMN     "offerMessage" TEXT,
ADD COLUMN     "offerStatus" "OfferStatus",
ADD COLUMN     "offeredAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "durationDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "signedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Milestone" ADD COLUMN     "note" TEXT,
ADD COLUMN     "submittedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "method" TEXT,
ADD COLUMN     "receiptUrl" TEXT;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "targetId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ScopeAnalysis" ADD COLUMN     "assumptions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "confidence" TEXT,
ADD COLUMN     "missingInfo" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "ScopeItem" ADD COLUMN     "code" TEXT,
ADD COLUMN     "conditional" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "editedBy" TEXT,
ADD COLUMN     "quantity" DOUBLE PRECISION,
ADD COLUMN     "unit" TEXT;

-- CreateIndex
CREATE INDEX "Review_targetId_idx" ON "Review"("targetId");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

