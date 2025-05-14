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

const prisma = new PrismaClient();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function TripDetailsPage(props: any) {
  const tripId = props.params.tripId;
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
  });

  if (!trip) return notFound();

  return (
    <Card className="w-full max-w-3xl mx-auto p-0 bg-background border-0 shadow-none rounded-none min-h-[100dvh]">
      {/* Accept invite dialog on page load */}
      <AcceptInviteDialog tripId={tripId} />
      {/* MOBILE-FIRST: Banner image */}
      {trip.bannerUrl && (
        <Image
          src={trip.bannerUrl}
          alt={trip.name}
          width={800}
          height={224}
          className="w-full h-44 sm:h-56 object-cover rounded-xl shadow-md mb-4 border border-border"
          priority
        />
      )}
      {/* MOBILE-FIRST: Trip info, center-aligned */}
      <div className="flex flex-col items-center text-center px-4 pt-2 pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 text-foreground">{trip.name}</h1>
        <div className="text-base sm:text-lg text-muted-foreground mb-1">Destination: {trip.destination}</div>
        <div className="text-sm text-muted-foreground mb-2">
          {trip.startDate ? format(new Date(trip.startDate), 'yyyy-MM-dd') : ''}
          {trip.endDate ? ` - ${format(new Date(trip.endDate), 'yyyy-MM-dd')}` : ''}
        </div>
        {/* MOBILE-FIRST: Action buttons row */}
        <div className="flex flex-row gap-2 justify-center mt-2 mb-1 w-full">
          <ShareTripButton tripId={tripId} />
          <TripDeleteButtonWithConfirm tripId={tripId} />
        </div>
      </div>
      {/* MOBILE-FIRST: Sticky, scrollable tabs */}
      <Tabs defaultValue="places" className="w-full max-w-full px-0">
        <TabsList className="sticky top-0 z-30 w-full max-w-full overflow-x-auto bg-background/95 backdrop-blur border-b border-border flex gap-2 px-2 py-2">
          <TabsTrigger value="places" className="min-w-[90px] h-10 text-base">Places</TabsTrigger>
          <TabsTrigger value="accommodation" className="min-w-[140px] h-10 text-base">Accommodation</TabsTrigger>
          <TabsTrigger value="files" className="min-w-[80px] h-10 text-base">Files</TabsTrigger>
          <TabsTrigger value="settings" className="min-w-[100px] h-10 text-base">Settings</TabsTrigger>
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
        <TabsContent value="settings">
          <TripSettingsTab tripId={tripId} />
        </TabsContent>
      </Tabs>
      {/* MOBILE-FIRST: Extra bottom padding for nav bar */}
      <div className="h-24" />
    </Card>
  );
} 