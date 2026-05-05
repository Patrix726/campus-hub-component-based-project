import { auth } from "@repo/auth";
import { createPrismaClient } from "@repo/db";
import { env } from "@repo/env/server";
import { fromNodeHeaders } from "better-auth/node";
import { Router } from "express";
import type { Request } from "express";

import type { AnalyticsOverviewResponse } from "../shared";

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

function assertAnalyticsAccess(resolved: Payload, res: import("express").Response) {
  const user = resolved?.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  if (!isEmailAllowed(user.email ?? "")) {
    res.status(403).json({ error: "Analytics access denied. Set ADMIN_EMAILS on the server to include your email." });
    return false;
  }
  return true;
}

function startOfUtcDay(d: Date) {
  const copy = new Date(d);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

function addUtcDays(base: Date, delta: number) {
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + delta);
  return next;
}

router.get("/api/analytics/overview", async (req, res) => {
  try {
    const authSession = await resolveSession(req);
    if (!assertAnalyticsAccess(authSession, res)) {
      return;
    }

    const now = new Date();
    const fourteenDaysAgo = addUtcDays(startOfUtcDay(now), -13);
    const usersInRange = await prisma.user.findMany({
      where: { createdAt: { gte: fourteenDaysAgo } },
      select: { createdAt: true },
    });

    const byDay = new Map<string, number>();
    for (let i = 0; i < 14; i++) {
      const day = startOfUtcDay(addUtcDays(fourteenDaysAgo, i));
      const key = day.toISOString().slice(0, 10);
      byDay.set(key, 0);
    }
    for (const u of usersInRange) {
      const key = startOfUtcDay(u.createdAt).toISOString().slice(0, 10);
      if (byDay.has(key)) {
        byDay.set(key, (byDay.get(key) ?? 0) + 1);
      }
    }

    const signupByDay = [...byDay.entries()].map(([date, count]) => ({ date, count }));

    const weekStart = startOfUtcDay(addUtcDays(now, -7));
    const priorWeekStart = startOfUtcDay(addUtcDays(now, -14));
    const priorWeekEnd = weekStart;

    const [totalUsers, profileRows, newUsersThisWeek, newUsersPriorWeek] = await Promise.all([
      prisma.user.count(),
      prisma.profile.count(),
      prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.user.count({
        where: { createdAt: { gte: priorWeekStart, lt: priorWeekEnd } },
      }),
    ]);

    let percentChangeVsPriorWeek: number | null = null;
    if (newUsersPriorWeek > 0) {
      percentChangeVsPriorWeek = Math.round(
        ((newUsersThisWeek - newUsersPriorWeek) / newUsersPriorWeek) * 100,
      );
    } else if (newUsersThisWeek > 0) {
      percentChangeVsPriorWeek = null;
    } else {
      percentChangeVsPriorWeek = 0;
    }

    const profileCompletionRate =
      totalUsers > 0 ? Math.round((profileRows / totalUsers) * 1000) / 10 : 0;

    const body: AnalyticsOverviewResponse = {
      signupByDay,
      kpis: {
        newUsersThisWeek,
        newUsersPriorWeek,
        percentChangeVsPriorWeek,
        profileCompletionRate,
      },
    };
    res.json(body);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

export const analyticsRoutes: Router = router;
