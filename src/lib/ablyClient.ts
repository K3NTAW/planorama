let ablyInstance: any = null;

export async function getAblyClient() {
  if (ablyInstance) return ablyInstance;
  const Ably = (await import('ably')).default;
  ablyInstance = new Ably.Realtime({ authUrl: '/api/ably-token' });
  return ablyInstance;
} 