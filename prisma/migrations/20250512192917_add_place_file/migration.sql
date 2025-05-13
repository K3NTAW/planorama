-- CreateTable
CREATE TABLE "PlaceFile" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaceFile_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PlaceFile" ADD CONSTRAINT "PlaceFile_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
