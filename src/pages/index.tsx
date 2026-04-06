import { getServerSession } from "next-auth/next";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Link from "next/link";
import { FormEvent, useState } from "react";

import { useEffect } from "react";

import {
  Checkbox,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
  Input,
  Label,
  Stat,
  Textarea,
} from "@boilerhaus-ui/boilerhaus-ui";

import { getAuthOptions } from "../lib/auth";
import { getHomePageData } from "../lib/home-data";
import { hasTooManyLocationOptions } from "../lib/location-options";
import { AppShell } from "../components/AppShell";
import { CalendarExportButton } from "../components/CalendarExportButton";
import { EventCard, type EventCardEvent } from "../components/EventCard";
import { GroupCard } from "../components/GroupCard";
import { DatePicker } from "../components/DatePicker";
import { MonthView, type MonthEvent } from "../components/MonthView";
import { WeekView, type WeekEvent } from "../components/WeekView";
import { LocationVoteCard, type LocationVoteCardEvent } from "../components/LocationVoteCard";
import { TbdEventCard, type TbdEventCardEvent } from "../components/TbdEventCard";
import type { RSVPStatus } from "../components/RSVPButton";
import { Tooltip } from "../components/Tooltip";
import { LogoMark } from "../components/Logo";

type Props = InferGetServerSidePropsType<typeof getServerSideProps>;

const initialEventForm = {
  groupId: "",
  title: "",
  description: "",
  location: "",
  mapLink: "",
  mapEmbed: "",
  locationOptions: "",
  arrivalDate: "",
  nights: "",
  isPotluck: false,
};

function extractMapEmbedSrc(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("<iframe")) {
    const match = trimmed.match(/\bsrc="([^"]+)"/);
    return match ? match[1] : trimmed;
  }
  return trimmed;
}

function isoToDatetimeLocal(iso: string) {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatDate(value: string | null) {
  if (!value) return "TBD";
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function Home({ databaseReady, databaseMessage, groups, upcomingEvents, tbdEvents, userId }: Props) {
  // Edit modal
  const [editingType, setEditingType] = useState<"event" | "group" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEventForm, setEditEventForm] = useState({ ...initialEventForm });
  const [rsvpFilter, setRsvpFilter] = useState<"all" | "mine">("all");
  const [editGroupForm, setEditGroupForm] = useState({ name: "" });
  const [editState, setEditState] = useState<{ loading: boolean; error: string | null }>({ loading: false, error: null });

  useEffect(() => {
    const stored = localStorage.getItem("rsvpFilter");
    if (stored === "mine" || stored === "all") setRsvpFilter(stored);
  }, []);

  const [localUpcoming, setLocalUpcoming] = useState(upcomingEvents);
  const [localTbd] = useState(tbdEvents);

  const [viewMode, setViewMode] = useState<"list" | "week" | "month">("month");

  function handleRsvpChange(eventId: string, newStatus: RSVPStatus, hadPreviousRsvp: boolean) {
    setLocalUpcoming((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? { ...e, userRsvpStatus: newStatus, rsvpCount: hadPreviousRsvp ? e.rsvpCount : e.rsvpCount + 1 }
          : e
      )
    );
  }

  function openEditEvent(event: Props["upcomingEvents"][0]) {
    setEditingType("event");
    setEditingId(event.id);
    setEditEventForm({
      groupId: event.groupId,
      title: event.title,
      description: event.description || "",
      location: event.location || "",
      mapLink: event.mapLink || "",
      mapEmbed: event.mapEmbed || "",
      locationOptions: event.locationOptionNames.join(", "),
      arrivalDate: event.arrivalDate ? isoToDatetimeLocal(event.arrivalDate) : "",
      nights: event.nights?.toString() || "",
      isPotluck: event.isPotluck,
    });
    setEditState({ loading: false, error: null });
  }

  function openEditGroup(group: Props["groups"][0]) {
    setEditingType("group");
    setEditingId(group.id);
    setEditGroupForm({ name: group.name });
    setEditState({ loading: false, error: null });
  }

  function closeModal() {
    setEditingType(null);
    setEditingId(null);
  }

  async function handleDeleteEvent(id: string) {
    if (!window.confirm("Delete this event? This cannot be undone.")) return;
    const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
    if (res.ok) window.location.reload();
  }

  async function handleDeleteGroup(id: string) {
    if (!window.confirm("Delete this group and all its events? This cannot be undone.")) return;
    const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
    if (res.ok) window.location.reload();
  }

  async function handleEditEventSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingId) return;

    if (editEventForm.location.trim() && editEventForm.locationOptions.trim()) {
      setEditState({
        loading: false,
        error: "Choose either a confirmed location or comma-separated location vote options",
      });
      return;
    }

    if (hasTooManyLocationOptions(editEventForm.locationOptions)) {
      setEditState({ loading: false, error: "You can add up to 4 location vote options" });
      return;
    }

    setEditState({ loading: true, error: null });
    const res = await fetch(`/api/events/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editEventForm),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({ error: "Failed to save" }));
      setEditState({ loading: false, error: payload.error || "Failed to save" });
      return;
    }
    closeModal();
    window.location.reload();
  }

  async function handleEditGroupSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingId) return;
    setEditState({ loading: true, error: null });
    const res = await fetch(`/api/groups/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editGroupForm),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({ error: "Failed to save" }));
      setEditState({ loading: false, error: payload.error || "Failed to save" });
      return;
    }
    closeModal();
    window.location.reload();
  }

  const sidebarGroups = groups.map((g) => ({ id: g.id, name: g.name }));

  const filteredUpcoming =
    rsvpFilter === "mine"
      ? localUpcoming.filter(
          (e) => e.userRsvpStatus !== null && e.userRsvpStatus !== "NOT_ATTENDING"
        )
      : localUpcoming;

  const locationVoteEvents = filteredUpcoming.filter(
    (event) => !event.location && event.locationOptionCount > 0
  );

  const scheduledUpcoming = filteredUpcoming.filter(
    (event) => !(event.locationOptionCount > 0 && !event.location)
  );

  const scheduledEvents: WeekEvent[] = scheduledUpcoming.map((e) => ({
    id: e.id,
    title: e.title,
    groupName: e.groupName,
    arrivalDate: e.arrivalDate as string,
    location: e.location,
  }));

  const monthEvents: MonthEvent[] = scheduledUpcoming.map((e) => ({
    id: e.id,
    title: e.title,
    groupName: e.groupName,
    arrivalDate: e.arrivalDate as string,
  }));

  const nextMeetup = localUpcoming[0] ?? null;

  return (
    <AppShell groups={sidebarGroups}>
      {!databaseReady ? (
        <section className="warning-card">
          <h2>Database not ready</h2>
          <p>Run Prisma migrations against your database and reload.</p>
          {databaseMessage ? <pre>{databaseMessage}</pre> : null}
        </section>
      ) : null}

      {/* Hero — compact, calendar-forward */}
      <section className="hero">
        <div className="hero-left">
          <div className="hero-logo" aria-hidden="true">
            <LogoMark size={48} color="var(--accent)" />
          </div>
          <div className="hero-copy">
            <h1 className="hero-title">Where the crew makes camp.</h1>
            <p className="hero-sub">
              Coordinate dates, collect RSVPs, share calendars.
            </p>
          </div>
        </div>
        <div className="hero-actions">
          <Link href="/groups/new" className="btn btn-ghost">+ New Group</Link>
          <Link href="/events/new" className="btn btn-primary">+ New Event</Link>
        </div>
      </section>

      {/* Stats */}
      <section className="stats-grid">
        <Stat label="Groups" value={groups.length} />
        <Stat label="Upcoming events" value={localUpcoming.length} />
        <Stat
          label="Next meetup"
          value={nextMeetup ? formatDate(nextMeetup.arrivalDate) : "None scheduled"}
          suppressHydrationWarning
        />
      </section>

      {/* ── PRIMARY: Events calendar ── */}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="panel-label">Upcoming events</p>
            <h2>What&apos;s on the calendar</h2>
          </div>
          <div className="panel-controls">
            <div className="view-toggle-row">
              {(["list", "week", "month"] as const).map((mode) => (
                <button
                  key={mode}
                  className={`btn btn-sm ${viewMode === mode ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setViewMode(mode)}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
            <div className="view-toggle-row">
              <button
                className={`btn btn-sm ${rsvpFilter === "all" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => { setRsvpFilter("all"); localStorage.setItem("rsvpFilter", "all"); }}
              >
                All
              </button>
              <button
                className={`btn btn-sm ${rsvpFilter === "mine" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => { setRsvpFilter("mine"); localStorage.setItem("rsvpFilter", "mine"); }}
              >
                My RSVPs
              </button>
            </div>
            {scheduledUpcoming.length > 0 ? (
              <CalendarExportButton href="/api/events/ics" label="Export all events" />
            ) : null}
          </div>
        </div>

        {scheduledUpcoming.length === 0 ? (
          <div className="empty-state-with-action">
            <p className="empty-state">
              {locationVoteEvents.length > 0
                ? "Confirmed dates are waiting on location votes."
                : rsvpFilter === "mine"
                ? "No events you've responded to yet."
                : "No confirmed events yet."}
            </p>
            {rsvpFilter !== "mine" ? (
              <Link href="/events/new" className="btn btn-primary">+ Schedule the first event</Link>
            ) : null}
          </div>
        ) : viewMode === "list" ? (
          <div className="event-list">
            {scheduledUpcoming.map((event) => (
              <EventCard
                key={event.id}
                event={event as EventCardEvent}
                userId={userId}
                onEdit={() => openEditEvent(event)}
                onDelete={() => handleDeleteEvent(event.id)}
                onRsvpChange={(s, had) => handleRsvpChange(event.id, s, had)}
              />
            ))}
          </div>
        ) : viewMode === "week" ? (
          <WeekView events={scheduledEvents} />
        ) : (
          <MonthView events={monthEvents} />
        )}
      </section>

      {/* TBD events */}
      {localTbd.length > 0 ? (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="panel-label">Needs a date</p>
              <h2>Vote on when to go</h2>
            </div>
          </div>
          <div className="event-list">
            {localTbd.map((event) => (
              <TbdEventCard
                key={event.id}
                event={event as TbdEventCardEvent}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Location vote events */}
      {locationVoteEvents.length > 0 ? (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="panel-label">Needs a location</p>
              <h2>Vote on where to go</h2>
            </div>
          </div>
          <div className="event-list">
            {locationVoteEvents.map((event) => (
              <LocationVoteCard
                key={event.id}
                event={event as LocationVoteCardEvent}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Groups */}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="panel-label">Groups</p>
            <h2>Current meetup hosts</h2>
          </div>
          <Link href="/groups/new" className="btn btn-ghost btn-sm">+ New Group</Link>
        </div>
        {groups.length === 0 ? (
          <p className="empty-state">No groups yet.</p>
        ) : (
          <div className="group-list">
            {groups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                userId={userId}
                onEdit={() => openEditGroup(group)}
                onDelete={() => handleDeleteGroup(group.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Edit Event Modal ── */}
      <Dialog open={editingType === "event" && editingId !== null} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent>
          <DialogTitle>
            <span className="modal-label">Edit event</span>
            Update event details
          </DialogTitle>
          <form className="form-grid" onSubmit={handleEditEventSubmit}>
            <div className="field">
              <Label htmlFor="ee-title" required>Event title</Label>
              <Input
                id="ee-title"
                value={editEventForm.title}
                onChange={(e) => setEditEventForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </div>
            <div className="field">
              <Label htmlFor="ee-desc">Description</Label>
              <Textarea
                id="ee-desc"
                value={editEventForm.description}
                onChange={(e) => setEditEventForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="field">
              <Label htmlFor="ee-location">Location</Label>
              <Input
                id="ee-location"
                value={editEventForm.location}
                onChange={(e) => setEditEventForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>
            <div className="field">
              <Label htmlFor="ee-locopts">Location vote options</Label>
              <Input
                id="ee-locopts"
                value={editEventForm.locationOptions}
                onChange={(e) => setEditEventForm((f) => ({ ...f, locationOptions: e.target.value }))}
                placeholder="Turtle Dunes, Pine Ridge, North Grove"
                helperText="Optional. Separate with commas. Leave Location blank if the group should vote."
              />
            </div>
            <div className="field">
              <Label htmlFor="ee-maplink">Map link</Label>
              <Input
                id="ee-maplink"
                type="url"
                value={editEventForm.mapLink}
                onChange={(e) => setEditEventForm((f) => ({ ...f, mapLink: e.target.value }))}
                placeholder="https://maps.google.com/…"
              />
            </div>
            <div className="field">
              <Label htmlFor="ee-mapembed">Map embed</Label>
              <Input
                id="ee-mapembed"
                value={editEventForm.mapEmbed}
                onChange={(e) =>
                  setEditEventForm((f) => ({ ...f, mapEmbed: extractMapEmbedSrc(e.target.value) }))
                }
                placeholder="Paste Google Maps embed code or src= URL"
                helperText="Google Maps → Share → Embed a map → paste the full code or just the src= URL"
              />
            </div>
            <div className="date-grid">
              <DatePicker
                label="Arrival"
                value={editEventForm.arrivalDate}
                onChange={(v) => setEditEventForm((f) => ({ ...f, arrivalDate: v }))}
                placeholder="TBD — leave blank to vote later"
              />
              <div className="field">
                <Label htmlFor="ee-nights">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    How many nights?
                    <Tooltip
                      text="Departure date is calculated automatically as arrival + nights."
                      position="top"
                      maxWidth={240}
                    >
                      <span aria-label="Help" style={{ cursor: "help", fontSize: "0.8rem", color: "var(--text-dim)", lineHeight: 1 }}>ⓘ</span>
                    </Tooltip>
                  </span>
                </Label>
                <Input
                  id="ee-nights"
                  type="number"
                  min="1"
                  max="30"
                  value={editEventForm.nights}
                  onChange={(e) => setEditEventForm((f) => ({ ...f, nights: e.target.value }))}
                  placeholder="e.g. 3"
                />
              </div>
            </div>
            <div className="checkbox-row">
              <Checkbox
                id="ee-potluck"
                checked={editEventForm.isPotluck}
                onCheckedChange={(v) => setEditEventForm((f) => ({ ...f, isPotluck: v === true }))}
              />
              <Label htmlFor="ee-potluck">Potluck — everyone brings a dish</Label>
            </div>
            {editState.error ? <p className="form-error">{editState.error}</p> : null}
            <DialogFooter>
              <DialogClose asChild>
                <button className="btn btn-ghost">Cancel</button>
              </DialogClose>
              <button type="submit" className="btn btn-primary" disabled={editState.loading}>
                {editState.loading ? "Saving…" : "Save changes"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Group Modal ── */}
      <Dialog open={editingType === "group" && editingId !== null} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent>
          <DialogTitle>
            <span className="modal-label">Edit group</span>
            Rename group
          </DialogTitle>
          <form className="form-grid" onSubmit={handleEditGroupSubmit}>
            <div className="field">
              <Label htmlFor="eg-name" required>Group name</Label>
              <Input
                id="eg-name"
                value={editGroupForm.name}
                onChange={(e) => setEditGroupForm({ name: e.target.value })}
                required
              />
            </div>
            {editState.error ? <p className="form-error">{editState.error}</p> : null}
            <DialogFooter>
              <DialogClose asChild>
                <button className="btn btn-ghost">Cancel</button>
              </DialogClose>
              <button type="submit" className="btn btn-primary" disabled={editState.loading}>
                {editState.loading ? "Saving…" : "Save changes"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <style jsx>{`
        /* ── Hero ── */
        .hero {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
          padding: 20px 24px;
          border: 1px solid var(--border);
          border-radius: var(--radius-card);
          background: var(--bg-card);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          flex-wrap: wrap;
        }

        .hero-left {
          display: flex;
          align-items: center;
          gap: 16px;
          flex: 1;
          min-width: 0;
        }

        .hero-logo { flex-shrink: 0; opacity: 0.8; }
        .hero-copy { min-width: 0; }

        .hero-title {
          font-family: var(--font-display);
          font-size: clamp(1.1rem, 2.5vw, 1.5rem);
          font-weight: 700;
          color: var(--text);
          margin: 0 0 4px;
          line-height: 1.15;
          letter-spacing: -0.01em;
        }

        .hero-sub {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin: 0;
          line-height: 1.4;
        }

        .hero-actions {
          display: flex;
          gap: 10px;
          flex-shrink: 0;
          flex-wrap: wrap;
        }

        @media (max-width: 600px) {
          .hero { padding: 16px; }
          .hero-logo { display: none; }
          .hero-actions { width: 100%; }
        }

        /* ── Warning ── */
        .warning-card {
          margin-bottom: 20px;
          padding: 20px;
          border: 1px solid rgba(215, 185, 127, 0.35);
          border-radius: 20px;
          background: var(--bg-card);
        }

        .warning-card pre {
          overflow-x: auto;
          white-space: pre-wrap;
          background: rgba(0, 0, 0, 0.25);
          padding: 12px;
          border-radius: 12px;
        }

        /* ── Stats ── */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        @media (max-width: 640px) {
          .stats-grid { grid-template-columns: 1fr 1fr; }
        }

        /* ── Panels ── */
        .panel {
          border: 1px solid var(--border);
          background: var(--bg-card);
          backdrop-filter: blur(10px);
          border-radius: var(--radius-card);
          padding: 24px;
          margin-bottom: 16px;
        }

        .panel-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 18px;
        }

        .panel-label {
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 0.75rem;
          color: var(--accent);
          margin: 0 0 5px;
          display: block;
        }

        h2 {
          margin: 0;
          font-size: 1.15rem;
          color: var(--text);
        }

        .panel-controls {
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: flex-end;
          flex-shrink: 0;
        }

        .view-toggle-row {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
          flex-wrap: wrap;
        }

        /* ── Empty state ── */
        .empty-state {
          color: var(--text-dim);
          margin: 0;
          font-size: 0.9rem;
        }

        .empty-state-with-action {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 16px;
        }

        /* ── Event / group lists ── */
        .event-list,
        .group-list {
          display: grid;
          gap: 12px;
        }

        /* ── Forms (inside boilerhaus-ui Dialog) ── */
        .form-grid {
          display: grid;
          gap: 14px;
        }

        /* Labelled field wrapper — stacks Label + Input vertically */
        .field {
          display: grid;
          gap: 6px;
        }

        /* Native <select> styled to match boilerhaus-ui Input */
        .native-select {
          width: 100%;
          font: inherit;
          font-size: 0.9rem;
          border: 1px solid var(--border-strong);
          border-radius: var(--radius-input);
          background: var(--bg-input);
          color: var(--text);
          padding: 10px 14px;
          transition: border-color 0.15s;
          appearance: auto;
        }

        .native-select:focus {
          outline: none;
          border-color: var(--border-focus);
        }

        .field-hint {
          font-size: 0.8rem;
          color: var(--text-dim);
        }

        /* boilerhaus-ui Checkbox + Label row */
        .checkbox-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        /* Modal sub-label (e.g. "New event") above DialogTitle */
        .modal-label {
          display: block;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 0.72rem;
          color: var(--accent);
          margin-bottom: 4px;
          font-weight: 400;
        }

        .date-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .form-error {
          color: var(--color-error);
          margin: 0;
          font-size: 0.9rem;
        }

        @media (max-width: 480px) {
          .date-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </AppShell>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, getAuthOptions());
  if (!session) return { redirect: { destination: "/login", permanent: false } };
  if (!session.user.name) return { redirect: { destination: "/profile", permanent: false } };

  const data = await getHomePageData(session.user.id);
  return { props: { ...data, userId: session.user.id } };
};
