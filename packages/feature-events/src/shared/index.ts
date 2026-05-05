export type RsvpStatus = "GOING" | "INTERESTED" | "DECLINED";

export type EventDto = {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startAt: string;
  endAt?: string | null;
  capacity?: number | null;
  organizerId: string;
  organizerName?: string | null;
  rsvpsCount: number;
  myRsvp?: RsvpStatus | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateEventInput = {
  title: string;
  description?: string;
  location?: string;
  startAt: string;
  endAt?: string;
  capacity?: number;
  organizerId: string;
};

export type UpdateEventInput = {
  title?: string;
  description?: string;
  location?: string;
  startAt?: string;
  endAt?: string | null;
  capacity?: number | null;
};
