import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { FormEvent, useState } from "react";

import { getHomePageData } from "../lib/home-data";

type Props = InferGetServerSidePropsType<typeof getServerSideProps>;

const initialGroupForm = {
  name: "",
  adminName: "",
  adminEmail: "",
};

const initialEventForm = {
  groupId: "",
  title: "",
  description: "",
  location: "",
  mapLink: "",
  dateOption1: "",
  dateOption2: "",
  dateOption3: "",
};

function formatDate(value: string | null) {
  if (!value) {
    return "No date options yet";
  }

  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function Home({ databaseReady, databaseMessage, groups, events }: Props) {
  const router = useRouter();
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
    await router.replace(router.asPath);
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
    await router.replace(router.asPath);
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
            <strong>{events[0] ? formatDate(events[0].nextDate) : "None scheduled"}</strong>
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
                <label>
                  Host name
                  <input
                    value={groupForm.adminName}
                    onChange={(event) =>
                      setGroupForm((current) => ({ ...current, adminName: event.target.value }))
                    }
                    placeholder="Alex"
                  />
                </label>
                <label>
                  Host email
                  <input
                    type="email"
                    value={groupForm.adminEmail}
                    onChange={(event) =>
                      setGroupForm((current) => ({ ...current, adminEmail: event.target.value }))
                    }
                    placeholder="alex@example.com"
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
                <div className="date-grid">
                  <label>
                    Date option 1
                    <input
                      type="datetime-local"
                      value={eventForm.dateOption1}
                      onChange={(event) =>
                        setEventForm((current) => ({ ...current, dateOption1: event.target.value }))
                      }
                      required
                    />
                  </label>
                  <label>
                    Date option 2
                    <input
                      type="datetime-local"
                      value={eventForm.dateOption2}
                      onChange={(event) =>
                        setEventForm((current) => ({ ...current, dateOption2: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Date option 3
                    <input
                      type="datetime-local"
                      value={eventForm.dateOption3}
                      onChange={(event) =>
                        setEventForm((current) => ({ ...current, dateOption3: event.target.value }))
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
                {events.length === 0 ? (
                  <p className="empty-state">
                    No meetups yet. Create a group first, then add your first event with one or
                    more date options.
                  </p>
                ) : (
                  events.map((event) => (
                    <article key={event.id} className="event-card">
                      <div className="event-header">
                        <div>
                          <p className="event-group">{event.groupName}</p>
                          <h3>{event.title}</h3>
                        </div>
                        <span className="pill">{event.rsvpCount} RSVPs</span>
                      </div>
                      {event.description ? <p>{event.description}</p> : null}
                      <dl className="event-meta">
                        <div>
                          <dt>Next option</dt>
                          <dd>{formatDate(event.nextDate)}</dd>
                        </div>
                        <div>
                          <dt>Location</dt>
                          <dd>{event.location || "TBD"}</dd>
                        </div>
                      </dl>
                      <ul className="date-list">
                        {event.dateOptions.map((date) => (
                          <li key={date}>{formatDate(date)}</li>
                        ))}
                      </ul>
                      {event.mapLink ? (
                        <a href={event.mapLink} target="_blank" rel="noreferrer">
                          Open map
                        </a>
                      ) : null}
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
                        <h3>{group.name}</h3>
                        <p>
                          Hosted by {group.adminName} · {group.adminEmail}
                        </p>
                      </div>
                      <span className="pill">{group.eventCount} events</span>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        </section>
      </main>
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

        .date-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
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

        .event-header,
        .group-card {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
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
          grid-template-columns: repeat(2, minmax(0, 1fr));
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

        .date-list {
          margin: 0 0 12px;
          padding-left: 18px;
          color: #d4d0c7;
        }

        .empty-state,
        .form-error {
          color: #f0d3a5;
        }

        a {
          color: #f4dcb0;
        }

        @media (max-width: 960px) {
          .stats-grid,
          .content-grid,
          .date-grid,
          .event-meta {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  const data = await getHomePageData();

  return {
    props: data,
  };
};
