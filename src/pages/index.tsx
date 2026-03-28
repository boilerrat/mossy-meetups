import { getServerSession } from "next-auth/next";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Head from "next/head";
import Link from "next/link";
import { FormEvent, useState } from "react";

import { authOptions } from "../lib/auth";
import { getHomePageData } from "../lib/home-data";
import { RSVPButton, type RSVPStatus } from "../components/RSVPButton";

type Props = InferGetServerSidePropsType<typeof getServerSideProps>;

const initialGroupForm = {
  name: "",
};

const initialEventForm = {
  groupId: "",
  title: "",
  description: "",
  location: "",
  mapLink: "",
  mapEmbed: "",
  arrivalDate: "",
  departureDate: "",
};

function formatDate(value: string | null) {
  if (!value) {
    return "TBD";
  }

  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

// Convert ISO string (UTC) to datetime-local input value (local time)
function isoToDatetimeLocal(iso: string) {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function Home({ databaseReady, databaseMessage, groups, events, userId }: Props) {
  const [groupForm, setGroupForm] = useState(initialGroupForm);
  const [eventForm, setEventForm] = useState({
    ...initialEventForm,
    groupId: groups[0]?.id || "",
  });
  const [groupState, setGroupState] = useState<{ loading: boolean; error: string | null }>({
    loading: false,
    error: null,
  });
  const [eventState, setEventState] = useState<{ loading: boolean; error: string | null }>({
    loading: false,
    error: null,
  });

  // Edit modal state
  const [editingType, setEditingType] = useState<"event" | "group" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEventForm, setEditEventForm] = useState({ ...initialEventForm });
  const [editGroupForm, setEditGroupForm] = useState({ name: "" });
  const [editState, setEditState] = useState<{ loading: boolean; error: string | null }>({
    loading: false,
    error: null,
  });

  const [localEvents, setLocalEvents] = useState(events);

  function handleRsvpChange(eventId: string, newStatus: RSVPStatus, hadPreviousRsvp: boolean) {
    setLocalEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? {
              ...e,
              userRsvpStatus: newStatus,
              rsvpCount: hadPreviousRsvp ? e.rsvpCount : e.rsvpCount + 1,
            }
          : e
      )
    );
  }

  function openEditEvent(event: Props["events"][0]) {
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
      departureDate: event.departureDate ? isoToDatetimeLocal(event.departureDate) : "",
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
    const response = await fetch(`/api/events/${id}`, { method: "DELETE" });
    if (response.ok) {
      window.location.reload();
    }
  }

  async function handleDeleteGroup(id: string) {
    if (!window.confirm("Delete this group and all its events? This cannot be undone.")) return;
    const response = await fetch(`/api/groups/${id}`, { method: "DELETE" });
    if (response.ok) {
      window.location.reload();
    }
  }

  async function handleEditEventSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingId) return;
    setEditState({ loading: true, error: null });

    const response = await fetch(`/api/events/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editEventForm),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Failed to save" }));
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

    const response = await fetch(`/api/groups/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editGroupForm),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Failed to save" }));
      setEditState({ loading: false, error: payload.error || "Failed to save" });
      return;
    }

    closeModal();
    window.location.reload();
  }

  async function handleGroupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGroupState({ loading: true, error: null });

    const response = await fetch("/api/groups", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(groupForm),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Failed to create group" }));
      setGroupState({ loading: false, error: payload.error || "Failed to create group" });
      return;
    }

    setGroupForm(initialGroupForm);
    window.location.reload();
  }

  async function handleEventSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEventState({ loading: true, error: null });

    const response = await fetch("/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventForm),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Failed to create event" }));
      setEventState({ loading: false, error: payload.error || "Failed to create event" });
      return;
    }

    setEventForm({
      ...initialEventForm,
      groupId: groups[0]?.id || "",
    });
    window.location.reload();
  }

  return (
    <>
      <Head>
        <title>Mossy Meetups</title>
        <meta
          name="description"
          content="Plan camp meetups, coordinate date options, and keep track of RSVP activity."
        />
      </Head>
      <main className="page-shell">
        <section className="hero">
          <p className="eyebrow">Mossy Meetups</p>
          <h1>Start planning camp meetups instead of passing spreadsheets around.</h1>
          <p className="lede">
            This first slice gives you real groups, real events, and real date options backed by
            Prisma and PostgreSQL.
          </p>
        </section>

        {!databaseReady ? (
          <section className="warning-card">
            <h2>Database not ready</h2>
            <p>
              The UI is live, but the database query failed. Run Prisma against your configured
              database and reload the page.
            </p>
            {databaseMessage ? <pre>{databaseMessage}</pre> : null}
          </section>
        ) : null}

        <section className="stats-grid">
          <article className="stat-card">
            <span>Groups</span>
            <strong>{groups.length}</strong>
          </article>
          <article className="stat-card">
            <span>Upcoming events</span>
            <strong>{events.length}</strong>
          </article>
          <article className="stat-card">
            <span>Next meetup</span>
            <strong>{events[0] ? formatDate(events[0].arrivalDate) : "None scheduled"}</strong>
          </article>
        </section>

        <section className="content-grid">
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
                    onChange={(event) =>
                      setGroupForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Boilerhaus Camp Crew"
                    required
                  />
                </label>
                {groupState.error ? <p className="form-error">{groupState.error}</p> : null}
                <button type="submit" disabled={groupState.loading}>
                  {groupState.loading ? "Creating group..." : "Create group"}
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
                    onChange={(event) =>
                      setEventForm((current) => ({ ...current, groupId: event.target.value }))
                    }
                    disabled={groups.length === 0}
                    required
                  >
                    <option value="">Select a group</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Event title
                  <input
                    value={eventForm.title}
                    onChange={(event) =>
                      setEventForm((current) => ({ ...current, title: event.target.value }))
                    }
                    placeholder="Friday campfire set"
                    required
                  />
                </label>
                <label>
                  Description
                  <textarea
                    value={eventForm.description}
                    onChange={(event) =>
                      setEventForm((current) => ({ ...current, description: event.target.value }))
                    }
                    placeholder="Casual acoustic set and shared snacks."
                    rows={3}
                  />
                </label>
                <label>
                  Location
                  <input
                    value={eventForm.location}
                    onChange={(event) =>
                      setEventForm((current) => ({ ...current, location: event.target.value }))
                    }
                    placeholder="North Grove"
                  />
                </label>
                <label>
                  Map link
                  <input
                    type="url"
                    value={eventForm.mapLink}
                    onChange={(event) =>
                      setEventForm((current) => ({ ...current, mapLink: event.target.value }))
                    }
                    placeholder="https://maps.google.com/..."
                  />
                </label>
                <label>
                  Map embed URL
                  <input
                    type="url"
                    value={eventForm.mapEmbed}
                    onChange={(event) =>
                      setEventForm((current) => ({ ...current, mapEmbed: event.target.value }))
                    }
                    placeholder="https://www.google.com/maps/embed?pb=..."
                  />
                  <span className="field-hint">
                    Google Maps → Share → Embed a map → copy the src= URL
                  </span>
                </label>
                <div className="date-grid">
                  <label>
                    Arrival
                    <input
                      type="datetime-local"
                      value={eventForm.arrivalDate}
                      onChange={(event) =>
                        setEventForm((current) => ({
                          ...current,
                          arrivalDate: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>
                  <label>
                    Departure
                    <input
                      type="datetime-local"
                      value={eventForm.departureDate}
                      onChange={(event) =>
                        setEventForm((current) => ({
                          ...current,
                          departureDate: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
                {eventState.error ? <p className="form-error">{eventState.error}</p> : null}
                <button type="submit" disabled={eventState.loading || groups.length === 0}>
                  {eventState.loading ? "Creating event..." : "Create event"}
                </button>
              </form>
            </section>
          </div>

          <div className="stack">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="panel-label">Upcoming events</p>
                  <h2>What people can actually RSVP to</h2>
                </div>
              </div>
              <div className="event-list">
                {localEvents.length === 0 ? (
                  <p className="empty-state">
                    No meetups yet. Create a group first, then add your first event.
                  </p>
                ) : (
                  localEvents.map((event) => (
                    <article key={event.id} className="event-card">
                      <div className="event-header">
                        <div>
                          <p className="event-group">{event.groupName}</p>
                          <h3>{event.title}</h3>
                        </div>
                        <div className="card-right">
                          <span className="pill">{event.rsvpCount} RSVPs</span>
                          {event.groupAdminId === userId ? (
                            <div className="card-actions">
                              <button
                                className="btn-icon"
                                onClick={() => openEditEvent(event)}
                                aria-label="Edit event"
                              >
                                Edit
                              </button>
                              <button
                                className="btn-icon btn-danger"
                                onClick={() => handleDeleteEvent(event.id)}
                                aria-label="Delete event"
                              >
                                Delete
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                      {event.description ? <p>{event.description}</p> : null}
                      <dl className="event-meta">
                        <div>
                          <dt>Arrival</dt>
                          <dd>{formatDate(event.arrivalDate)}</dd>
                        </div>
                        <div>
                          <dt>Departure</dt>
                          <dd>{event.departureDate ? formatDate(event.departureDate) : "TBD"}</dd>
                        </div>
                        <div>
                          <dt>Location</dt>
                          <dd>{event.location || "TBD"}</dd>
                        </div>
                      </dl>
                      {event.mapLink ? (
                        <a href={event.mapLink} target="_blank" rel="noreferrer">
                          Open map ↗
                        </a>
                      ) : null}
                      {event.mapEmbed ? (
                        <iframe
                          src={event.mapEmbed}
                          className="map-embed"
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          title={`Map for ${event.title}`}
                        />
                      ) : null}
                      <div className="card-footer">
                        <RSVPButton
                          eventId={event.id}
                          initialStatus={event.userRsvpStatus as RSVPStatus | null}
                          onStatusChange={(s, had) => handleRsvpChange(event.id, s, had)}
                        />
                        <Link href={`/events/${event.id}`} className="detail-link">
                          Details →
                        </Link>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="panel-label">Groups</p>
                  <h2>Current meetup hosts</h2>
                </div>
              </div>
              <div className="group-list">
                {groups.length === 0 ? (
                  <p className="empty-state">No groups yet.</p>
                ) : (
                  groups.map((group) => (
                    <article key={group.id} className="group-card">
                      <div>
                        <h3>
                          <Link href={`/groups/${group.id}`} className="group-link">
                            {group.name}
                          </Link>
                        </h3>
                        <p>
                          Hosted by {group.adminName} · {group.adminEmail}
                        </p>
                      </div>
                      <div className="card-right">
                        <span className="pill">{group.eventCount} events</span>
                        {group.adminId === userId ? (
                          <div className="card-actions">
                            <button
                              className="btn-icon"
                              onClick={() => openEditGroup(group)}
                              aria-label="Edit group"
                            >
                              Edit
                            </button>
                            <button
                              className="btn-icon btn-danger"
                              onClick={() => handleDeleteGroup(group.id)}
                              aria-label="Delete group"
                            >
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        </section>
      </main>

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
                  onChange={(e) =>
                    setEditEventForm((f) => ({ ...f, title: e.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Description
                <textarea
                  value={editEventForm.description}
                  onChange={(e) =>
                    setEditEventForm((f) => ({ ...f, description: e.target.value }))
                  }
                  rows={3}
                />
              </label>
              <label>
                Location
                <input
                  value={editEventForm.location}
                  onChange={(e) =>
                    setEditEventForm((f) => ({ ...f, location: e.target.value }))
                  }
                />
              </label>
              <label>
                Map link
                <input
                  type="url"
                  value={editEventForm.mapLink}
                  onChange={(e) =>
                    setEditEventForm((f) => ({ ...f, mapLink: e.target.value }))
                  }
                  placeholder="https://maps.google.com/..."
                />
              </label>
              <label>
                Map embed URL
                <input
                  type="url"
                  value={editEventForm.mapEmbed}
                  onChange={(e) =>
                    setEditEventForm((f) => ({ ...f, mapEmbed: e.target.value }))
                  }
                  placeholder="https://www.google.com/maps/embed?pb=..."
                />
                <span className="field-hint">
                  Google Maps → Share → Embed a map → copy the src= URL
                </span>
              </label>
              <div className="date-grid">
                <label>
                  Arrival
                  <input
                    type="datetime-local"
                    value={editEventForm.arrivalDate}
                    onChange={(e) =>
                      setEditEventForm((f) => ({ ...f, arrivalDate: e.target.value }))
                    }
                    required
                  />
                </label>
                <label>
                  Departure
                  <input
                    type="datetime-local"
                    value={editEventForm.departureDate}
                    onChange={(e) =>
                      setEditEventForm((f) => ({ ...f, departureDate: e.target.value }))
                    }
                  />
                </label>
              </div>
              {editState.error ? <p className="form-error">{editState.error}</p> : null}
              <div className="modal-actions">
                <button type="submit" disabled={editState.loading}>
                  {editState.loading ? "Saving..." : "Save changes"}
                </button>
                <button type="button" className="btn-ghost" onClick={closeModal}>
                  Cancel
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
            <h2>Update group name</h2>
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
                <button type="submit" disabled={editState.loading}>
                  {editState.loading ? "Saving..." : "Save changes"}
                </button>
                <button type="button" className="btn-ghost" onClick={closeModal}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        :global(body) {
          margin: 0;
          font-family: Georgia, "Times New Roman", serif;
          background:
            radial-gradient(circle at top, rgba(245, 201, 120, 0.22), transparent 30%),
            linear-gradient(180deg, #10231d 0%, #0a1512 55%, #07100d 100%);
          color: #f3ebdc;
        }

        :global(*) {
          box-sizing: border-box;
        }

        .page-shell {
          min-height: 100vh;
          max-width: 1200px;
          margin: 0 auto;
          padding: 48px 20px 64px;
        }

        .hero {
          max-width: 780px;
          margin-bottom: 32px;
        }

        .eyebrow,
        .panel-label,
        .event-group {
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 0.78rem;
          color: #d7b97f;
        }

        h1 {
          margin: 12px 0 16px;
          font-size: clamp(2.5rem, 6vw, 5.2rem);
          line-height: 0.96;
          max-width: 10ch;
        }

        h2,
        h3,
        p {
          margin-top: 0;
        }

        .lede {
          max-width: 62ch;
          color: #d4d0c7;
          font-size: 1.05rem;
        }

        .warning-card,
        .stat-card,
        .panel,
        .event-card,
        .group-card {
          border: 1px solid rgba(243, 235, 220, 0.12);
          background: rgba(13, 28, 23, 0.74);
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(10px);
        }

        .warning-card {
          margin-bottom: 24px;
          padding: 20px;
          border-color: rgba(215, 185, 127, 0.35);
        }

        .warning-card pre {
          overflow-x: auto;
          white-space: pre-wrap;
          background: rgba(0, 0, 0, 0.25);
          padding: 12px;
          border-radius: 12px;
        }

        .stats-grid,
        .content-grid,
        .date-grid {
          display: grid;
          gap: 16px;
        }

        .stats-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
          margin-bottom: 24px;
        }

        .stat-card {
          border-radius: 20px;
          padding: 20px;
        }

        .stat-card span {
          display: block;
          color: #c9c2b3;
          margin-bottom: 8px;
        }

        .stat-card strong {
          font-size: 1.4rem;
        }

        .content-grid {
          grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
          align-items: start;
        }

        .stack {
          display: grid;
          gap: 16px;
        }

        .panel {
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

        button {
          border: 0;
          border-radius: 999px;
          padding: 14px 18px;
          background: linear-gradient(135deg, #d7b97f, #b98545);
          color: #10231d;
          font-weight: 700;
          cursor: pointer;
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
        }

        .btn-ghost:hover {
          border-color: rgba(243, 235, 220, 0.4);
          color: #f3ebdc;
        }

        .btn-icon {
          background: rgba(243, 235, 220, 0.08);
          color: #c9c2b3;
          font-size: 0.78rem;
          font-weight: 400;
          padding: 5px 10px;
          border-radius: 999px;
        }

        .btn-icon:hover {
          background: rgba(243, 235, 220, 0.14);
          color: #f3ebdc;
        }

        .btn-danger {
          color: #f0a090;
        }

        .btn-danger:hover {
          background: rgba(240, 100, 80, 0.15);
          color: #f4c4b8;
        }

        .date-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .event-list,
        .group-list {
          display: grid;
          gap: 14px;
        }

        .event-card,
        .group-card {
          border-radius: 20px;
          padding: 18px;
        }

        .event-header {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 10px;
        }

        .group-card {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }

        .card-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
          flex-shrink: 0;
        }

        .card-actions {
          display: flex;
          gap: 6px;
        }

        .pill {
          white-space: nowrap;
          border-radius: 999px;
          padding: 6px 10px;
          background: rgba(215, 185, 127, 0.15);
          color: #f4dcb0;
          font-size: 0.82rem;
        }

        .event-meta {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin: 14px 0;
        }

        .event-meta dt {
          color: #c9c2b3;
          font-size: 0.82rem;
          margin-bottom: 4px;
        }

        .event-meta dd {
          margin: 0;
        }

        .map-embed {
          display: block;
          width: 100%;
          height: 200px;
          border: 0;
          border-radius: 12px;
          margin-top: 10px;
        }

        .card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(243, 235, 220, 0.08);
        }

        .detail-link {
          font-size: 0.82rem;
          color: #c9c2b3;
          text-decoration: none;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .detail-link:hover {
          color: #f3ebdc;
        }

        .empty-state,
        .form-error {
          color: #f0d3a5;
        }

        a {
          color: #f4dcb0;
        }

        .group-link {
          color: #f3ebdc;
          text-decoration: none;
        }

        .group-link:hover {
          color: #d7b97f;
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

        @media (max-width: 960px) {
          .stats-grid,
          .content-grid,
          .date-grid,
          .event-meta,
          .modal-actions {
            grid-template-columns: 1fr;
          }

          .event-meta {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  if (!session.user.name) {
    return { redirect: { destination: "/profile", permanent: false } };
  }

  const data = await getHomePageData(session.user.id);

  return {
    props: {
      ...data,
      userId: session.user.id,
    },
  };
};
