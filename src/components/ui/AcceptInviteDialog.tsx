"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export function AcceptInviteDialog({ tripId }: { tripId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const [showDialog, setShowDialog] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<"view" | "edit" | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = searchParams.get("inviteToken");
    if (token && user) {
      setInviteToken(token);
      fetch(`/api/trips/invite-info?inviteToken=${token}`)
        .then(res => res.json())
        .then(data => setPermission(data.permissionLevel || "view"));
      setShowDialog(true);
    }
  }, [searchParams, user]);

  const handleAccept = async () => {
    if (!inviteToken) return;
    setLoading(true);
    await fetch("/api/trips/accept-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteToken }),
    });
    setLoading(false);
    setShowDialog(false);
    router.replace(`/trips/${tripId}`);
  };

  const handleDecline = () => {
    setShowDialog(false);
    router.replace("/dashboard");
  };

  if (!showDialog) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded shadow-lg p-6 max-w-sm w-full">
        <h2 className="text-lg font-bold mb-2">Trip Invitation</h2>
        <p className="mb-4">
          You've been invited to join this trip as a <b>{permission || "collaborator"}</b>.<br />
          Would you like to accept?
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={handleDecline}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
            disabled={loading}
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? "Joining..." : "Accept"}
          </button>
        </div>
      </div>
    </div>
  );
} 