"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export function AcceptInviteOnLoad({ tripId }: { tripId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();

  useEffect(() => {
    const inviteToken = searchParams.get("inviteToken");
    if (inviteToken && user) {
      fetch("/api/trips/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteToken }),
      }).then(() => {
        // Optionally show a success message
        router.replace(`/trips/${tripId}`); // Remove inviteToken from URL
      });
    }
  }, [router, user, tripId, searchParams]);

  return null;
} 