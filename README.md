# Planorama

A collaborative trip planner. Build a trip, lay out day-by-day itineraries, pin places
and accommodations on a map, upload photos, and share the whole plan with friends who can
join and edit together. Installable as a mobile app (PWA).

🔗 **Live:** https://planorama-nine.vercel.app

## What it does

- **Trips and itineraries.** Organize a trip into daily itineraries with activities,
  accommodations, and places.
- **Maps.** Places and stays are geocoded and shown on an interactive Mapbox map.
- **Collaboration.** Share a trip and invite others. Invitees join as collaborators with
  their own access, backed by trip-share and invitation models.
- **Realtime.** Live updates across collaborators using Ably, so changes show up without
  a refresh.
- **Media.** Photo uploads handled through Cloudinary with signed uploads.
- **Installable PWA.** Works as an installable app on mobile with offline-friendly assets,
  a mobile nav, and swipe gestures.

## Tech

Next.js (App Router) · TypeScript · Prisma + Postgres · Clerk / NextAuth (auth) ·
Mapbox GL · Ably (realtime) · Cloudinary (media) · React Query · Zustand · React Hook Form
+ Zod · Framer Motion · next-pwa · Tailwind · shadcn/ui

## Data model (Prisma)

`User` · `Trip` · `Itinerary` · `Activity` · `Accommodation` · `Place` · `Media` ·
`SharedList` · `ListItem` · `TripShare` · `TripInvite` · `PlaceFile` · `TripFile`

A real relational schema with sharing and invitations, managed through Prisma migrations.

## Run it

```bash
npm install
# set env: DATABASE_URL, Clerk keys, Mapbox token, Cloudinary creds, Ably key
npx prisma migrate dev
npm run dev
```

## Why I built it

Planning trips with friends across scattered chats and docs is painful. Planorama puts the
itinerary, the map, and the people in one shared, real-time place.
