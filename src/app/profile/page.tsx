"use client";
export const dynamic = 'force-dynamic';
import { useUser } from '@clerk/nextjs';
import { useEffect } from 'react';
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useTheme } from "next-themes";
import { Sun, Moon, Laptop } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useClerk } from "@clerk/nextjs";
import { useProfileStore } from '@/store/useProfileStore';

const profileSchema = z.object({
  username: z.string().min(2, { message: 'Username must be at least 2 characters.' }),
  email: z.string().email(),
  bio: z.string().max(160, { message: 'Bio must be at most 160 characters.' }).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.imageUrl || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { loading, setLoading } = useProfileStore();

  const defaultValues: ProfileFormValues = {
    username: user?.username || user?.firstName || '',
    email: user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || '',
    bio: '',
  };

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues,
    mode: 'onChange',
  });

  useEffect(() => {
    form.reset(defaultValues);
    setAvatarUrl(user?.imageUrl || '');
    setLoading(!isLoaded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoaded, setLoading]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const themeOptions = [
    { value: "light", icon: <Sun size={18} />, label: "Light" },
    { value: "dark", icon: <Moon size={18} />, label: "Dark" },
    { value: "system", icon: <Laptop size={18} />, label: "System" },
  ];

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarUrl(URL.createObjectURL(file));
  }

  async function onSubmit(values: ProfileFormValues) {
    if (!user) return;
    setIsUpdating(true);
    try {
      if (avatarFile) {
        setIsUploading(true);
        await user.setProfileImage({ file: avatarFile });
        setIsUploading(false);
      }
      await user.update({
        username: values.username,
        unsafeMetadata: {
          bio: values.bio || '',
        },
      });
      setAvatarFile(null);
      setIsUpdating(false);
      window.location.reload();
    } catch (err) {
      setIsUploading(false);
      setIsUpdating(false);
      // Optionally show error toast
    }
  }

  if (loading) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="max-w-2xl w-full mx-auto px-4 sm:px-6 md:px-8 pt-8 pb-[env(safe-area-inset-bottom)] md:pb-6 overflow-x-hidden">
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-4 w-full max-w-full overflow-x-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <Card className="w-full max-w-full">
            <CardHeader className="px-4 sm:px-6 md:px-8">
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="w-full max-w-full px-4 sm:px-6 md:px-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full max-w-full">
                  {/* Avatar and upload */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full max-w-full">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={avatarUrl} alt={form.watch('username')} />
                      <AvatarFallback>{form.watch('username')?.[0]}</AvatarFallback>
                    </Avatar>
                    <label htmlFor="avatar-upload">
                      <Button asChild type="button" variant="outline" size="sm" disabled={isUploading}>
                        <span>{isUploading ? 'Uploading...' : 'Change avatar'}</span>
                      </Button>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                        disabled={isUploading}
                      />
                    </label>
                  </div>
                  {/* Username */}
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input {...field} className="w-full max-w-full" />
                        </FormControl>
                        <FormDescription>
                          This is your public display name. It can be your real name or a pseudonym.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* Email */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} disabled className="w-full max-w-full" />
                        </FormControl>
                        <FormDescription>
                          You can manage verified email addresses in your email settings.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* Bio */}
                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <textarea
                            {...field}
                            rows={3}
                            className="w-full max-w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground resize-y"
                          />
                        </FormControl>
                        <FormDescription>
                          You can @mention other users and organizations to link to them.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* Update button */}
                  <Button type="submit" disabled={isUpdating || isUploading}>{isUpdating ? 'Updating...' : 'Update profile'}</Button>
                </form>
                {/* Danger Zone */}
                <DangerZone />
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="appearance">
          <Card className="w-full max-w-full">
            <CardHeader className="px-4 sm:px-6 md:px-8">
              <CardTitle>Appearance</CardTitle>
            </CardHeader>
            <CardContent className="w-full max-w-full px-4 sm:px-6 md:px-8">
              <div className="flex gap-2 items-center flex-wrap">
                {mounted && themeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    aria-label={opt.label}
                    onClick={() => setTheme(opt.value)}
                    className={`p-2 rounded transition-colors border border-transparent hover:border-border ${theme === opt.value ? "bg-accent border-accent text-accent-foreground" : "text-muted-foreground"}`}
                    type="button"
                  >
                    {opt.icon}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DangerZone() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await user?.delete();
      await signOut();
    } catch (e) {
      setDeleting(false);
    }
  };

  return (
    <div className="mt-10 border border-destructive bg-destructive/10 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-destructive mb-4">Danger Zone</h3>
      <div className="space-y-4">
        <Button variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive/10" onClick={() => signOut()}>
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
            <div className="mt-4 p-4 border border-destructive rounded bg-destructive/10 text-destructive dark:bg-card dark:text-white dark:border-gray-700">
              <p className="mb-2">Are you sure? This action cannot be undone.</p>
              <div className="flex gap-2">
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
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="max-w-2xl w-full mx-auto px-4 sm:px-6 md:px-8 pt-8 pb-6 overflow-x-hidden">
      <div className="h-8 w-40 bg-muted rounded mb-4 animate-pulse" />
      <div className="h-16 w-16 bg-muted rounded-full mb-6 animate-pulse" />
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-10 bg-muted rounded animate-pulse" />
        ))}
      </div>
      <div className="h-10 w-32 bg-muted rounded mt-8 animate-pulse" />
    </div>
  );
} 