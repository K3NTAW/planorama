import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/trips/[tripId]/places/files?placeId=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const placeId = searchParams.get('placeId');
  if (!placeId) {
    return NextResponse.json({ error: 'Missing placeId' }, { status: 400 });
  }
  const files = await prisma.placeFile.findMany({
    where: { placeId },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(files);
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
  return NextResponse.json(file);
}

// DELETE /api/trips/[tripId]/places/files
// Body: { id: string }
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: 'Missing file id' }, { status: 400 });
  }
  await prisma.placeFile.delete({
    where: { id },
  });
  return NextResponse.json({ success: true });
} 