import Link from "next/link";

export interface TbdEventCardEvent {
  id: string;
  title: string;
  groupName: string | null;
  description: string | null;
  dateProposalCount: number;
  locationOptionCount: number;
}

interface TbdEventCardProps {
  event: TbdEventCardEvent;
}

export function TbdEventCard({ event }: TbdEventCardProps) {
  return (
    <div className="tbd-card">
      {event.groupName ? (
        <p className="group-name">{event.groupName}</p>
      ) : null}

      <h3 className="title">{event.title}</h3>

      {event.description ? (
        <p className="description">{event.description}</p>
      ) : null}

      <div className="meta">
        <span className="tbd-badge">Needs a date</span>
        {event.dateProposalCount > 0 ? (
          <span className="hint">
            {event.dateProposalCount} date{event.dateProposalCount === 1 ? "" : "s"} proposed
          </span>
        ) : null}
        {event.locationOptionCount > 0 ? (
          <span className="hint">
            {event.locationOptionCount} location{event.locationOptionCount === 1 ? "" : "s"} to vote on
          </span>
        ) : null}
      </div>

      <Link href={`/events/${event.id}`} className="cta-link">
        Vote on date →
      </Link>

      <style jsx>{`
        .tbd-card {
          border: 1px solid rgba(240, 190, 100, 0.2);
          background: rgba(13, 28, 23, 0.74);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 18px 20px;
          display: grid;
          gap: 8px;
        }

        .group-name {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #d7b97f;
          margin: 0;
        }

        .title {
          font-size: 1.05rem;
          margin: 0;
          color: #f3ebdc;
        }

        .description {
          font-size: 0.88rem;
          color: #c9c2b3;
          margin: 0;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin-top: 2px;
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

        .hint {
          font-size: 0.8rem;
          color: #8a847a;
        }

        .cta-link {
          font-size: 0.88rem;
          color: #f4dcb0;
          text-decoration: none;
          font-weight: 600;
          margin-top: 2px;
        }

        .cta-link:hover {
          color: #fff;
        }
      `}</style>
    </div>
  );
}
