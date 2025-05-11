"use client";
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

const profileSchema = z.object({
  username: z.string().min(2, { message: 'Username must be at least 2 characters.' }),
  email: z.string().email(),
  bio: z.string().max(160, { message: 'Bio must be at most 160 characters.' }).optional(),
  urls: z.array(z.string().url().optional()).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user } = useUser();
  const [avatarUrl, setAvatarUrl] = useState(user?.imageUrl || '');

  const defaultValues: ProfileFormValues = {
    username: user?.username || user?.firstName || '',
    email: user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || '',
    bio: '',
    urls: [''],
  };

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues,
    mode: 'onChange',
  });

  // Keep form in sync with user data
  useEffect(() => {
    form.reset(defaultValues);
    setAvatarUrl(user?.imageUrl || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function onSubmit() {
    // TODO: handle update
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Avatar and upload */}
              <div className="flex items-center gap-6">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={avatarUrl} alt={form.watch('username')} />
                  <AvatarFallback>{form.watch('username')?.[0]}</AvatarFallback>
                </Avatar>
                <Button type="button" variant="outline" size="sm">Change avatar</Button>
              </div>
              {/* Username */}
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Input {...field} disabled />
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
                        className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                      />
                    </FormControl>
                    <FormDescription>
                      You can @mention other users and organizations to link to them.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* URLs */}
              <FormField
                control={form.control}
                name="urls"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URLs</FormLabel>
                    <FormDescription>
                      Add links to your website, blog, or social media profiles.
                    </FormDescription>
                    <div className="space-y-2">
                      {(field.value || ['']).map((url, i) => (
                        <Input
                          key={i}
                          value={url}
                          onChange={e => {
                            const newUrls = [...(field.value || [])];
                            newUrls[i] = e.target.value;
                            field.onChange(newUrls);
                          }}
                          placeholder="https://yourwebsite.com"
                          type="url"
                        />
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="px-0"
                      onClick={() => field.onChange([...(field.value || []), ''])}
                    >
                      Add URL
                    </Button>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Update button */}
              <Button type="submit">Update profile</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 