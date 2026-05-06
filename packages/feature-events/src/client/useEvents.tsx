import { useCallback, useEffect, useMemo, useState } from "react";
import { env } from "@repo/env/web";
import type { CreateEventInput, EventDto, RsvpStatus, UpdateEventInput } from "../shared";

const toQuery = (params: Record<string, string | undefined>) => {
  const entries = Object.entries(params).filter(([, value]) => value);
  if (!entries.length) return "";
  return `?${entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value ?? "")}`).join("&")}`;
};

export function useEvents(userId: string | undefined) {
  const baseUrl = env.NEXT_PUBLIC_SERVER_URL;
  const [events, setEvents] = useState<EventDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const eventsUrl = useMemo(() => {
    return `${baseUrl}/api/events${toQuery({ userId })}`;
  }, [baseUrl, userId]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(eventsUrl, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load events");
      const data: EventDto[] = await res.json();
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [eventsUrl]);

  const createEvent = async (input: CreateEventInput) => {
    const res = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error("Failed to create event");
    }

    await fetchEvents();
  };

  const updateEvent = async (id: string, input: UpdateEventInput) => {
    const res = await fetch(`${baseUrl}/api/events/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error("Failed to update event");
    }

    await fetchEvents();
  };

  const deleteEvent = async (id: string) => {
    const res = await fetch(`${baseUrl}/api/events/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error("Failed to delete event");
    }

    await fetchEvents();
  };

  const rsvpEvent = async (id: string, status: RsvpStatus) => {
    if (!userId) throw new Error("Missing userId");

    const res = await fetch(`${baseUrl}/api/events/${id}/rsvp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, status }),
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error("Failed to update RSVP");
    }

    await fetchEvents();
  };

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return {
    events,
    loading,
    error,
    createEvent,
    updateEvent,
    deleteEvent,
    rsvpEvent,
    refetch: fetchEvents,
  };
}
