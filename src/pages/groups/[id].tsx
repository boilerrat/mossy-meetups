import { getServerSession } from "next-auth/next";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Head from "next/head";
import Link from "next/link";
import { FormEvent, useState } from "react";

import { authOptions } from "../../lib/auth";
import { getPrismaClient } from "../../lib/prisma";
import { RSVPButton, type RSVPStatus } from "../../components/RSVPButton";

type Props = InferGetServerSidePropsType<typeof getServerSideProps>;

function formatDate(value: string | null) {
  if (!value) return "TBD";
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function GroupPage({ group, isAdmin, userId }: Props) {
  const [localEvents, setLocalEvents] = useState(group.events);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteState, setInviteState] = useState<{
    loading: boolean;
    error: string | null;
    sent: boolean;
  }>({ loading: false, error: null, sent: false });

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

  async function handleInvite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setInviteState({ loading: true, error: null, sent: false });

    const response = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: group.id, email: inviteEmail }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Failed to send invite" }));
      setInviteState({ loading: false, error: payload.error || "Failed to send invite", sent: false });
      return;
    }

    setInviteEmail("");
    setInviteState({ loading: false, error: null, sent: true });
  }

  return (
    <>
      <Head>
        <title>{group.name} — Mossy Meetups</title>
      </Head>
      <main className="shell">
        <div className="page">
          <nav className="breadcrumb">
            <Link href="/">← Dashboard</Link>
          </nav>

          <header className="group-header">
            <p className="eyebrow">Group</p>
            <h1>{group.name}</h1>
            <p className="meta">Hosted by {group.adminName}</p>
          </header>

          <div className="content-grid">
            <div className="stack">
              {/* Events */}
              <section className="panel">
                <div className="panel-heading">
                  <p className="panel-label">Events</p>
                  <h2>{group.name} meetups</h2>
                </div>
                {localEvents.length === 0 ? (
                  <p className="empty-state">No events yet.</p>
                ) : (
                  <div className="event-list">
                    {localEvents.map((event) => (
                      <article key={event.id} className="event-card">
                        <div className="event-header">
                          <div>
                            <h3>{event.title}</h3>
                            {event.description ? (
                              <p className="event-desc">{event.description}</p>
                            ) : null}
                          </div>
                          <span className="pill">{event.rsvpCount} RSVPs</span>
                        </div>
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
                        {event.mapEmbed ? (
                          <iframe
                            src={event.mapEmbed}
                            className="map-embed"
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            title={`Map for ${event.title}`}
                          />
                        ) : null}
                        {event.mapLink ? (
                          <a href={event.mapLink} target="_blank" rel="noreferrer">
                            Open map ↗
                          </a>
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
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className="stack">
              {/* Members */}
              <section className="panel">
                <div className="panel-heading">
                  <p className="panel-label">Members</p>
                  <h2>{group.members.length} {group.members.length === 1 ? "person" : "people"}</h2>
                </div>
                <ul className="member-list">
                  {group.members.map((member) => (
                    <li key={member.email} className="member-row">
                      <div>
                        <strong>{member.name || member.email}</strong>
                        {member.name ? <span className="member-email">{member.email}</span> : null}
                        {member.hometown ? (
                          <span className="member-detail">{member.hometown}</span>
                        ) : null}
                      </div>
                      <div className="member-badges">
                        {member.isAdmin ? <span className="badge">admin</span> : null}
                        {member.status === "pending" ? (
                          <span className="badge badge-pending">pending</span>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Invite form — admin only */}
              {isAdmin ? (
                <section className="panel">
                  <div className="panel-heading">
                    <p className="panel-label">Invite</p>
                    <h2>Add a member</h2>
                  </div>
                  <form className="form-grid" onSubmit={handleInvite}>
                    <label>
                      Email address
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="friend@example.com"
                        required
                      />
                    </label>
                    {inviteState.error ? (
                      <p className="form-error">{inviteState.error}</p>
                    ) : null}
                    {inviteState.sent ? (
                      <p className="form-success">Invite sent! They will get an email with a link to join.</p>
                    ) : null}
                    <button type="submit" disabled={inviteState.loading}>
                      {inviteState.loading ? "Sending..." : "Send invite"}
                    </button>
                  </form>
                </section>
              ) : null}

              {/* Pending invites — admin only */}
              {isAdmin && group.pendingInvites.length > 0 ? (
                <section className="panel">
                  <div className="panel-heading">
                    <p className="panel-label">Pending</p>
                    <h2>Awaiting response</h2>
                  </div>
                  <ul className="member-list">
                    {group.pendingInvites.map((invite) => (
                      <li key={invite.email} className="member-row">
                        <span>{invite.email}</span>
                        <span className="badge badge-pending">pending</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          </div>
        </div>
      </main>
      <style jsx>{`
        :global(body) {
          margin: 0;
          font-family: Georgia, "Times New Roman", serif;
          background: radial-gradient(circle at top, rgba(245, 201, 120, 0.22), transparent 30%),
            linear-gradient(180deg, #10231d 0%, #0a1512 55%, #07100d 100%);
          color: #f3ebdc;
          min-height: 100vh;
        }

        :global(*) {
          box-sizing: border-box;
        }

        .shell {
          min-height: 100vh;
          padding: 40px 20px 64px;
        }

        .page {
          max-width: 1100px;
          margin: 0 auto;
        }

        .breadcrumb {
          margin-bottom: 24px;
        }

        .breadcrumb a {
          color: #c9c2b3;
          text-decoration: none;
          font-size: 0.9rem;
        }

        .breadcrumb a:hover {
          color: #f3ebdc;
        }

        .group-header {
          margin-bottom: 32px;
        }

        .eyebrow,
        .panel-label {
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 0.78rem;
          color: #d7b97f;
          margin: 0 0 8px;
        }

        h1 {
          margin: 0 0 6px;
          font-size: clamp(2rem, 5vw, 3.5rem);
          line-height: 1;
        }

        h2,
        h3,
        p {
          margin-top: 0;
        }

        .meta {
          color: #c9c2b3;
          margin: 0;
        }

        .content-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
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
          margin-bottom: 18px;
        }

        .event-list {
          display: grid;
          gap: 14px;
        }

        .event-card {
          border: 1px solid rgba(243, 235, 220, 0.1);
          border-radius: 18px;
          padding: 16px;
        }

        .event-header {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 10px;
        }

        .event-desc {
          color: #c9c2b3;
          font-size: 0.9rem;
          margin: 4px 0 0;
        }

        .event-meta {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin: 0 0 10px;
        }

        .event-meta dt {
          color: #c9c2b3;
          font-size: 0.82rem;
          margin-bottom: 3px;
        }

        .event-meta dd {
          margin: 0;
          font-size: 0.9rem;
        }

        .map-embed {
          display: block;
          width: 100%;
          height: 180px;
          border: 0;
          border-radius: 12px;
          margin-bottom: 10px;
        }

        .card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 10px;
          padding-top: 10px;
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

        .pill {
          white-space: nowrap;
          border-radius: 999px;
          padding: 5px 10px;
          background: rgba(215, 185, 127, 0.15);
          color: #f4dcb0;
          font-size: 0.82rem;
          flex-shrink: 0;
        }

        .member-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 10px;
        }

        .member-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 12px;
        }

        .member-email,
        .member-detail {
          display: block;
          font-size: 0.82rem;
          color: #8a847a;
        }

        .member-badges {
          display: flex;
          gap: 6px;
          flex-shrink: 0;
        }

        .badge {
          font-size: 0.72rem;
          padding: 3px 8px;
          border-radius: 999px;
          background: rgba(215, 185, 127, 0.2);
          color: #d7b97f;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .badge-pending {
          background: rgba(240, 190, 100, 0.15);
          color: #f0c864;
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
        button {
          font: inherit;
        }

        input {
          width: 100%;
          border: 1px solid rgba(243, 235, 220, 0.14);
          border-radius: 16px;
          background: rgba(5, 11, 9, 0.5);
          color: #f3ebdc;
          padding: 12px 14px;
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

        .form-error {
          color: #f0a090;
          font-size: 0.9rem;
          margin: 0;
        }

        .form-success {
          color: #a8d5a2;
          font-size: 0.9rem;
          margin: 0;
        }

        .empty-state {
          color: #8a847a;
        }

        a {
          color: #f4dcb0;
        }

        @media (max-width: 768px) {
          .content-grid,
          .event-meta {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params as { id: string };

  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  const prisma = getPrismaClient();
  if (!prisma) {
    return { redirect: { destination: "/", permanent: false } };
  }

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      admin: true,
      events: {
        include: {
          _count: { select: { rsvps: true } },
          rsvps: {
            where: { userId: session.user.id },
            select: { status: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      invites: {
        include: { user: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!group) {
    return { redirect: { destination: "/", permanent: false } };
  }

  // Access check: must be admin or accepted member
  const isAdmin = group.adminId === session.user.id;
  const isMember = group.invites.some(
    (inv) => inv.userId === session.user.id && inv.usedAt !== null
  );

  if (!isAdmin && !isMember) {
    return { redirect: { destination: "/", permanent: false } };
  }

  const acceptedMembers = group.invites
    .filter((inv) => inv.usedAt !== null && inv.user)
    .map((inv) => ({
      email: inv.email,
      name: inv.user?.name || null,
      hometown: inv.user?.hometown || null,
      isAdmin: false,
      status: "accepted" as const,
    }));

  const adminMember = {
    email: group.admin.email,
    name: group.admin.name || null,
    hometown: group.admin.hometown || null,
    isAdmin: true,
    status: "accepted" as const,
  };

  const pendingInvites = group.invites
    .filter((inv) => inv.usedAt === null)
    .map((inv) => ({ email: inv.email }));

  return {
    props: {
      userId: session.user.id,
      isAdmin,
      group: {
        id: group.id,
        name: group.name,
        adminName: group.admin.name || group.admin.email,
        members: [adminMember, ...acceptedMembers],
        pendingInvites,
        events: group.events.map((event) => ({
          id: event.id,
          title: event.title,
          description: event.description,
          location: event.location,
          mapLink: event.mapLink,
          mapEmbed: event.mapEmbed,
          rsvpCount: event._count.rsvps,
          arrivalDate: event.arrivalDate?.toISOString() || null,
          departureDate: event.departureDate?.toISOString() || null,
          userRsvpStatus: event.rsvps[0]?.status ?? null,
        })),
      },
    },
  };
};
