import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body;
  try {
    body = await req.json();
  } catch (e) {
    console.error('Failed to parse JSON body:', e);
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.inviteToken) {
    console.error('Missing inviteToken in request body:', body);
    return NextResponse.json({ error: 'Missing inviteToken' }, { status: 400 });
  }
  let inviteToken = body.inviteToken;
  // Remove trailing '?' if present
  inviteToken = inviteToken.replace(/\?$/, "");
  console.log('Received inviteToken:', inviteToken);

  const invite = await prisma.tripInvite.findUnique({ where: { inviteToken } });
  if (!invite || invite.accepted) return NextResponse.json({ error: 'Invalid or already used invite' }, { status: 400 });

  // Add to collaborators
  await prisma.tripShare.create({
    data: {
      tripId: invite.tripId,
      userId,
      canEdit: invite.permissionLevel === 'edit',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  });

  // Mark invite as accepted
  await prisma.tripInvite.update({
    where: { id: invite.id },
    data: {
      accepted: true,
      acceptedBy: userId,
      acceptedAt: new Date(),
    }
  });

  return NextResponse.json({ success: true });
} 