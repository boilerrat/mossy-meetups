import { getServerSession } from "next-auth/next";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { FormEvent, useState } from "react";

import { authOptions } from "../../lib/auth";
import { getPrismaClient } from "../../lib/prisma";
import { AppShell } from "../../components/AppShell";
import { EventCard, type EventCardEvent } from "../../components/EventCard";
import { TbdEventCard, type TbdEventCardEvent } from "../../components/TbdEventCard";
import type { RSVPStatus } from "../../components/RSVPButton";

type Props = InferGetServerSidePropsType<typeof getServerSideProps>;

export default function GroupPage({ group, isAdmin, userId, sidebarGroups }: Props) {
  const [localEvents, setLocalEvents] = useState(group.events.filter((e) => e.arrivalDate !== null));
  const tbdEvents = group.events.filter((e) => e.arrivalDate === null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteState, setInviteState] = useState<{ loading: boolean; error: string | null; sent: boolean }>(
    { loading: false, error: null, sent: false }
  );

  function handleRsvpChange(eventId: string, newStatus: RSVPStatus, hadPreviousRsvp: boolean) {
    setLocalEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? { ...e, userRsvpStatus: newStatus, rsvpCount: hadPreviousRsvp ? e.rsvpCount : e.rsvpCount + 1 }
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
    <AppShell title={group.name} groups={sidebarGroups}>
      <header className="group-header">
        <p className="eyebrow">Group</p>
        <h1>{group.name}</h1>
        <p className="meta">Hosted by {group.adminName}</p>
      </header>

      <div className="content-grid">
        {/* Events column */}
        <div className="stack">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-label">Events</p>
                <h2>{group.name} meetups</h2>
              </div>
            </div>
            {localEvents.length === 0 && tbdEvents.length === 0 ? (
              <p className="empty-state">No events yet.</p>
            ) : (
              <>
                {localEvents.length > 0 ? (
                  <div className="event-list">
                    {localEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event as EventCardEvent}
                        userId={userId}
                        onRsvpChange={(s, had) => handleRsvpChange(event.id, s, had)}
                      />
                    ))}
                  </div>
                ) : null}
                {tbdEvents.length > 0 ? (
                  <div className="tbd-section">
                    <p className="tbd-section-label">Needs a date</p>
                    <div className="event-list">
                      {tbdEvents.map((event) => (
                        <TbdEventCard
                          key={event.id}
                          event={event as TbdEventCardEvent}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </section>
        </div>

        {/* Members + invite column */}
        <div className="stack">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-label">Members</p>
                <h2>
                  {group.members.length}{" "}
                  {group.members.length === 1 ? "person" : "people"}
                </h2>
              </div>
            </div>
            <ul className="member-list">
              {group.members.map((member) => (
                <li key={member.email} className="member-row">
                  <div>
                    <strong>{member.name || member.email}</strong>
                    {member.name ? (
                      <span className="member-email">{member.email}</span>
                    ) : null}
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

          {isAdmin ? (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="panel-label">Invite</p>
                  <h2>Add a member</h2>
                </div>
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
                  <p className="form-success">
                    Invite sent! They&apos;ll get an email to join.
                  </p>
                ) : null}
                <button type="submit" disabled={inviteState.loading}>
                  {inviteState.loading ? "Sending…" : "Send invite"}
                </button>
              </form>
            </section>
          ) : null}

          {isAdmin && group.pendingInvites.length > 0 ? (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="panel-label">Pending</p>
                  <h2>Awaiting response</h2>
                </div>
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

      <style jsx>{`
        .group-header {
          margin-bottom: 28px;
        }

        .eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 0.78rem;
          color: #d7b97f;
          margin: 0 0 8px;
        }

        h1 {
          margin: 0 0 6px;
          font-size: clamp(2rem, 5vw, 3rem);
          line-height: 1;
        }

        h2 {
          margin: 0;
          font-size: 1.1rem;
        }

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

        .tbd-section {
          margin-top: 16px;
          display: grid;
          gap: 10px;
        }

        .tbd-section-label {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #f0c864;
          margin: 0;
        }

        .event-list {
          display: grid;
          gap: 12px;
        }

        .empty-state {
          color: #8a847a;
          margin: 0;
          font-size: 0.9rem;
        }

        .member-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 8px;
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

        button[type="submit"] {
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

        @media (max-width: 768px) {
          .content-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AppShell>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params as { id: string };
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) return { redirect: { destination: "/login", permanent: false } };

  const prisma = getPrismaClient();
  if (!prisma) return { redirect: { destination: "/", permanent: false } };

  const [group, userGroups] = await Promise.all([
    prisma.group.findUnique({
      where: { id },
      include: {
        admin: true,
        events: {
          include: {
            _count: { select: { rsvps: true, dateProposals: true, locationOptions: true } },
            rsvps: {
              where: { userId: session.user.id },
              select: { status: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        invites: { include: { user: true }, orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.group.findMany({
      where: {
        OR: [
          { adminId: session.user.id },
          { invites: { some: { userId: session.user.id, usedAt: { not: null } } } },
        ],
      },
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!group) return { redirect: { destination: "/", permanent: false } };

  const isAdmin = group.adminId === session.user.id;
  const isMember = group.invites.some((inv) => inv.userId === session.user.id && inv.usedAt !== null);
  if (!isAdmin && !isMember) return { redirect: { destination: "/", permanent: false } };

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
      sidebarGroups: userGroups,
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
          groupId: group.id,
          groupAdminId: group.adminId,
          groupName: null, // already on the group page, hide it
          rsvpCount: event._count.rsvps,
          arrivalDate: event.arrivalDate?.toISOString() || null,
          departureDate: event.departureDate?.toISOString() || null,
          userRsvpStatus: event.rsvps[0]?.status ?? null,
          dateProposalCount: event._count.dateProposals,
          locationOptionCount: event._count.locationOptions,
        })),
      },
    },
  };
};
