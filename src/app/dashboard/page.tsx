import { currentUser } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from 'next/link';
import { format } from 'date-fns';
import { CreateTripButton } from '@/components/ui/CreateTripButton';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) {
    return <div className="p-8 text-center text-lg">You must be signed in to view your trips.</div>;
  }

  // Fetch trips for the logged-in user
  const trips = await prisma.trip.findMany({
    where: { userId: user.id },
    orderBy: { startDate: 'asc' }
  });

  // Function to refresh the dashboard after creating a trip
  async function handleTripCreated() {
    'use server';
    revalidatePath('/dashboard');
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Your Trips</h1>
      <CreateTripButton onTripCreated={handleTripCreated} />
      <div className="grid gap-4">
        {trips.length === 0 ? (
          <div className="text-gray-500">No trips found. Start by creating a new trip!</div>
        ) : (
          trips.map(trip => (
            <Card key={trip.id}>
              <CardHeader>
                <CardTitle>{trip.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-gray-600">Destination: {trip.destination}</div>
                    <div className="text-gray-500 text-sm">
                      {trip.startDate ? format(new Date(trip.startDate), 'yyyy-MM-dd') : ''}
                      {trip.endDate ? ` - ${format(new Date(trip.endDate), 'yyyy-MM-dd')}` : ''}
                    </div>
                  </div>
                  <Link href={`/trips/${trip.id}`} className="mt-2 md:mt-0 text-blue-600 hover:underline">View Details</Link>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
} 