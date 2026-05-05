"use client";

import { NotificationBell } from "@repo/feature-notifications/client";
import { authClient } from "@/lib/auth-client";

export function NotificationBellWrapper() {
  const { data: session } = authClient.useSession();

  if (!session?.user) return null;

  return <NotificationBell userId={session.user.id} />;
}
