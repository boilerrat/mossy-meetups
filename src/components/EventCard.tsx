import Link from "next/link";
import { useState, useEffect } from "react";

import { RSVPButton, type RSVPStatus } from "./RSVPButton";
import { WeatherWidget } from "./WeatherWidget";

export interface EventCardEvent {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  mapLink?: string | null;
  mapEmbed?: string | null;
  groupId: string;
  groupAdminId: string;
  groupName?: string | null;
  arrivalDate: string | null;
  departureDate: string | null;
  nights: number | null;
  isPotluck: boolean;
  rsvpCount: number;
  userRsvpStatus: string | null;
}

interface EventCardProps {
  event: EventCardEvent;
  userId: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onRsvpChange?: (newStatus: RSVPStatus, hadPreviousRsvp: boolean) => void;
}

function formatDate(value: string | null) {
  if (!value) return "TBD";
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getCountdownLabel(
  arrivalDate: string,
  departureDate: string | null
): { label: string; variant: "future" | "today" | "happening" | "past" } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const arrival = new Date(arrivalDate);
  const arrivalDay = new Date(arrival.getFullYear(), arrival.getMonth(), arrival.getDate());
  const departure = departureDate ? new Date(departureDate) : null;
  const departureDay = departure
    ? new Date(departure.getFullYear(), departure.getMonth(), departure.getDate())
    : arrivalDay;

  if (today >= arrivalDay && today <= departureDay) {
    return { label: "Happening now", variant: "happening" };
  }

  const diffMs = arrivalDay.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const past = Math.abs(diffDays);
    return {
      label: past === 1 ? "Yesterday" : `${past} days ago`,
      variant: "past",
    };
  }
  if (diffDays === 0) return { label: "Today!", variant: "today" };
  if (diffDays === 1) return { label: "Tomorrow", variant: "future" };
  return { label: `${diffDays} days away`, variant: "future" };
}

export function EventCard({ event, userId, onEdit, onDelete, onRsvpChange }: EventCardProps) {
  const [rsvpCount, setRsvpCount] = useState(event.rsvpCount);
  const [rsvpStatus, setRsvpStatus] = useState<RSVPStatus | null>(
    event.userRsvpStatus as RSVPStatus | null
  );
  // Countdown computed client-only to avoid server/client timezone mismatch (React #425)
  const [countdown, setCountdown] = useState<ReturnType<typeof getCountdownLabel> | null>(null);

  useEffect(() => {
    if (event.arrivalDate) {
      setCountdown(getCountdownLabel(event.arrivalDate, event.departureDate));
    }
  }, [event.arrivalDate, event.departureDate]);

  const isAdmin = event.groupAdminId === userId;

  function handleRsvpChange(newStatus: RSVPStatus, hadPreviousRsvp: boolean) {
    setRsvpStatus(newStatus);
    if (!hadPreviousRsvp) setRsvpCount((c) => c + 1);
    onRsvpChange?.(newStatus, hadPreviousRsvp);
  }

  return (
    <article className="card">
      <div className="card-header">
        <div className="card-titles">
          {event.groupName ? (
            <p className="event-group">{event.groupName}</p>
          ) : null}
          <h3>{event.title}</h3>
        </div>
        <div className="card-right">
          <div className="pills">
            {event.isPotluck ? (
              <span className="pill pill--potluck">Potluck</span>
            ) : null}
            <span className="pill">{rsvpCount} RSVPs</span>
          </div>
          {countdown ? (
            <span className={`countdown countdown--${countdown.variant}`}>
              {countdown.label}
            </span>
          ) : null}
          {isAdmin ? (
            <div className="card-actions">
              {onEdit ? (
                <button
                  type="button"
                  className="btn-icon"
                  onClick={onEdit}
                  aria-label="Edit event"
                >
                  Edit
                </button>
              ) : null}
              {onDelete ? (
                <button
                  type="button"
                  className="btn-icon btn-danger"
                  onClick={onDelete}
                  aria-label="Delete event"
                >
                  Delete
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {event.description ? <p className="card-desc">{event.description}</p> : null}

      {event.arrivalDate === null ? (
        <div className="tbd-meta">
          <span className="tbd-badge">Date TBD</span>
          <Link href={`/events/${event.id}`} className="tbd-vote-link">Vote on date →</Link>
        </div>
      ) : (
        <dl className="event-meta">
          <div>
            <dt>Arrival</dt>
            <dd suppressHydrationWarning>{formatDate(event.arrivalDate)}</dd>
          </div>
          <div>
            <dt>Nights</dt>
            <dd>{event.nights ? `${event.nights} night${event.nights === 1 ? "" : "s"}` : "—"}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>{event.location || "TBD"}</dd>
          </div>
        </dl>
      )}

      {event.mapLink ? (
        <a href={event.mapLink} target="_blank" rel="noreferrer" className="map-link">
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

      {event.arrivalDate && event.location ? (
        <div className="weather-row">
          <WeatherWidget location={event.location} arrivalDate={event.arrivalDate} />
        </div>
      ) : null}

      <div className="card-footer">
        <RSVPButton
          eventId={event.id}
          initialStatus={rsvpStatus}
          onStatusChange={handleRsvpChange}
        />
        <Link href={`/events/${event.id}`} className="detail-link">
          Details →
        </Link>
      </div>

      <style jsx>{`
        .card {
          border: 1px solid rgba(243, 235, 220, 0.12);
          background: rgba(13, 28, 23, 0.74);
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 18px;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 10px;
        }

        .card-titles {
          min-width: 0;
        }

        .event-group {
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #d7b97f;
          margin: 0 0 4px;
        }

        h3 {
          margin: 0;
          font-size: 1.05rem;
        }

        .card-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
          flex-shrink: 0;
        }

        .pills {
          display: flex;
          gap: 5px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .card-actions {
          display: flex;
          gap: 6px;
        }

        .pill {
          white-space: nowrap;
          border-radius: 999px;
          padding: 5px 10px;
          background: rgba(215, 185, 127, 0.15);
          color: #f4dcb0;
          font-size: 0.82rem;
        }

        .pill--potluck {
          background: rgba(180, 120, 220, 0.18);
          color: #d4a0f0;
        }

        .countdown {
          font-size: 0.75rem;
          padding: 3px 9px;
          border-radius: 999px;
          white-space: nowrap;
        }

        .countdown--future {
          background: rgba(215, 185, 127, 0.12);
          color: #d7b97f;
        }

        .countdown--today {
          background: rgba(126, 200, 126, 0.18);
          color: #7ec87e;
        }

        .countdown--happening {
          background: rgba(126, 200, 126, 0.25);
          color: #a0e0a0;
          font-weight: 600;
        }

        .countdown--past {
          background: rgba(255, 255, 255, 0.05);
          color: #8a847a;
        }

        .card-desc {
          color: #c9c2b3;
          font-size: 0.9rem;
          margin: 0 0 10px;
          line-height: 1.5;
        }

        .tbd-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 8px 0;
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

        .tbd-vote-link {
          display: inline-flex;
          align-items: center;
          font-size: 0.78rem;
          color: #10231d;
          text-decoration: none;
          font-weight: 700;
          background: linear-gradient(135deg, #d7b97f, #b98545);
          padding: 4px 11px;
          border-radius: 999px;
          transition: opacity 0.15s;
        }

        .tbd-vote-link:hover {
          opacity: 0.88;
        }

        .event-meta {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin: 10px 0;
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

        .map-link {
          display: inline-block;
          font-size: 0.88rem;
          color: #f4dcb0;
          margin-bottom: 8px;
        }

        .map-embed {
          display: block;
          width: 100%;
          height: 180px;
          border: 0;
          border-radius: 12px;
          margin-bottom: 10px;
        }

        .weather-row {
          padding: 6px 0 8px;
          border-top: 1px solid rgba(243, 235, 220, 0.06);
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
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 40px;
          padding: 0 16px;
          border-radius: 999px;
          border: 1px solid rgba(215, 185, 127, 0.32);
          background:
            linear-gradient(135deg, rgba(215, 185, 127, 0.18), rgba(185, 133, 69, 0.08)),
            rgba(9, 18, 15, 0.7);
          font-size: 0.82rem;
          color: #f5e6cb;
          text-decoration: none;
          white-space: nowrap;
          flex-shrink: 0;
          font-weight: 700;
          letter-spacing: 0.01em;
          transition: transform 0.15s, color 0.15s, border-color 0.15s, background 0.15s, box-shadow 0.15s;
        }

        .detail-link:hover {
          transform: translateY(-1px);
          color: #fff5df;
          border-color: rgba(215, 185, 127, 0.52);
          background:
            linear-gradient(135deg, rgba(215, 185, 127, 0.28), rgba(185, 133, 69, 0.16)),
            rgba(11, 22, 17, 0.9);
          box-shadow: 0 12px 22px rgba(0, 0, 0, 0.16);
        }

        .btn-icon {
          font-family: inherit;
          background: rgba(243, 235, 220, 0.08);
          color: #c9c2b3;
          font-size: 0.78rem;
          font-weight: 400;
          padding: 5px 10px;
          border-radius: 999px;
          border: 0;
          cursor: pointer;
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

        @media (max-width: 600px) {
          .event-meta {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </article>
  );
}
