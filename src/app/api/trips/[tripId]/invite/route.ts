import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

export async function POST(req: NextRequest, { params }: { params: { tripId: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { tripId } = params;
  const { permissionLevel, email } = await req.json();

  // Check ownership
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip || trip.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // If email is provided, check if user is already a collaborator
  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const existingShare = await prisma.tripShare.findUnique({ where: { tripId_userId: { tripId, userId: user.id } } });
      if (existingShare) {
        return NextResponse.json({ error: 'already_collaborator' }, { status: 409 });
      }
    }
  }

  const inviteToken = randomUUID();
  await prisma.tripInvite.create({
    data: {
      tripId,
      inviteToken,
      permissionLevel,
      createdAt: new Date(),
      accepted: false,
    }
  });

  return NextResponse.json({
    invite_link: `${process.env.NEXT_PUBLIC_BASE_URL}/trips/${tripId}?inviteToken=${inviteToken}`
  });
} 