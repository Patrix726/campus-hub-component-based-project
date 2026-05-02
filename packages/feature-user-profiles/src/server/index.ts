import { createPrismaClient } from "@repo/db";
import { Router } from "express";
import { z } from "zod";
import type { UpdateProfileInput } from "../shared";

const router = Router();
const prisma = createPrismaClient();

const updateProfileSchema = z.object({
  bio: z.string().optional(),
  major: z.string().optional(),
  year: z.string().optional(),
  avatar: z.string().optional(),
});

router.get("/api/profiles/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/api/profiles/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const data: UpdateProfileInput = updateProfileSchema.parse(req.body);

    const profile = await prisma.profile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
    res.json(profile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

export const profileRoutes: Router = router;
