"use client";

import { EditProfileForm } from "@repo/feature-user-profiles/client";
import type { User } from "@repo/feature-auth/shared";

interface EditProfileFormWrapperProps {
  user: User;
}

export default function EditProfile({ user }: EditProfileFormWrapperProps) {
  return <EditProfileForm user={user} />;
}

