-- AlterTable
ALTER TABLE "Accommodation" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "userId" TEXT;

-- AddForeignKey
ALTER TABLE "Accommodation" ADD CONSTRAINT "Accommodation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
