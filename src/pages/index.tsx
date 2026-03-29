import { getServerSession } from "next-auth/next";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { FormEvent, useState } from "react";

import { useEffect } from "react";

import { authOptions } from "../lib/auth";
import { getHomePageData } from "../lib/home-data";
import { AppShell } from "../components/AppShell";
import { EventCard, type EventCardEvent } from "../components/EventCard";
import { GroupCard } from "../components/GroupCard";
import { DatePicker } from "../components/DatePicker";
import { WeekView, type WeekEvent } from "../components/WeekView";
import { TbdEventCard, type TbdEventCardEvent } from "../components/TbdEventCard";
import type { RSVPStatus } from "../components/RSVPButton";

type Props = InferGetServerSidePropsType<typeof getServerSideProps>;

const initialGroupForm = { name: "" };
const initialEventForm = {
  groupId: "",
  title: "",
  description: "",
  location: "",
  mapLink: "",
  mapEmbed: "",
  arrivalDate: "",
  nights: "",
  isPotluck: false,
};

// Extract the src URL from a Google Maps iframe embed snippet.
// If the user pastes a full <iframe> tag, pull out the src attribute value.
// If they paste a bare URL, return it as-is.
function extractMapEmbedSrc(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("<iframe")) {
    const match = trimmed.match(/\bsrc="([^"]+)"/);
    return match ? match[1] : trimmed;
  }
  return trimmed;
}

// Convert UTC ISO string to datetime-local value (local time)
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
  const [groupForm, setGroupForm] = useState(initialGroupForm);
  const [eventForm, setEventForm] = useState({
    ...initialEventForm,
    groupId: groups[0]?.id || "",
  });
  const [groupState, setGroupState] = useState<{ loading: boolean; error: string | null }>({ loading: false, error: null });
  const [eventState, setEventState] = useState<{ loading: boolean; error: string | null }>({ loading: false, error: null });

  // Edit modal
  const [editingType, setEditingType] = useState<"event" | "group" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEventForm, setEditEventForm] = useState({ ...initialEventForm });
  const [rsvpFilter, setRsvpFilter] = useState<"all" | "mine">("all");
  const [editGroupForm, setEditGroupForm] = useState({ name: "" });
  const [editState, setEditState] = useState<{ loading: boolean; error: string | null }>({ loading: false, error: null });

  // Restore RSVP filter preference from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("rsvpFilter");
    if (stored === "mine" || stored === "all") setRsvpFilter(stored);
  }, []);

  // Local state for live RSVP count updates
  const [localUpcoming, setLocalUpcoming] = useState(upcomingEvents);
  const [localTbd] = useState(tbdEvents);

  // Event view mode
  const [viewMode, setViewMode] = useState<"week" | "list">("week");

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

  async function handleGroupSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGroupState({ loading: true, error: null });
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(groupForm),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({ error: "Failed to create group" }));
      setGroupState({ loading: false, error: payload.error || "Failed to create group" });
      return;
    }
    setGroupForm(initialGroupForm);
    window.location.reload();
  }

  async function handleEventSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEventState({ loading: true, error: null });
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventForm),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({ error: "Failed to create event" }));
      setEventState({ loading: false, error: payload.error || "Failed to create event" });
      return;
    }
    setEventForm({ ...initialEventForm, groupId: groups[0]?.id || "" });
    window.location.reload();
  }

  const sidebarGroups = groups.map((g) => ({ id: g.id, name: g.name }));

  const filteredUpcoming =
    rsvpFilter === "mine"
      ? localUpcoming.filter(
          (e) => e.userRsvpStatus !== null && e.userRsvpStatus !== "NOT_ATTENDING"
        )
      : localUpcoming;

  const scheduledEvents: WeekEvent[] = filteredUpcoming.map((e) => ({
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

      {/* Stats */}
      <section className="stats-grid">
        <article className="stat-card">
          <span>Groups</span>
          <strong>{groups.length}</strong>
        </article>
        <article className="stat-card">
          <span>Upcoming events</span>
          <strong>{localUpcoming.length}</strong>
        </article>
        <article className="stat-card">
          <span>Next meetup</span>
          <strong>{nextMeetup ? formatDate(nextMeetup.arrivalDate) : "None scheduled"}</strong>
        </article>
      </section>

      {/* Two-column layout */}
      <div className="content-grid">
        {/* Left column: create forms */}
        <div className="stack">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-label">Create group</p>
                <h2>Set up a host group</h2>
              </div>
            </div>
            <form className="form-grid" onSubmit={handleGroupSubmit}>
              <label>
                Group name
                <input
                  value={groupForm.name}
                  onChange={(e) => setGroupForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Boilerhaus Camp Crew"
                  required
                />
              </label>
              {groupState.error ? <p className="form-error">{groupState.error}</p> : null}
              <button type="submit" disabled={groupState.loading}>
                {groupState.loading ? "Creating…" : "Create group"}
              </button>
            </form>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-label">Create event</p>
                <h2>Schedule the next meetup</h2>
              </div>
            </div>
            <form className="form-grid" onSubmit={handleEventSubmit}>
              <label>
                Group
                <select
                  value={eventForm.groupId}
                  onChange={(e) => setEventForm((f) => ({ ...f, groupId: e.target.value }))}
                  disabled={groups.length === 0}
                  required
                >
                  <option value="">Select a group</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Event title
                <input
                  value={eventForm.title}
                  onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Friday campfire set"
                  required
                />
              </label>
              <label>
                Description
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Casual acoustic set and shared snacks."
                  rows={2}
                />
              </label>
              <label>
                Location
                <input
                  value={eventForm.location}
                  onChange={(e) => setEventForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="North Grove"
                />
              </label>
              <label>
                Map link
                <input
                  type="url"
                  value={eventForm.mapLink}
                  onChange={(e) => setEventForm((f) => ({ ...f, mapLink: e.target.value }))}
                  placeholder="https://maps.google.com/…"
                />
              </label>
              <label>
                Map embed
                <input
                  type="text"
                  value={eventForm.mapEmbed}
                  onChange={(e) =>
                    setEventForm((f) => ({ ...f, mapEmbed: extractMapEmbedSrc(e.target.value) }))
                  }
                  placeholder="Paste the Google Maps embed code or src= URL"
                />
                <span className="field-hint">Google Maps → Share → Embed a map → paste the full embed code or just the src= URL</span>
              </label>
              <div className="date-grid">
                <DatePicker
                  label="Arrival"
                  value={eventForm.arrivalDate}
                  onChange={(v) => setEventForm((f) => ({ ...f, arrivalDate: v }))}
                  placeholder="TBD — leave blank to vote later"
                />
                <label>
                  How many nights?
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={eventForm.nights}
                    onChange={(e) => setEventForm((f) => ({ ...f, nights: e.target.value }))}
                    placeholder="e.g. 3"
                  />
                </label>
              </div>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={eventForm.isPotluck}
                  onChange={(e) => setEventForm((f) => ({ ...f, isPotluck: e.target.checked }))}
                />
                Potluck — everyone brings a dish
              </label>
              {eventState.error ? <p className="form-error">{eventState.error}</p> : null}
              <button type="submit" disabled={eventState.loading || groups.length === 0}>
                {eventState.loading ? "Creating…" : "Create event"}
              </button>
            </form>
          </section>
        </div>

        {/* Right column: events + groups */}
        <div className="stack">
          {/* Events panel */}
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-label">Upcoming events</p>
                <h2>What&apos;s on the calendar</h2>
              </div>
              <div className="panel-controls">
                <div className="view-toggle">
                  <button
                    type="button"
                    className={`view-btn ${viewMode === "week" ? "view-btn--active" : ""}`}
                    onClick={() => setViewMode("week")}
                  >
                    Week
                  </button>
                  <button
                    type="button"
                    className={`view-btn ${viewMode === "list" ? "view-btn--active" : ""}`}
                    onClick={() => setViewMode("list")}
                  >
                    List
                  </button>
                </div>
                <div className="view-toggle">
                  <button
                    type="button"
                    className={`view-btn ${rsvpFilter === "all" ? "view-btn--active" : ""}`}
                    onClick={() => {
                      setRsvpFilter("all");
                      localStorage.setItem("rsvpFilter", "all");
                    }}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className={`view-btn ${rsvpFilter === "mine" ? "view-btn--active" : ""}`}
                    onClick={() => {
                      setRsvpFilter("mine");
                      localStorage.setItem("rsvpFilter", "mine");
                    }}
                  >
                    My RSVPs
                  </button>
                </div>
              </div>
            </div>

            {filteredUpcoming.length === 0 ? (
              <p className="empty-state">
                {rsvpFilter === "mine" ? "No events you've responded to yet." : "No confirmed events yet."}
              </p>
            ) : viewMode === "week" ? (
              <WeekView events={scheduledEvents} />
            ) : (
              <div className="event-list">
                {filteredUpcoming.map((event) => (
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
            )}
          </section>

          {/* TBD events panel */}
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

          {/* Groups panel */}
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-label">Groups</p>
                <h2>Current meetup hosts</h2>
              </div>
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
        </div>
      </div>

      {/* Edit event modal */}
      {editingType === "event" && editingId !== null ? (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <p className="panel-label">Edit event</p>
            <h2>Update event details</h2>
            <form className="form-grid" onSubmit={handleEditEventSubmit}>
              <label>
                Event title
                <input
                  value={editEventForm.title}
                  onChange={(e) => setEditEventForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />
              </label>
              <label>
                Description
                <textarea
                  value={editEventForm.description}
                  onChange={(e) => setEditEventForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                />
              </label>
              <label>
                Location
                <input
                  value={editEventForm.location}
                  onChange={(e) => setEditEventForm((f) => ({ ...f, location: e.target.value }))}
                />
              </label>
              <label>
                Map link
                <input
                  type="url"
                  value={editEventForm.mapLink}
                  onChange={(e) => setEditEventForm((f) => ({ ...f, mapLink: e.target.value }))}
                  placeholder="https://maps.google.com/…"
                />
              </label>
              <label>
                Map embed
                <input
                  type="text"
                  value={editEventForm.mapEmbed}
                  onChange={(e) =>
                    setEditEventForm((f) => ({ ...f, mapEmbed: extractMapEmbedSrc(e.target.value) }))
                  }
                  placeholder="Paste the Google Maps embed code or src= URL"
                />
                <span className="field-hint">Google Maps → Share → Embed a map → paste the full embed code or just the src= URL</span>
              </label>
              <div className="date-grid">
                <DatePicker
                  label="Arrival"
                  value={editEventForm.arrivalDate}
                  onChange={(v) => setEditEventForm((f) => ({ ...f, arrivalDate: v }))}
                  placeholder="TBD — leave blank to vote later"
                />
                <label>
                  How many nights?
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={editEventForm.nights}
                    onChange={(e) => setEditEventForm((f) => ({ ...f, nights: e.target.value }))}
                    placeholder="e.g. 3"
                  />
                </label>
              </div>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={editEventForm.isPotluck}
                  onChange={(e) => setEditEventForm((f) => ({ ...f, isPotluck: e.target.checked }))}
                />
                Potluck — everyone brings a dish
              </label>
              {editState.error ? <p className="form-error">{editState.error}</p> : null}
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" disabled={editState.loading}>
                  {editState.loading ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Edit group modal */}
      {editingType === "group" && editingId !== null ? (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <p className="panel-label">Edit group</p>
            <h2>Rename group</h2>
            <form className="form-grid" onSubmit={handleEditGroupSubmit}>
              <label>
                Group name
                <input
                  value={editGroupForm.name}
                  onChange={(e) => setEditGroupForm({ name: e.target.value })}
                  required
                />
              </label>
              {editState.error ? <p className="form-error">{editState.error}</p> : null}
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" disabled={editState.loading}>
                  {editState.loading ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .warning-card {
          margin-bottom: 24px;
          padding: 20px;
          border: 1px solid rgba(215, 185, 127, 0.35);
          border-radius: 20px;
          background: rgba(13, 28, 23, 0.74);
        }

        .warning-card pre {
          overflow-x: auto;
          white-space: pre-wrap;
          background: rgba(0, 0, 0, 0.25);
          padding: 12px;
          border-radius: 12px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          border: 1px solid rgba(243, 235, 220, 0.12);
          background: rgba(13, 28, 23, 0.74);
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 20px;
        }

        .stat-card span {
          display: block;
          color: #c9c2b3;
          margin-bottom: 8px;
          font-size: 0.88rem;
        }

        .stat-card strong {
          font-size: 1.4rem;
        }

        .content-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
          gap: 16px;
          align-items: start;
        }

        .stack {
          display: grid;
          gap: 16px;
        }

        .panel {
          border: 1px solid rgba(243, 235, 220, 0.12);
          background: rgba(13, 28, 23, 0.74);
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(10px);
          border-radius: 28px;
          padding: 24px;
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
          font-size: 0.78rem;
          color: #d7b97f;
          margin: 0 0 6px;
        }

        h2 {
          margin: 0;
          font-size: 1.2rem;
        }

        .panel-controls {
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: flex-end;
          flex-shrink: 0;
        }

        .view-toggle {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
        }

        .view-btn {
          font-family: inherit;
          font-size: 0.78rem;
          padding: 5px 10px;
          border-radius: 999px;
          border: 1px solid rgba(243, 235, 220, 0.2);
          background: transparent;
          color: #c9c2b3;
          cursor: pointer;
        }

        .view-btn:hover {
          border-color: rgba(243, 235, 220, 0.4);
          color: #f3ebdc;
        }

        .view-btn--active {
          background: rgba(215, 185, 127, 0.2);
          border-color: #d7b97f;
          color: #f4dcb0;
        }

        .form-grid {
          display: grid;
          gap: 14px;
        }

        label {
          display: grid;
          gap: 8px;
          font-size: 0.95rem;
          color: #e6dfd0;
        }

        .field-hint {
          font-size: 0.8rem;
          color: #8a847a;
        }

        input,
        select,
        textarea,
        button,
        a {
          font: inherit;
        }

        input,
        select,
        textarea {
          width: 100%;
          border: 1px solid rgba(243, 235, 220, 0.14);
          border-radius: 16px;
          background: rgba(5, 11, 9, 0.5);
          color: #f3ebdc;
          padding: 12px 14px;
        }

        textarea {
          resize: vertical;
        }

        button[type="submit"],
        button[type="button"]:not(.view-btn):not(.btn-ghost) {
          border: 0;
          border-radius: 999px;
          padding: 14px 18px;
          background: linear-gradient(135deg, #d7b97f, #b98545);
          color: #10231d;
          font-weight: 700;
          cursor: pointer;
          width: 100%;
        }

        button:disabled {
          cursor: wait;
          opacity: 0.7;
        }

        .btn-ghost {
          background: transparent;
          border: 1px solid rgba(243, 235, 220, 0.2);
          color: #c9c2b3;
          font-weight: 400;
          padding: 14px 18px;
          border-radius: 999px;
          cursor: pointer;
          width: 100%;
        }

        .btn-ghost:hover {
          border-color: rgba(243, 235, 220, 0.4);
          color: #f3ebdc;
        }

        .date-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .event-list,
        .group-list {
          display: grid;
          gap: 12px;
        }

        .empty-state {
          color: #8a847a;
          margin: 0;
          font-size: 0.9rem;
        }

        .form-error {
          color: #f0a090;
          margin: 0;
          font-size: 0.9rem;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.95rem;
          color: #e6dfd0;
          cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
          width: auto;
          accent-color: #d7b97f;
          cursor: pointer;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 100;
        }

        .modal {
          width: 100%;
          max-width: 540px;
          max-height: 90vh;
          overflow-y: auto;
          border: 1px solid rgba(243, 235, 220, 0.12);
          background: #0d1c17;
          box-shadow: 0 40px 80px rgba(0, 0, 0, 0.5);
          border-radius: 28px;
          padding: 32px;
        }

        .modal h2 {
          margin-bottom: 20px;
        }

        .modal-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        @media (max-width: 1024px) {
          .content-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .date-grid,
          .modal-actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AppShell>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) return { redirect: { destination: "/login", permanent: false } };
  if (!session.user.name) return { redirect: { destination: "/profile", permanent: false } };

  const data = await getHomePageData(session.user.id);
  return { props: { ...data, userId: session.user.id } };
};
