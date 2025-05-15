import { PrismaClient } from '@prisma/client';
import { notFound } from 'next/navigation';
import { AcceptInviteDialog } from '@/components/ui/AcceptInviteDialog';
import TripHeaderClient from '@/components/trip/TripHeaderClient';
import { TripTabs } from '@/components/trip/TripTabs';

const prisma = new PrismaClient();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function TripDetailsPage(props: any) {
  const tripId = props.params.tripId;
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
  });

  if (!trip) return notFound();

  // Convert dates to ISO strings for the client component
  const tripForClient = {
    ...trip,
    startDate: trip.startDate.toISOString(),
    endDate: trip.endDate.toISOString(),
  };

  // Fetch places and accommodations with lat/lng
  const places = await prisma.place.findMany({
    where: { tripId },
    select: { id: true, name: true, latitude: true, longitude: true, notes: true, type: true, files: { select: { url: true } } },
  });
  const accommodations = await prisma.accommodation.findMany({
    where: { tripId },
    select: { id: true, name: true, latitude: true, longitude: true, address: true },
  });

  // Fetch files count
  const tripFiles = await prisma.tripFile.findMany({
    where: { tripId },
    select: { id: true },
  });
  const placeFiles = await prisma.placeFile.findMany({
    where: { place: { tripId } },
    select: { id: true },
  });
  const initialFilesCount = tripFiles.length + placeFiles.length;

  return (
    <div className="max-w-3xl w-full mx-auto px-2 sm:px-4 md:px-6 py-6 overflow-x-hidden">
      <AcceptInviteDialog tripId={tripId} />
      <TripHeaderClient initialTrip={tripForClient} tripId={tripId} />
      <TripTabs 
        tripId={tripId} 
        initialPlacesCount={places.length} 
        initialAccommodationsCount={accommodations.length}
        initialFilesCount={initialFilesCount}
      />
      <div className="h-24" />
    </div>
  );
} 