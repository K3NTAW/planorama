"use client";
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Check, Link2 } from 'lucide-react';
import React, { useState, ChangeEvent, MouseEvent } from 'react';

export function ShareTripButton({ tripId }: { tripId: string }) {
  const [inviteLink, setInviteLink] = useState("");
  const [permission, setPermission] = useState<"view" | "edit">("view");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

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

  const handleCopy = (e?: MouseEvent<HTMLButtonElement>) => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast({ title: 'Invite link copied!' });
      setTimeout(() => setCopied(false), 1200);
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex flex-col sm:flex-row gap-2 items-stretch w-full">
        <div className="flex-1 flex flex-col justify-end">
          <label htmlFor="permission" className="block text-xs font-medium mb-1 text-muted-foreground">Permission</label>
          <select
            id="permission"
            value={permission}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setPermission(e.target.value as "view" | "edit")}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
            style={{ minHeight: 40 }}
          >
            <option value="view">View</option>
            <option value="edit">Edit</option>
          </select>
        </div>
        <div className="flex items-end w-full sm:w-auto">
          <Button
            onClick={createInvite}
            className="w-full sm:w-auto h-10"
            disabled={loading}
            style={{ minHeight: 40 }}
          >
            {loading ? "Generating..." : "Generate Invite Link"}
          </Button>
        </div>
      </div>
      {inviteLink && (
        <div className="w-full flex flex-col gap-1">
          <label className="block text-xs font-medium mb-1 text-muted-foreground">Invite Link</label>
          <div className="flex items-center gap-2 rounded-lg bg-background border border-accent shadow-sm px-3 py-2 w-full overflow-x-auto">
            <Link2 size={18} className="text-accent shrink-0 mr-1" />
            <input
              value={inviteLink}
              readOnly
              className="flex-1 text-xs bg-transparent border-none focus:ring-0 px-0 truncate outline-none min-w-0"
              onClick={e => (e.target as HTMLInputElement).select()}
              style={{ cursor: 'pointer' }}
              aria-label="Invite link"
            />
            <Button
              size="sm"
              variant={copied ? "secondary" : "outline"}
              className="ml-2 px-2"
              onClick={handleCopy}
              type="button"
            >
              {copied ? <Check size={16} className="text-green-600" /> : <span className="text-xs">Copy</span>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 