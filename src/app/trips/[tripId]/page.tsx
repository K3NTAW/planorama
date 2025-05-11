import { PrismaClient } from '@prisma/client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { notFound } from 'next/navigation';
import { TripAccommodations } from '@/components/ui/TripAccommodations';
import { TripPlaces } from '@/components/ui/TripPlaces';
import Image from 'next/image';
import { TripDeleteButtonWithConfirm } from '@/components/ui/TripDeleteButtonWithConfirm';
import { ShareTripButton } from '@/components/ui/ShareTripButton';
import { AcceptInviteDialog } from '@/components/ui/AcceptInviteDialog';

const prisma = new PrismaClient();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function TripDetailsPage(props: any) {
  const tripId = props.params.tripId;
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
  });

  if (!trip) return notFound();

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Accept invite dialog on page load */}
      <AcceptInviteDialog tripId={tripId} />
      {trip.bannerUrl && (
        <Image
          src={trip.bannerUrl}
          alt={trip.name}
          width={800}
          height={224}
          className="w-full h-56 object-cover rounded-md mb-6 border border-border"
        />
      )}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">{trip.name}</h1>
          <div className="text-lg text-gray-600 mb-1">Destination: {trip.destination}</div>
          <div className="text-gray-500 text-sm mb-2">
            {trip.startDate ? format(new Date(trip.startDate), 'yyyy-MM-dd') : ''}
            {trip.endDate ? ` - ${format(new Date(trip.endDate), 'yyyy-MM-dd')}` : ''}
          </div>
        </div>
        <TripDeleteButtonWithConfirm tripId={tripId} />
      </div>
      {/* Share section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Share this trip</h2>
        <ShareTripButton tripId={tripId} />
      </div>
      <Tabs defaultValue="itinerary" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
          <TabsTrigger value="places">Places</TabsTrigger>
          <TabsTrigger value="accommodation">Accommodation</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>
        <TabsContent value="itinerary">
          <div className="p-4 border rounded bg-white">Daily itinerary will go here.</div>
        </TabsContent>
        <TabsContent value="places">
          <TripPlaces tripId={tripId} />
        </TabsContent>
        <TabsContent value="accommodation">
          <TripAccommodations tripId={tripId} />
        </TabsContent>
        <TabsContent value="files">
          <div className="p-4 border rounded bg-white">Files and links will go here.</div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 