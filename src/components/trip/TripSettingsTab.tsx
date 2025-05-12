"use client";
import { useEffect, useState } from "react";
import { ShareTripButton } from "@/components/ui/ShareTripButton";
import { TripDeleteButtonWithConfirm } from "@/components/ui/TripDeleteButtonWithConfirm";

export function TripSettingsTab({ tripId }: { tripId: string }) {
  const [collaborators, setCollaborators] = useState<any[]>([]);
  useEffect(() => {
    fetch(`/api/trips/${tripId}/share`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setCollaborators(Array.isArray(data) ? data : []));
  }, [tripId]);
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