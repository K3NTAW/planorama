"use client";
import React, { useEffect } from "react";
import { ShareTripButton } from "@/components/ui/ShareTripButton";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Trash2, User as UserIcon, Loader } from 'lucide-react';
import { create, StateCreator } from 'zustand';

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

export function TripCollaborators({ tripId }: { tripId: string }) {
  const { collaboratorsByTrip, loadingByTrip, fetchCollaborators } = useTripCollaboratorsStore();
  const collaborators: Collaborator[] = collaboratorsByTrip[tripId] || [];
  const loading: boolean = loadingByTrip[tripId] ?? true;
  const { toast } = useToast();
  const [removingId, setRemovingId] = React.useState<string | null>(null);

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
    return (
      <Card>
        <CardHeader>
          <CardTitle>Collaborators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Invite Collaborators</CardTitle>
        </CardHeader>
        <CardContent>
          <ShareTripButton tripId={tripId} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Collaborators</CardTitle>
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
    </div>
  );
} 