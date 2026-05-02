"use client";

import { ProfilePage } from "@repo/feature-user-profiles/client";
import type { User } from "@repo/feature-auth/shared";

interface ProfilePageWrapperProps {
  user: User;
}

export default function Profile({ user }: ProfilePageWrapperProps) {
  return <ProfilePage user={user} />;
}