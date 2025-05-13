import { currentUser } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from 'next/link';
import { format } from 'date-fns';
import { CreateTripButton } from '@/components/ui/CreateTripButton';
import { revalidatePath } from 'next/cache';
import Image from 'next/image';
import { TripList } from '@/components/ui/TripList';

const prisma = new PrismaClient();

type Trip = {
  id: string;
  name: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  bannerUrl: string | null;
  userId: string;
};

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) {
    return <div className="p-8 text-center text-lg">You must be signed in to view your trips.</div>;
  }

  return (
    <TripList userId={user.id} />
  );
} 