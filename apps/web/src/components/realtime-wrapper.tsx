"use client";

import { RealtimeProvider } from "@repo/realtime/client";
import { authClient } from "@/lib/auth-client";
import { env } from "@repo/env/web";

/**
 * Wraps children with the RealtimeProvider only when user is authenticated.
 * Derives WebSocket URL from the server URL.
 */
export function RealtimeWrapper({ children }: { children: React.ReactNode }) {
  const { data: session } = authClient.useSession();

  if (!session?.user) {
    // Not authenticated — render children without realtime
    return <>{children}</>;
  }

  // Derive WS URL from server URL
  const serverUrl = env.NEXT_PUBLIC_SERVER_URL;
  const wsUrl = serverUrl.replace(/^http/, "ws").replace(/\/$/, "") + "/ws";

  return (
    <RealtimeProvider url={wsUrl} userId={session.user.id}>
      {children}
    </RealtimeProvider>
  );
}
