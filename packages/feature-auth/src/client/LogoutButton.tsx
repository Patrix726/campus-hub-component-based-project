"use client";

import { useAuth } from "./useAuth";
import { Button } from "@repo/ui/components/button";

export function LogoutButton() {
  const { signOut, isPending, user } = useAuth();

  if (!user) return null;

  return (
    <Button onClick={signOut} disabled={isPending}>
      {isPending ? "Signing out..." : "Sign Out"}
    </Button>
  );
}