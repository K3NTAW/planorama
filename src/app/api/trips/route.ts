import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';
import clerkClient from '@clerk/clerk-sdk-node';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { name, destination, startDate, endDate, bannerUrl } = await req.json();
  if (!name || !destination || !startDate || !endDate) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  // Ensure a User record exists for this Clerk userId
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    // Fetch Clerk user data
    const clerkUser = await clerkClient.users.getUser(userId);
    await prisma.user.create({
      data: {
        id: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
      },
    });
  }

  const trip = await prisma.trip.create({
    data: {
      name,
      destination,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      userId,
      bannerUrl,
    },
  });
  return NextResponse.json(trip, { status: 201 });
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const trips = await prisma.trip.findMany({
    where: { userId },
    orderBy: { startDate: 'asc' },
  });
  return NextResponse.json(trips);
} 