import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import Ably from 'ably';

const prisma = new PrismaClient();
const ably = new Ably.Rest(process.env.ABLY_API_KEY!);

// GET /api/trips/[tripId]/places/files?placeId=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const placeId = searchParams.get('placeId');
  const tripId = req.url.split('/trips/')[1]?.split('/')[0];

  if (!tripId) {
    return NextResponse.json({ error: 'Missing tripId' }, { status: 400 });
  }

  if (placeId) {
    // Get files for a specific place
    const files = await prisma.placeFile.findMany({
      where: { placeId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(files);
  } else {
    // Get all place files for the trip
    const files = await prisma.placeFile.findMany({
      where: { place: { tripId } },
      include: { place: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(files);
  }
}

// POST /api/trips/[tripId]/places/files
// Body: { placeId: string, url: string, name: string }
export async function POST(req: NextRequest) {
  const data = await req.json();
  const { placeId, url, name } = data;
  if (!placeId || !url || !name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  const file = await prisma.placeFile.create({
    data: { placeId, url, name },
  });
  await ably.channels.get(`place-files:${placeId}`).publish('place-file-created', file);
  return NextResponse.json(file);
}

// DELETE /api/trips/[tripId]/places/files
// Body: { id: string }
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: 'Missing file id' }, { status: 400 });
  }
  // Fetch the file to get placeId before deleting
  const file = await prisma.placeFile.findUnique({ where: { id } });
  if (!file) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
  await prisma.placeFile.delete({
    where: { id },
  });
  await ably.channels.get(`place-files:${file.placeId}`).publish('place-file-deleted', { id });
  return NextResponse.json({ success: true });
} 