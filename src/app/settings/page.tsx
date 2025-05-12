"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function SettingsPage() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await user?.delete();
      // Optionally, sign out after deletion
      await signOut();
    } catch (e) {
      // handle error
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto px-2 sm:px-4 md:px-6 py-6 overflow-x-hidden">
      <Card className="w-full max-w-full">
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 w-full max-w-full">
          <Button variant="outline" className="w-full" onClick={() => signOut()}>
            Log out
          </Button>
          <div>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setConfirm(true)}
              disabled={deleting}
            >
              Delete Account
            </Button>
            {confirm && (
              <div className="mt-4 p-4 border rounded bg-muted text-muted-foreground w-full max-w-full">
                <p className="mb-2">Are you sure? This action cannot be undone.</p>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                    {deleting ? "Deleting..." : "Yes, delete my account"}
                  </Button>
                  <Button variant="outline" onClick={() => setConfirm(false)} disabled={deleting}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 