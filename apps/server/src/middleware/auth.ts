import { auth } from "@repo/auth";
import { fromNodeHeaders } from "better-auth/node";
import type { RequestHandler } from "express";

export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session?.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    res.locals.userId = session.user.id;
    next();
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
};
