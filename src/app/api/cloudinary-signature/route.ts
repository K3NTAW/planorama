import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const { folder = '', public_id = '' } = await req.json();
  const timestamp = Math.floor(Date.now() / 1000);
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Cloudinary env vars missing' }, { status: 500 });
  }
  const paramsToSign: Record<string, string | number> = {
    timestamp,
    folder,
  };
  if (public_id) paramsToSign.public_id = public_id;
  const signature = crypto
    .createHash('sha1')
    .update(
      Object.keys(paramsToSign)
        .sort()
        .map((key) => `${key}=${paramsToSign[key]}`)
        .join('&') + apiSecret
    )
    .digest('hex');
  return NextResponse.json({
    cloudName,
    apiKey,
    timestamp,
    folder,
    signature,
  });
} 