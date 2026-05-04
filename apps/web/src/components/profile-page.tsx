"use client";

import { ProfilePage } from "@repo/feature-user-profiles/client";
import type { User } from "@repo/feature-auth/shared";
import { Card } from "@repo/ui/components/card";

interface ProfilePageWrapperProps {
  user: User;
}

export default function Profile({ user }: ProfilePageWrapperProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card className="p-8 rounded-2xl shadow-xl border-amber-100 bg-white/95 backdrop-blur-sm">
          <ProfilePage user={user} />
        </Card>
      </div>
    </div>
  );
}