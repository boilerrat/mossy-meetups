import { getServerSession } from "next-auth/next";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

import { authOptions } from "../../lib/auth";
import { getPrismaClient } from "../../lib/prisma";
import { RSVPButton, type RSVPStatus } from "../../components/RSVPButton";
import { AppShell } from "../../components/AppShell";
import { DateVoteGrid, type DateProposalData, type MemberData } from "../../components/DateVoteGrid";
import { LocationPoll, type LocationOptionData } from "../../components/LocationPoll";

type Props = InferGetServerSidePropsType<typeof getServerSideProps>;

function formatDate(value: string | null) {
  if (!value) return "TBD";
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const STATUS_LABELS: Record<RSVPStatus, string> = {
  ATTENDING: "Going",
  MAYBE: "Maybe",
  NOT_ATTENDING: "Can't make it",
};

export default function EventPage({
  event,
  userId,
  userRsvpStatus,
  isAdmin,
  dateProposals,
  locationOptions,
  userLocationVoteId,
  members,
  sidebarGroups,
}: Props) {
  const router = useRouter();
  const [rsvpStatus, setRsvpStatus] = useState<RSVPStatus | null>(
    userRsvpStatus as RSVPStatus | null
  );
  const [rsvpCount, setRsvpCount] = useState(event.rsvpCount);

  function handleStatusChange(newStatus: RSVPStatus, hadPreviousRsvp: boolean) {
    setRsvpStatus(newStatus);
    if (!hadPreviousRsvp) {
      setRsvpCount((c) => c + 1);
    }
  }

  function refreshPage() {
    router.replace(router.asPath);
  }

  const attendees = event.attendees;
  const going = attendees.filter((a) => a.status === "ATTENDING");
  const maybe = attendees.filter((a) => a.status === "MAYBE");
  const notGoing = attendees.filter((a) => a.status === "NOT_ATTENDING");
  const isTbd = !event.arrivalDate;

  return (
    <AppShell title={event.title} groups={sidebarGroups}>
      <nav className="breadcrumb">
        <Link href={`/groups/${event.groupId}`}>← {event.groupName}</Link>
      </nav>

      <div className="layout">
        <div className="main-col">
          {/* Event details panel */}
          <article className="panel">
            <p className="eyebrow">{event.groupName}</p>
            <h1>{event.title}</h1>
            {event.description ? (
              <p className="description">{event.description}</p>
            ) : null}

            {isTbd ? (
              <div className="tbd-notice">
                <span className="tbd-badge">Needs a date</span>
                <span className="tbd-hint">Propose and vote on dates below</span>
              </div>
            ) : (
              <>
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
                  <a
                    href={event.mapLink}
                    target="_blank"
                    rel="noreferrer"
                    className="map-link"
                  >
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

                <a
                  href={`/api/events/${event.id}/ics`}
                  className="ics-link"
                  download
                >
                  Add to calendar (.ics) ↓
                </a>
              </>
            )}
          </article>

          {/* Date voting (TBD events only) */}
          {isTbd ? (
            <section className="panel">
              <p className="eyebrow">Date voting</p>
              <h2>When works for everyone?</h2>
              <DateVoteGrid
                eventId={event.id}
                proposals={dateProposals as DateProposalData[]}
                members={members as MemberData[]}
                currentUserId={userId}
                isAdmin={isAdmin}
                onDateConfirmed={refreshPage}
              />
            </section>
          ) : null}

          {/* Location voting */}
          {isTbd || locationOptions.length > 0 ? (
            <section className="panel">
              <p className="eyebrow">Location</p>
              <h2>
                {event.location
                  ? event.location
                  : locationOptions.length > 0
                  ? "Vote on a location"
                  : "Location TBD"}
              </h2>
              {!event.location ? (
                <LocationPoll
                  eventId={event.id}
                  options={locationOptions as LocationOptionData[]}
                  members={members as Array<{ id: string; name: string }>}
                  userVoteOptionId={userLocationVoteId}
                  currentUserId={userId}
                  isAdmin={isAdmin}
                  onLocationConfirmed={refreshPage}
                />
              ) : null}
            </section>
          ) : null}

          {/* Who's coming */}
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Attendees</p>
                <h2>{rsvpCount} {rsvpCount === 1 ? "response" : "responses"}</h2>
              </div>
            </div>

            {attendees.length === 0 ? (
              <p className="empty-state">No RSVPs yet. Be the first!</p>
            ) : (
              <div className="attendee-groups">
                {going.length > 0 ? (
                  <div className="attendee-group">
                    <p className="group-label going">Going ({going.length})</p>
                    <ul className="attendee-list">
                      {going.map((a) => (
                        <li key={a.userId} className="attendee-row">
                          <span className="attendee-name">{a.name || a.email}</span>
                          {a.hometown ? (
                            <span className="attendee-detail">{a.hometown}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {maybe.length > 0 ? (
                  <div className="attendee-group">
                    <p className="group-label maybe">Maybe ({maybe.length})</p>
                    <ul className="attendee-list">
                      {maybe.map((a) => (
                        <li key={a.userId} className="attendee-row">
                          <span className="attendee-name">{a.name || a.email}</span>
                          {a.hometown ? (
                            <span className="attendee-detail">{a.hometown}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {notGoing.length > 0 ? (
                  <div className="attendee-group">
                    <p className="group-label not-going">Can&apos;t make it ({notGoing.length})</p>
                    <ul className="attendee-list">
                      {notGoing.map((a) => (
                        <li key={a.userId} className="attendee-row">
                          <span className="attendee-name">{a.name || a.email}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </div>

        {/* RSVP sidebar */}
        <aside className="side-col">
          <section className="panel rsvp-panel">
            <p className="eyebrow">Your RSVP</p>
            <h2>
              {rsvpStatus ? STATUS_LABELS[rsvpStatus] : "Not yet responded"}
            </h2>
            <RSVPButton
              eventId={event.id}
              initialStatus={userRsvpStatus as RSVPStatus | null}
              onStatusChange={handleStatusChange}
            />
          </section>
        </aside>
      </div>

      <style jsx>{`
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

        .layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 260px;
          gap: 16px;
          align-items: start;
        }

        .main-col,
        .side-col {
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

        .eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 0.78rem;
          color: #d7b97f;
          margin: 0 0 8px;
        }

        h1 {
          margin: 0 0 10px;
          font-size: clamp(1.8rem, 4vw, 2.8rem);
          line-height: 1.1;
        }

        h2 {
          margin: 0 0 16px;
          font-size: 1.25rem;
        }

        .description {
          color: #c9c2b3;
          margin: 0 0 18px;
          line-height: 1.6;
        }

        .tbd-notice {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 8px 0 4px;
        }

        .tbd-badge {
          font-size: 0.72rem;
          padding: 3px 9px;
          border-radius: 999px;
          background: rgba(240, 190, 100, 0.15);
          color: #f0c864;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .tbd-hint {
          font-size: 0.82rem;
          color: #8a847a;
        }

        .event-meta {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin: 18px 0;
        }

        .event-meta dt {
          color: #c9c2b3;
          font-size: 0.82rem;
          margin-bottom: 4px;
        }

        .event-meta dd {
          margin: 0;
          font-size: 0.95rem;
        }

        .map-link {
          display: inline-block;
          color: #f4dcb0;
          margin-bottom: 12px;
          font-size: 0.9rem;
        }

        .ics-link {
          display: inline-block;
          color: #c9c2b3;
          font-size: 0.82rem;
          margin-top: 8px;
          text-decoration: none;
        }

        .ics-link:hover {
          color: #f3ebdc;
        }

        .map-embed {
          display: block;
          width: 100%;
          height: 240px;
          border: 0;
          border-radius: 12px;
          margin-top: 10px;
        }

        .rsvp-panel h2 {
          font-size: 1.1rem;
          margin-bottom: 14px;
        }

        .attendee-groups {
          display: grid;
          gap: 18px;
        }

        .group-label {
          font-size: 0.82rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin: 0 0 8px;
          font-weight: 600;
        }

        .group-label.going { color: #7ec87e; }
        .group-label.maybe { color: #d7b97f; }
        .group-label.not-going { color: #c9c2b3; }

        .attendee-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 6px;
        }

        .attendee-row {
          display: flex;
          align-items: baseline;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 10px;
        }

        .attendee-name { font-size: 0.95rem; }

        .attendee-detail {
          font-size: 0.8rem;
          color: #8a847a;
        }

        .empty-state {
          color: #8a847a;
          margin: 0;
        }

        a {
          color: #f4dcb0;
        }

        @media (max-width: 768px) {
          .layout {
            grid-template-columns: 1fr;
          }

          .side-col {
            order: -1;
          }

          .event-meta {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </AppShell>
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

  const [event, userGroups] = await Promise.all([
    prisma.event.findUnique({
      where: { id },
      include: {
        group: {
          include: {
            admin: { select: { id: true, name: true, email: true } },
            invites: {
              where: { usedAt: { not: null } },
              include: { user: { select: { id: true, name: true, email: true } } },
            },
          },
        },
        rsvps: {
          include: {
            user: {
              select: { id: true, name: true, email: true, hometown: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        dateProposals: {
          include: {
            creator: { select: { id: true, name: true, email: true } },
            votes: { select: { userId: true } },
          },
          orderBy: { date: "asc" },
        },
        locationOptions: {
          include: {
            votes: { select: { userId: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        locationVotes: {
          where: { userId: session.user.id },
          select: { locationOptionId: true },
        },
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

  if (!event) {
    return { redirect: { destination: "/", permanent: false } };
  }

  const isAdmin = event.group.adminId === session.user.id;
  const isMember = event.group.invites.some(
    (inv) => inv.userId === session.user.id && inv.usedAt !== null
  );

  if (!isAdmin && !isMember) {
    return { redirect: { destination: "/", permanent: false } };
  }

  const userRsvp = event.rsvps.find((r) => r.userId === session.user.id);

  // Build member list (admin + accepted invites)
  const members: Array<{ id: string; name: string }> = [
    {
      id: event.group.admin.id,
      name: event.group.admin.name || event.group.admin.email,
    },
    ...event.group.invites
      .filter((inv) => inv.user)
      .map((inv) => ({
        id: inv.user!.id,
        name: inv.user!.name || inv.user!.email,
      })),
  ];

  return {
    props: {
      sidebarGroups: userGroups,
      userId: session.user.id,
      isAdmin,
      userRsvpStatus: userRsvp?.status ?? null,
      userLocationVoteId: event.locationVotes[0]?.locationOptionId ?? null,
      dateProposals: event.dateProposals.map((p) => ({
        id: p.id,
        date: p.date.toISOString(),
        createdBy: p.createdBy,
        creatorName: p.creator.name || p.creator.email,
        votes: p.votes.map((v) => ({ userId: v.userId })),
      })),
      locationOptions: event.locationOptions.map((o) => ({
        id: o.id,
        name: o.name,
        mapLink: o.mapLink,
        mapEmbed: o.mapEmbed,
        createdBy: o.createdBy,
        voteCount: o.votes.length,
        votes: o.votes.map((v) => ({ userId: v.userId })),
      })),
      members,
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        mapLink: event.mapLink,
        mapEmbed: event.mapEmbed,
        arrivalDate: event.arrivalDate?.toISOString() ?? null,
        departureDate: event.departureDate?.toISOString() ?? null,
        groupId: event.groupId,
        groupName: event.group.name,
        rsvpCount: event.rsvps.length,
        attendees: event.rsvps.map((r) => ({
          userId: r.userId,
          status: r.status,
          name: r.user.name,
          email: r.user.email,
          hometown: r.user.hometown,
        })),
      },
    },
  };
};
