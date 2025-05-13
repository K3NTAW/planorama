-- CreateTable
CREATE TABLE "TripFile" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripFile_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TripFile" ADD CONSTRAINT "TripFile_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
