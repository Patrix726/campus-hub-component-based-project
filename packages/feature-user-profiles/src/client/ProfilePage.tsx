"use client";

import { Card } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useProfile } from "./useProfile";

interface ProfilePageProps {
  user: { id: string; name: string; email: string };
}

export function ProfilePage({ user }: ProfilePageProps) {
  const { profile, loading, error } = useProfile(user?.id || "");

  if (!user) return <div>Please log in</div>;

  if (loading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-4 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </Card>
    );
  }

  if (error) return <div>Error: {error}</div>;

  return (
    <Card className="p-6">
      <h1 className="text-2xl font-bold mb-4">{user.name}'s Profile</h1>
      <p>
        <strong>Email:</strong> {user.email}
      </p>
      {profile?.bio && (
        <p>
          <strong>Bio:</strong> {profile.bio}
        </p>
      )}
      {profile?.major && (
        <p>
          <strong>Major:</strong> {profile.major}
        </p>
      )}
      {profile?.year && (
        <p>
          <strong>Year:</strong> {profile.year}
        </p>
      )}
      {profile?.avatar && (
        <img
          src={profile.avatar}
          alt="Avatar"
          className="w-16 h-16 rounded-full"
        />
      )}
    </Card>
  );
}
