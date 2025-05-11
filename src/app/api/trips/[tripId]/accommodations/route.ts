import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';

const prisma = new PrismaClient();

export async function GET(req: NextRequest, { params }: { params: { tripId: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const tripId = params.tripId;
  const accommodations = await prisma.accommodation.findMany({
    where: { tripId },
    orderBy: { checkIn: 'asc' },
  });
  return NextResponse.json(accommodations);
}

export async function POST(req: NextRequest, { params }: { params: { tripId: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const tripId = params.tripId;
  const { name, address, checkIn, checkOut, link } = await req.json();
  if (!name || !address || !checkIn || !checkOut) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  const accommodation = await prisma.accommodation.create({
    data: {
      tripId,
      name,
      address,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      link,
    },
  });
  return NextResponse.json(accommodation, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: { tripId: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const tripId = params.tripId;
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  // Ensure the accommodation exists and belongs to the trip
  const accommodation = await prisma.accommodation.findUnique({ where: { id } });
  if (!accommodation || accommodation.tripId !== tripId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  await prisma.accommodation.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}

export async function PUT(req: NextRequest, { params }: { params: { tripId: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const tripId = params.tripId;
  const { id, name, address, checkIn, checkOut, link } = await req.json();
  if (!id || !name || !address || !checkIn || !checkOut) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  // Ensure the accommodation exists and belongs to the trip
  const accommodation = await prisma.accommodation.findUnique({ where: { id } });
  if (!accommodation || accommodation.tripId !== tripId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const updated = await prisma.accommodation.update({
    where: { id },
    data: { name, address, checkIn: new Date(checkIn), checkOut: new Date(checkOut), link },
  });
  return NextResponse.json(updated);
} 