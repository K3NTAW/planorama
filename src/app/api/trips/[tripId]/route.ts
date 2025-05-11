import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';

const prisma = new PrismaClient();

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
  return new NextResponse(null, { status: 204 });
} 