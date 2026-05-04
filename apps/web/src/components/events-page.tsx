"use client";

import { useMemo, useState } from "react";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { useEvents } from "@repo/feature-events/client";
import type { CreateEventInput, EventDto, RsvpStatus, UpdateEventInput } from "@repo/feature-events/shared";

const rsvpOptions: { value: RsvpStatus; label: string }[] = [
  { value: "GOING", label: "Going" },
  { value: "INTERESTED", label: "Interested" },
  { value: "DECLINED", label: "Declined" },
];

const defaultFormState: CreateEventInput = {
  title: "",
  description: "",
  location: "",
  startAt: "",
  endAt: "",
  capacity: undefined,
  organizerId: "",
};

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

function EventForm({
  onSubmit,
  loading,
  submitLabel,
  values,
  onChange,
  onCancel,
}: {
  onSubmit: () => Promise<void>;
  loading: boolean;
  submitLabel: string;
  values: CreateEventInput;
  onChange: (next: CreateEventInput) => void;
  onCancel?: () => void;
}) {
  return (
    <Card className="border border-amber-200 bg-white/90">
      <CardHeader>
        <CardTitle>{submitLabel}</CardTitle>
        <CardDescription>Share campus happenings and invite classmates.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={values.title}
            onChange={(event) => onChange({ ...values, title: event.target.value })}
            placeholder="Orientation meetup"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={values.description ?? ""}
            onChange={(event) => onChange({ ...values, description: event.target.value })}
            placeholder="Meet fellow students and tour campus resources."
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={values.location ?? ""}
              onChange={(event) => onChange({ ...values, location: event.target.value })}
              placeholder="Student union"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="capacity">Capacity</Label>
            <Input
              id="capacity"
              type="number"
              value={values.capacity ?? ""}
              onChange={(event) =>
                onChange({
                  ...values,
                  capacity: event.target.value ? Number(event.target.value) : undefined,
                })
              }
              placeholder="150"
            />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="startAt">Start</Label>
            <Input
              id="startAt"
              type="datetime-local"
              value={values.startAt}
              onChange={(event) => onChange({ ...values, startAt: event.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="endAt">End</Label>
            <Input
              id="endAt"
              type="datetime-local"
              value={values.endAt ?? ""}
              onChange={(event) => onChange({ ...values, endAt: event.target.value })}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <Button type="button" onClick={onSubmit} disabled={loading}>
          {loading ? "Saving..." : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function EventCard({
  event,
  isOwner,
  onEdit,
  onDelete,
  onRsvp,
  updating,
}: {
  event: EventDto;
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onRsvp: (status: RsvpStatus) => void;
  updating: boolean;
}) {
  return (
    <Card className="border border-amber-200 bg-white/95">
      <CardHeader>
        <CardTitle>{event.title}</CardTitle>
        <CardDescription>
          {event.organizerName ? `Hosted by ${event.organizerName}` : "Campus event"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {event.description && <p className="text-sm text-gray-700">{event.description}</p>}
        <div className="text-xs text-gray-500 space-y-1">
          <div>Location: {event.location || "TBA"}</div>
          <div>Starts: {formatDate(event.startAt)}</div>
          <div>Ends: {formatDate(event.endAt)}</div>
          <div>
            RSVPs: {event.rsvpsCount}
            {event.capacity ? ` / ${event.capacity}` : ""}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        {rsvpOptions.map((option) => (
          <Button
            key={option.value}
            size="sm"
            variant={event.myRsvp === option.value ? "secondary" : "outline"}
            onClick={() => onRsvp(option.value)}
            disabled={updating}
          >
            {option.label}
          </Button>
        ))}
        {isOwner && (
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={onEdit} disabled={updating}>
              Edit
            </Button>
            <Button size="sm" variant="destructive" onClick={onDelete} disabled={updating}>
              Delete
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

export default function EventsPage({ user }: { user: { id: string; name: string } }) {
  const [formState, setFormState] = useState<CreateEventInput>({
    ...defaultFormState,
    organizerId: user.id,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { events, loading, error, createEvent, updateEvent, deleteEvent, rsvpEvent } = useEvents(user.id);

  const eventsByDate = useMemo(() => {
    return [...events].sort((a, b) => a.startAt.localeCompare(b.startAt));
  }, [events]);

  const handleSubmit = async () => {
    setSaving(true);
    setActionError(null);

    try {
      if (!formState.title || !formState.startAt) {
        throw new Error("Title and start time are required");
      }

      if (editingId) {
        const updatePayload: UpdateEventInput = {
          title: formState.title,
          description: formState.description,
          location: formState.location,
          startAt: formState.startAt,
          endAt: formState.endAt || null,
          capacity: formState.capacity ?? null,
        };
        await updateEvent(editingId, updatePayload);
      } else {
        await createEvent(formState);
      }

      setFormState({ ...defaultFormState, organizerId: user.id });
      setEditingId(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to save event");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (event: EventDto) => {
    setEditingId(event.id);
    setFormState({
      title: event.title,
      description: event.description ?? "",
      location: event.location ?? "",
      startAt: event.startAt.slice(0, 16),
      endAt: event.endAt ? event.endAt.slice(0, 16) : "",
      capacity: event.capacity ?? undefined,
      organizerId: event.organizerId,
    });
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    setActionError(null);
    try {
      await deleteEvent(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to delete event");
    } finally {
      setSaving(false);
    }
  };

  const handleRsvp = async (id: string, status: RsvpStatus) => {
    setSaving(true);
    setActionError(null);
    try {
      await rsvpEvent(id, status);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to update RSVP");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Campus Events</h1>
          <p className="text-sm text-gray-600">Create events, manage RSVPs, and keep campus in the loop.</p>
        </div>
      </div>

      {actionError && <p className="text-sm text-red-600">{actionError}</p>}

      <EventForm
        onSubmit={handleSubmit}
        loading={saving}
        submitLabel={editingId ? "Update Event" : "Create Event"}
        values={formState}
        onChange={setFormState}
        onCancel={
          editingId
            ? () => {
                setEditingId(null);
                setFormState({ ...defaultFormState, organizerId: user.id });
              }
            : undefined
        }
      />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Upcoming events</h2>
        {loading && <p className="text-sm text-gray-500">Loading events...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !eventsByDate.length && (
          <p className="text-sm text-gray-500">No events yet. Create the first one!</p>
        )}
        <div className="grid gap-4 lg:grid-cols-2">
          {eventsByDate.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              isOwner={event.organizerId === user.id}
              onEdit={() => handleEdit(event)}
              onDelete={() => handleDelete(event.id)}
              onRsvp={(status) => handleRsvp(event.id, status)}
              updating={saving}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
