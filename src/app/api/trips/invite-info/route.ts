import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  let inviteToken = req.nextUrl.searchParams.get("inviteToken");
  if (!inviteToken) return NextResponse.json({ error: "Missing token" }, { status: 400 });
  // Remove trailing '?' if present
  inviteToken = inviteToken.replace(/\?$/, "");
  const invite = await prisma.tripInvite.findUnique({ where: { inviteToken } });
  if (!invite) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ permissionLevel: invite.permissionLevel });
} 