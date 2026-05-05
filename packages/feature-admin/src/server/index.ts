import { auth } from "@repo/auth";
import { createPrismaClient } from "@repo/db";
import { env } from "@repo/env/server";
import { fromNodeHeaders } from "better-auth/node";
import { Router } from "express";
import type { Request } from "express";

import type { AdminSummaryResponse, ModerationQueueItem } from "../shared";

const prisma = createPrismaClient();
const router = Router();

async function resolveSession(req: Request) {
  return auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
}

function isEmailAllowed(email: string) {
  const allowList =
    env.ADMIN_EMAILS?.split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean) ?? [];
  if (!allowList.length) {
    return true;
  }
  return allowList.includes(email.toLowerCase());
}

type Payload = Awaited<ReturnType<typeof resolveSession>>;

function assertAdmin(resolved: Payload, res: import("express").Response) {
  const user = resolved?.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  if (!isEmailAllowed(user.email ?? "")) {
    res.status(403).json({ error: "Admin access denied. Set ADMIN_EMAILS on the server to include your email." });
    return false;
  }
  return true;
}

router.get("/api/admin/summary", async (req, res) => {
  try {
    const authSession = await resolveSession(req);
    if (!assertAdmin(authSession, res)) {
      return;
    }

    const [users, profiles, verifiedEmails, activeSessions] = await Promise.all([
      prisma.user.count(),
      prisma.profile.count(),
      prisma.user.count({ where: { emailVerified: true } }),
      prisma.session.count({
        where: { expiresAt: { gt: new Date() } },
      }),
    ]);

    const recent = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        emailVerified: true,
      },
    });

    const body: AdminSummaryResponse = {
      totals: { users, profiles, verifiedEmails, activeSessions },
      recentUsers: recent.map((u: (typeof recent)[number]) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        emailVerified: u.emailVerified,
        createdAt: u.createdAt.toISOString(),
      })),
    };
    res.json(body);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

const mockModeration: ModerationQueueItem[] = [
  {
    id: "demo-1",
    entityType: "post",
    excerpt: '"Anyone selling old chem notes?" … flagged spam',
    reporterPreview: "user_8f***",
    status: "open",
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
  },
  {
    id: "demo-2",
    entityType: "comment",
    excerpt: "Thread on housing — reported harassment …",
    reporterPreview: "user_21***",
    status: "escalated",
    createdAt: new Date(Date.now() - 7200_000).toISOString(),
  },
];

router.get("/api/admin/moderation", async (req, res) => {
  try {
    const authSession = await resolveSession(req);
    if (!assertAdmin(authSession, res)) {
      return;
    }
    res.json({ queue: mockModeration });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/admin/moderation/:id/resolve", async (req, res) => {
  try {
    const authSession = await resolveSession(req);
    if (!assertAdmin(authSession, res)) {
      return;
    }
    res.json({ ok: true, id: req.params.id });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

export const adminRoutes: Router = router;
