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
import { TripSettingsTab } from '@/components/trip/TripSettingsTab';
import { TripFilesTab } from '@/components/trip/TripFilesTab';
import { Card } from '@/components/ui/card';
import { TripMap } from '@/components/trip/TripMap';

const prisma = new PrismaClient();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function TripDetailsPage(props: any) {
  const tripId = props.params.tripId;
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
  });

  if (!trip) return notFound();

  // Fetch places and accommodations with lat/lng
  const places = await prisma.place.findMany({
    where: { tripId },
    select: { id: true, name: true, latitude: true, longitude: true, notes: true, type: true, files: { select: { url: true } } },
  });
  const accommodations = await prisma.accommodation.findMany({
    where: { tripId },
    select: { id: true, name: true, latitude: true, longitude: true, address: true },
  });

  // Prepare locations for TripMap
  const mapLocations = [
    ...places.filter((p: any) => p.latitude && p.longitude).map((p: any) => ({
      id: p.id,
      name: p.name,
      latitude: p.latitude!,
      longitude: p.longitude!,
      notes: p.notes,
      imageUrl: p.files?.[0]?.url,
      type: p.type || 'place',
    })),
    ...accommodations.filter((a: any) => a.latitude && a.longitude).map((a: any) => ({
      id: a.id,
      name: a.name,
      latitude: a.latitude!,
      longitude: a.longitude!,
      notes: a.address,
      type: 'accommodation',
    })),
  ];

  return (
    <div className="max-w-3xl w-full mx-auto px-2 sm:px-4 md:px-6 py-6 overflow-x-hidden">
      {/* Accept invite dialog on page load */}
      <AcceptInviteDialog tripId={tripId} />
      {/* Banner image */}
      {trip.bannerUrl && (
        <Image
          src={trip.bannerUrl}
          alt={trip.name}
          width={800}
          height={224}
          className="w-full max-w-full h-56 object-cover rounded-md mb-6 border border-border"
          priority
        />
      )}
      <div className="mb-6 flex flex-col sm:flex-row items-center justify-between w-full max-w-full gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">{trip.name}</h1>
          <div className="text-lg text-gray-600 mb-1">Destination: {trip.destination}</div>
          <div className="text-gray-500 text-sm mb-2">
            {trip.startDate ? format(new Date(trip.startDate), 'yyyy-MM-dd') : ''}
            {trip.endDate ? ` - ${format(new Date(trip.endDate), 'yyyy-MM-dd')}` : ''}
          </div>
        </div>
      </div>
      <Tabs defaultValue="places" className="w-full max-w-full">
        <TabsList className="mb-4 w-full max-w-full overflow-x-auto">
          <TabsTrigger value="places">Places</TabsTrigger>
          <TabsTrigger value="accommodation">Accommodation</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="map">Map</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="places">
          <div className="w-full max-w-full"><TripPlaces tripId={tripId} /></div>
        </TabsContent>
        <TabsContent value="accommodation">
          <div className="w-full max-w-full"><TripAccommodations tripId={tripId} /></div>
        </TabsContent>
        <TabsContent value="files">
          <TripFilesTab tripId={tripId} />
        </TabsContent>
        <TabsContent value="map">
          <Card className="w-full max-w-full p-2 md:p-4">
            <TripMap locations={mapLocations} />
          </Card>
        </TabsContent>
        <TabsContent value="settings">
          <TripSettingsTab tripId={tripId} />
        </TabsContent>
      </Tabs>
      {/* Extra bottom padding for nav bar */}
      <div className="h-24" />
    </div>
  );
} 