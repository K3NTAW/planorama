import { UserProfile } from '@clerk/nextjs';

export default function ProfilePage() {
  return (
    <div className="flex justify-center items-start min-h-screen bg-background text-foreground">
      <div className="w-full max-w-2xl px-4 sm:px-6 md:px-8 py-8">
        <UserProfile />
      </div>
    </div>
  );
} 