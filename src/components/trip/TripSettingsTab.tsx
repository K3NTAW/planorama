"use client";
import React, { useEffect, useState } from "react";
import { ShareTripButton } from "@/components/ui/ShareTripButton";
import { TripDeleteButtonWithConfirm } from "@/components/ui/TripDeleteButtonWithConfirm";
import { create, StateCreator } from 'zustand';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Trash2, User as UserIcon } from 'lucide-react';

interface Collaborator {
  userId: string;
  user?: { firstName?: string; lastName?: string; email?: string; avatarUrl?: string };
  canEdit?: boolean;
}

interface TripCollaboratorsState {
  collaboratorsByTrip: Record<string, Collaborator[]>;
  loadingByTrip: Record<string, boolean>;
  fetchCollaborators: (tripId: string) => Promise<void>;
}

export const useTripCollaboratorsStore = create<TripCollaboratorsState>(((set: any, get: any) => ({
  collaboratorsByTrip: {},
  loadingByTrip: {},
  async fetchCollaborators(tripId: string) {
    set((state: TripCollaboratorsState) => ({ loadingByTrip: { ...state.loadingByTrip, [tripId]: true } }));
    const res = await fetch(`/api/trips/${tripId}/share`);
    const data = res.ok ? await res.json() : [];
    set((state: TripCollaboratorsState) => ({
      collaboratorsByTrip: { ...state.collaboratorsByTrip, [tripId]: Array.isArray(data) ? data : [] },
      loadingByTrip: { ...state.loadingByTrip, [tripId]: false },
    }));
  },
})) as StateCreator<TripCollaboratorsState>);

export function TripSettingsTab({ tripId }: { tripId: string }) {
  const { collaboratorsByTrip, loadingByTrip, fetchCollaborators } = useTripCollaboratorsStore();
  const collaborators: Collaborator[] = collaboratorsByTrip[tripId] || [];
  const loading: boolean = loadingByTrip[tripId] ?? true;
  const { toast } = useToast();
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!collaboratorsByTrip[tripId]) {
      fetchCollaborators(tripId);
    }
  }, [tripId, fetchCollaborators, collaboratorsByTrip]);

  const handleRemove = async (userId: string) => {
    if (!confirm('Remove this collaborator?')) return;
    setRemovingId(userId);
    const res = await fetch(`/api/trips/${tripId}/share`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: userId }),
    });
    setRemovingId(null);
    if (res.ok) {
      fetchCollaborators(tripId);
      toast({ title: 'Collaborator removed' });
    } else {
      toast({ title: 'Failed to remove', variant: 'destructive' });
    }
  };

  if (loading) {
    return <CollaboratorsSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg w-full mx-auto p-2 sm:p-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Invite Collaborators</CardTitle>
        </CardHeader>
        <CardContent>
          <ShareTripButton tripId={tripId} />
        </CardContent>
      </Card>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Collaborators</CardTitle>
        </CardHeader>
        <CardContent>
          {collaborators.length === 0 ? (
            <div className="text-gray-500 text-sm">No collaborators yet.</div>
          ) : (
            <ul className="flex flex-col gap-3">
              {collaborators.map((c: Collaborator) => (
                <li key={c.userId} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={c.user?.avatarUrl || ''} alt={c.user?.firstName || ''} />
                    <AvatarFallback>
                      {c.user?.firstName?.[0] || <UserIcon size={18} />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{c.user?.firstName || ''} {c.user?.lastName || ''}</div>
                    <div className="text-xs text-gray-500 truncate">{c.user?.email}</div>
                  </div>
                  {c.canEdit && (
                    <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-800 border border-green-300">Can Edit</span>
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="ml-2"
                    onClick={() => handleRemove(c.userId)}
                    disabled={removingId === c.userId}
                    aria-label="Remove collaborator"
                  >
                    <Trash2 size={16} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg text-red-700">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <TripDeleteButtonWithConfirm tripId={tripId} />
        </CardContent>
      </Card>
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