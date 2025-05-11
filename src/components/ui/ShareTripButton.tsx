"use client";
import { useState } from "react";

export function ShareTripButton({ tripId }: { tripId: string }) {
  const [inviteLink, setInviteLink] = useState("");
  const [permission, setPermission] = useState<"view" | "edit">("view");
  const [loading, setLoading] = useState(false);

  const createInvite = async () => {
    setLoading(true);
    setInviteLink("");
    const res = await fetch(`/api/trips/${tripId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissionLevel: permission }),
    });
    const data = await res.json();
    setInviteLink(data.invite_link);
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <div>
        <label className="mr-2">Permission:</label>
        <select
          value={permission}
          onChange={e => setPermission(e.target.value as "view" | "edit")}
          className="border rounded px-2 py-1"
        >
          <option value="view">View</option>
          <option value="edit">Edit</option>
        </select>
        <button
          onClick={createInvite}
          className="ml-4 px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? "Generating..." : "Generate Share Link"}
        </button>
      </div>
      {inviteLink && (
        <div className="flex items-center gap-2">
          <input value={inviteLink} readOnly className="border rounded px-2 py-1 flex-1" />
          <button
            onClick={() => navigator.clipboard.writeText(inviteLink)}
            className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
          >
            Copy
          </button>
        </div>
      )}
    </div>
  );
} 