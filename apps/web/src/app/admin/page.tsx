
import { AdminDashboard } from "@repo/feature-admin/client";
import { env } from "@repo/env/web";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";

export default async function AdminPage() {
  let session;

  try {
    session = await authClient.getSession({
      fetchOptions: {
        headers: await headers(),
        throw: true,
      },
    });
  } catch {
    redirect("/login");
  }

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <AdminDashboard
      apiBaseUrl={env.NEXT_PUBLIC_SERVER_URL}
      viewerEmail={session.user.email ?? null}
    />
  );
}
