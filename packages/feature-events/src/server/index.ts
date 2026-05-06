import { createPrismaClient } from "@repo/db";
import { Router } from "express";
import { z } from "zod";
import type { RsvpStatus } from "../shared";

const router = Router();
const prisma = createPrismaClient();

const createEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date().optional(),
  capacity: z.number().int().positive().optional(),
  organizerId: z.string().min(1),
});

const updateEventSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  startAt: z.coerce.date().optional(),
  endAt: z.coerce.date().nullable().optional(),
  capacity: z.number().int().positive().nullable().optional(),
});

const rsvpSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(["GOING", "INTERESTED", "DECLINED"]),
});

router.get("/api/events", async (req, res) => {
  try {
    const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;

    const events = await prisma.event.findMany({
      orderBy: { startAt: "asc" },
      include: {
        organizer: { select: { id: true, name: true } },
        _count: { select: { rsvps: true } },
        rsvps: userId
          ? {
              where: { userId },
              select: { status: true },
            }
          : false,
      },
    });

    const payload = events.map((event) => {
      const myRsvp = event.rsvps?.[0]?.status ?? null;
      return {
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        startAt: event.startAt.toISOString(),
        endAt: event.endAt ? event.endAt.toISOString() : null,
        capacity: event.capacity,
        organizerId: event.organizerId,
        organizerName: event.organizer?.name ?? null,
        rsvpsCount: event._count.rsvps,
        myRsvp,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
      };
    });

    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/events", async (req, res) => {
  try {
    const data = createEventSchema.parse(req.body);

    const event = await prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        location: data.location,
        startAt: data.startAt,
        endAt: data.endAt,
        capacity: data.capacity,
        organizerId: data.organizerId,
      },
    });

    res.status(201).json(event);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/api/events/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = updateEventSchema.parse(req.body);

    const event = await prisma.event.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        location: data.location,
        startAt: data.startAt,
        endAt: data.endAt ?? undefined,
        capacity: data.capacity ?? undefined,
      },
    });

    res.json(event);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/api/events/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.event.delete({ where: { id } });
    res.status(204).send("");
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/events/:id/rsvp", async (req, res) => {
  try {
    const { id } = req.params;
    const data = rsvpSchema.parse(req.body) as { userId: string; status: RsvpStatus };

    const rsvp = await prisma.eventRsvp.upsert({
      where: {
        eventId_userId: {
          eventId: id,
          userId: data.userId,
        },
      },
      update: { status: data.status },
      create: {
        eventId: id,
        userId: data.userId,
        status: data.status,
      },
    });

    res.json(rsvp);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

export const eventRoutes: Router = router;
