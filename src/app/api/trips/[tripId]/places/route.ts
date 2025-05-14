import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';
import Ably from 'ably';

const prisma = new PrismaClient();
const ably = new Ably.Rest(process.env.ABLY_API_KEY!);

export async function GET(req: NextRequest, { params }: { params: { tripId: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const tripId = params.tripId;
  const places = await prisma.place.findMany({
    where: { tripId },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(places);
}

export async function POST(req: NextRequest, { params }: { params: { tripId: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const tripId = params.tripId;
  const { name, type, address, link, notes, date, latitude, longitude, websiteLink, googleMapsLink } = await req.json();
  if (!name || !type) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  const place = await prisma.place.create({
    data: {
      tripId,
      name,
      type,
      address,
      link,
      notes,
      date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(date + 'T00:00:00.000Z') : undefined,
      latitude,
      longitude,
      websiteLink,
      googleMapsLink,
    },
  });
  await ably.channels.get(`places:${tripId}`).publish('place-created', place);
  return NextResponse.json(place, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: { tripId: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const tripId = params.tripId;
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  // Ensure the place exists and belongs to the trip
  const place = await prisma.place.findUnique({ where: { id } });
  if (!place || place.tripId !== tripId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  await prisma.place.delete({ where: { id } });
  await ably.channels.get(`places:${tripId}`).publish('place-deleted', { id });
  return new NextResponse(null, { status: 204 });
}

export async function PUT(req: NextRequest, { params }: { params: { tripId: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const tripId = params.tripId;
  const { id, name, type, address, link, notes, date, latitude, longitude, websiteLink, googleMapsLink } = await req.json();
  if (!id || !name || !type) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  // Ensure the place exists and belongs to the trip
  const place = await prisma.place.findUnique({ where: { id } });
  if (!place || place.tripId !== tripId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const updated = await prisma.place.update({
    where: { id },
    data: {
      name,
      type,
      address,
      link,
      notes,
      date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(date + 'T00:00:00.000Z') : undefined,
      latitude,
      longitude,
      websiteLink,
      googleMapsLink,
    },
  });
  await ably.channels.get(`places:${tripId}`).publish('place-updated', updated);
  return NextResponse.json(updated);
} 