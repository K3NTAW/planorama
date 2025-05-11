/*
  Warnings:

  - You are about to drop the column `isAdmin` on the `TripShare` table. All the data in the column will be lost.
  - You are about to drop the `TripInvitation` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "TripInvitation" DROP CONSTRAINT "TripInvitation_invitedById_fkey";

-- DropForeignKey
ALTER TABLE "TripInvitation" DROP CONSTRAINT "TripInvitation_tripId_fkey";

-- DropForeignKey
ALTER TABLE "TripInvitation" DROP CONSTRAINT "TripInvitation_userId_fkey";

-- AlterTable
ALTER TABLE "TripShare" DROP COLUMN "isAdmin";

-- DropTable
DROP TABLE "TripInvitation";

-- CreateTable
CREATE TABLE "TripInvite" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "inviteToken" TEXT NOT NULL,
    "permissionLevel" TEXT NOT NULL,
    "invitedEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "acceptedBy" TEXT,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "TripInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TripInvite_inviteToken_key" ON "TripInvite"("inviteToken");

-- AddForeignKey
ALTER TABLE "TripInvite" ADD CONSTRAINT "TripInvite_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
