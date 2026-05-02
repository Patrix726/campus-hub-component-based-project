"use client";

import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { useState } from "react";
import { useProfile } from "./useProfile";

interface ProfileFormProps {
  user: { id: string | null };
}
export function EditProfileForm({ user }: ProfileFormProps) {
  const { profile, updateProfile, loading } = useProfile(user?.id || "");

  const [bio, setBio] = useState(profile?.bio || "");
  const [major, setMajor] = useState(profile?.major || "");
  const [year, setYear] = useState(profile?.year || "");
  const [avatar, setAvatar] = useState(profile?.avatar || "");

  const handleSubmit: React.SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    await updateProfile({ bio, major, year, avatar });
  };

  if (!user) return <div>Please log in</div>;

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4">Edit Profile</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="bio">Bio</Label>
          <Input
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself"
          />
        </div>
        <div>
          <Label htmlFor="major">Major</Label>
          <Input
            id="major"
            value={major}
            onChange={(e) => setMajor(e.target.value)}
            placeholder="Your field of study"
          />
        </div>
        <div>
          <Label htmlFor="year">Year</Label>
          <Input
            id="year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="e.g., Freshman, Sophomore"
          />
        </div>
        <div>
          <Label htmlFor="avatar">Avatar URL</Label>
          <Input
            id="avatar"
            type="url"
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
            placeholder="https://..."
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Updating..." : "Update Profile"}
        </Button>
      </form>
    </Card>
  );
}
