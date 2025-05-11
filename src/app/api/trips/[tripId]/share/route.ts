import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';
import clerkClient from '@clerk/clerk-sdk-node';

const prisma = new PrismaClient();

// Invite a user to share a trip
export async function POST(req: NextRequest, { params }: { params: { tripId: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const tripId = params.tripId;
  const { email, canEdit } = await req.json();
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

  // Only owner can invite
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip || trip.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Find or create user by email
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Try to find Clerk user
    const clerkUsers = await clerkClient.users.getUserList({ emailAddress: [email] });
    if (clerkUsers.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const clerkUser = clerkUsers[0];
    user = await prisma.user.create({
      data: {
        id: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
      },
    });
  }

  // Create or update TripShare
  await prisma.tripShare.upsert({
    where: { tripId_userId: { tripId, userId: user.id } },
    update: { canEdit: !!canEdit },
    create: { tripId, userId: user.id, canEdit: !!canEdit },
  });
  return NextResponse.json({ success: true });
}

// List all shared users
export async function GET(req: NextRequest, { params }: { params: { tripId: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const tripId = params.tripId;
  // Only owner can list
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip || trip.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const shares = await prisma.tripShare.findMany({
    where: { tripId },
    include: { user: true },
  });
  return NextResponse.json(shares);
}

// Update a shared user's permission
export async function PATCH(req: NextRequest, { params }: { params: { tripId: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const tripId = params.tripId;
  const { targetUserId, canEdit } = await req.json();
  if (!targetUserId) return NextResponse.json({ error: 'targetUserId required' }, { status: 400 });
  // Only owner can update
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip || trip.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await prisma.tripShare.update({
    where: { tripId_userId: { tripId, userId: targetUserId } },
    data: { canEdit: !!canEdit },
  });
  return NextResponse.json({ success: true });
}

// Remove a user from the shared list
export async function DELETE(req: NextRequest, { params }: { params: { tripId: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const tripId = params.tripId;
  const { targetUserId } = await req.json();
  if (!targetUserId) return NextResponse.json({ error: 'targetUserId required' }, { status: 400 });
  // Only owner can remove
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip || trip.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await prisma.tripShare.delete({
    where: { tripId_userId: { tripId, userId: targetUserId } },
  });
  return NextResponse.json({ success: true });
} 