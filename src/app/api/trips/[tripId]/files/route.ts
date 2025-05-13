import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getTripIdFromUrl(url: string): string | null {
  const pathParts = new URL(url, 'http://localhost').pathname.split('/');
  const tripsIndex = pathParts.indexOf('trips');
  if (tripsIndex !== -1 && pathParts.length > tripsIndex + 1) {
    return pathParts[tripsIndex + 1];
  }
  return null;
}

// GET /api/trips/[tripId]/files
export async function GET(req: NextRequest) {
  const tripId = getTripIdFromUrl(req.url);
  if (!tripId) {
    return NextResponse.json({ error: 'Missing tripId' }, { status: 400 });
  }
  const files = await prisma.tripFile.findMany({
    where: { tripId },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(files);
}

// POST /api/trips/[tripId]/files
// Body: { url: string, name: string }
export async function POST(req: NextRequest) {
  const tripId = getTripIdFromUrl(req.url);
  if (!tripId) {
    return NextResponse.json({ error: 'Missing tripId' }, { status: 400 });
  }
  const { url: fileUrl, name } = await req.json();
  if (!fileUrl || !name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  const file = await prisma.tripFile.create({
    data: { tripId, url: fileUrl, name },
  });
  return NextResponse.json(file);
}

// DELETE /api/trips/[tripId]/files
export async function DELETE(req: NextRequest) {
  const tripId = getTripIdFromUrl(req.url);
  if (!tripId) {
    return NextResponse.json({ error: 'Missing tripId' }, { status: 400 });
  }
  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: 'Missing file id' }, { status: 400 });
  }
  await prisma.tripFile.delete({
    where: { id },
  });
  return NextResponse.json({ success: true });
} 