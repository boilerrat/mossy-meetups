import Link from "next/link";
import { useState } from "react";

import { RSVPButton, type RSVPStatus } from "./RSVPButton";

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

export function EventCard({ event, userId, onEdit, onDelete, onRsvpChange }: EventCardProps) {
  const [rsvpCount, setRsvpCount] = useState(event.rsvpCount);
  const [rsvpStatus, setRsvpStatus] = useState<RSVPStatus | null>(
    event.userRsvpStatus as RSVPStatus | null
  );
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
          <span className="pill">{rsvpCount} RSVPs</span>
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

        .card-desc {
          color: #c9c2b3;
          font-size: 0.9rem;
          margin: 0 0 10px;
          line-height: 1.5;
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
