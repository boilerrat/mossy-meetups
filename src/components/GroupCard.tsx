import Link from "next/link";

export interface GroupCardGroup {
  id: string;
  name: string;
  adminId: string;
  adminName: string;
  adminEmail: string;
  eventCount: number;
}

interface GroupCardProps {
  group: GroupCardGroup;
  userId: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function GroupCard({ group, userId, onEdit, onDelete }: GroupCardProps) {
  const isAdmin = group.adminId === userId;

  return (
    <article className="card">
      <div>
        <h3>
          <Link href={`/groups/${group.id}`} className="group-link">
            {group.name}
          </Link>
        </h3>
        <p className="card-meta">
          Hosted by {group.adminName} · {group.adminEmail}
        </p>
      </div>

      <div className="card-right">
        <span className="pill">{group.eventCount} events</span>
        {isAdmin ? (
          <div className="card-actions">
            {onEdit ? (
              <button
                type="button"
                className="btn-icon"
                onClick={onEdit}
                aria-label="Edit group"
              >
                Edit
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                className="btn-icon btn-danger"
                onClick={onDelete}
                aria-label="Delete group"
              >
                Delete
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <style jsx>{`
        .card {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          border: 1px solid rgba(243, 235, 220, 0.12);
          background: rgba(13, 28, 23, 0.74);
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 18px;
        }

        h3 {
          margin: 0 0 4px;
          font-size: 1rem;
        }

        .group-link {
          display: inline-flex;
          align-items: center;
          min-height: 40px;
          padding: 0 16px;
          border-radius: 999px;
          border: 1px solid rgba(215, 185, 127, 0.28);
          background:
            linear-gradient(135deg, rgba(215, 185, 127, 0.18), rgba(185, 133, 69, 0.08)),
            rgba(9, 18, 15, 0.76);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
          color: #f8ead1;
          text-decoration: none;
          font-weight: 700;
          transition: transform 0.15s, border-color 0.15s, background 0.15s, color 0.15s, box-shadow 0.15s;
        }

        .group-link:hover {
          transform: translateY(-1px);
          border-color: rgba(215, 185, 127, 0.5);
          background:
            linear-gradient(135deg, rgba(215, 185, 127, 0.3), rgba(185, 133, 69, 0.16)),
            rgba(11, 22, 17, 0.92);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.18);
          color: #fff6e4;
        }

        .card-meta {
          font-size: 0.85rem;
          color: #c9c2b3;
          margin: 10px 0 0;
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
      `}</style>
    </article>
  );
}
