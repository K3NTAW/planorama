import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';
import Ably from 'ably';

const prisma = new PrismaClient();
const ably = new Ably.Rest(process.env.ABLY_API_KEY!);

export async function DELETE(req: NextRequest, { params }: { params: { tripId: string } }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const tripId = params.tripId;
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip || trip.userId !== userId) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }
  await prisma.trip.delete({ where: { id: tripId } });
  // Publish to Ably for real-time updates
  await ably.channels.get('trips').publish('trip-deleted', { id: tripId });
  return new NextResponse(null, { status: 204 });
}

export async function PUT(req: NextRequest, { params }: { params: { tripId: string } }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const tripId = params.tripId;
  const { name, destination, startDate, endDate, bannerUrl } = await req.json();
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip || trip.userId !== userId) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }
  const updatedTrip = await prisma.trip.update({
    where: { id: tripId },
    data: {
      name,
      destination,
      startDate: startDate ? new Date(startDate) : trip.startDate,
      endDate: endDate ? new Date(endDate) : trip.endDate,
      bannerUrl,
    },
  });
  // Publish to Ably for real-time updates
  await ably.channels.get('trips').publish('trip-updated', updatedTrip);
  return NextResponse.json(updatedTrip);
} 