"use client";
import { useEffect, useState } from "react";
import { ShareTripButton } from "@/components/ui/ShareTripButton";
import { TripDeleteButtonWithConfirm } from "@/components/ui/TripDeleteButtonWithConfirm";
import { create } from 'zustand';

interface Collaborator {
  userId: string;
  user?: { firstName?: string; lastName?: string; email?: string };
  canEdit?: boolean;
}

interface TripCollaboratorsState {
  collaboratorsByTrip: Record<string, Collaborator[]>;
  loadingByTrip: Record<string, boolean>;
  fetchCollaborators: (tripId: string) => Promise<void>;
}

export const useTripCollaboratorsStore = create<TripCollaboratorsState>((set, get) => ({
  collaboratorsByTrip: {},
  loadingByTrip: {},
  async fetchCollaborators(tripId) {
    set(state => ({ loadingByTrip: { ...state.loadingByTrip, [tripId]: true } }));
    const res = await fetch(`/api/trips/${tripId}/share`);
    const data = res.ok ? await res.json() : [];
    set(state => ({
      collaboratorsByTrip: { ...state.collaboratorsByTrip, [tripId]: Array.isArray(data) ? data : [] },
      loadingByTrip: { ...state.loadingByTrip, [tripId]: false },
    }));
  },
}));

export function TripSettingsTab({ tripId }: { tripId: string }) {
  const { collaboratorsByTrip, loadingByTrip, fetchCollaborators } = useTripCollaboratorsStore();
  const collaborators = collaboratorsByTrip[tripId] || [];
  const loading = loadingByTrip[tripId] ?? true;
  useEffect(() => {
    if (!collaboratorsByTrip[tripId]) {
      fetchCollaborators(tripId);
    }
  }, [tripId, fetchCollaborators, collaboratorsByTrip]);
  if (loading) {
    return <CollaboratorsSkeleton />;
  }
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-2">Invite Collaborators</h3>
        <ShareTripButton tripId={tripId} />
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">Collaborators</h3>
        {collaborators.length === 0 ? (
          <div className="text-gray-500">No collaborators yet.</div>
        ) : (
          <ul className="space-y-2">
            {collaborators.map((c) => (
              <li key={c.userId} className="flex items-center gap-2 border rounded px-3 py-2 bg-gray-50">
                <span className="font-medium">{c.user?.firstName || ''} {c.user?.lastName || ''}</span>
                <span className="text-xs text-gray-500">{c.user?.email}</span>
                {c.canEdit && <span className="ml-2 px-2 py-0.5 text-xs rounded bg-green-100 text-green-800 border border-green-300">Can Edit</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-2 text-red-700">Danger Zone</h3>
        <TripDeleteButtonWithConfirm tripId={tripId} />
      </div>
    </div>
  );
}

function CollaboratorsSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <div className="h-8 w-40 bg-muted rounded mb-2 animate-pulse" />
        <div className="h-10 w-32 bg-muted rounded animate-pulse" />
      </div>
      <div>
        <div className="h-8 w-40 bg-muted rounded mb-2 animate-pulse" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
      <div className="mt-8">
        <div className="h-8 w-40 bg-muted rounded mb-2 animate-pulse" />
        <div className="h-10 w-32 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
} 