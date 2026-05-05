export type AdminSummaryResponse = {
  totals: {
    users: number;
    profiles: number;
    verifiedEmails: number;
    activeSessions: number;
  };
  recentUsers: UserRow[];
};

export type UserRow = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  emailVerified: boolean;
};

export type ModerationQueueItem = {
  id: string;
  entityType: "post" | "comment";
  excerpt: string;
  reporterPreview: string;
  status: "open" | "escalated";
  createdAt: string;
};
