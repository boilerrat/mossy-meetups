import Link from "next/link";
import { useRouter } from "next/router";

export interface SidebarGroup {
  id: string;
  name: string;
}

interface GroupSidebarProps {
  groups: SidebarGroup[];
}

export function GroupSidebar({ groups }: GroupSidebarProps) {
  const router = useRouter();
  const activeId = router.query.id as string | undefined;

  return (
    <aside className="sidebar">
      <p className="sidebar-label">Your groups</p>
      {groups.length === 0 ? (
        <p className="sidebar-empty">No groups yet</p>
      ) : (
        <ul className="sidebar-list">
          {groups.map((group) => (
            <li key={group.id}>
              <Link
                href={`/groups/${group.id}`}
                className={`sidebar-item ${activeId === group.id ? "sidebar-item--active" : ""}`}
              >
                {group.name}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <style jsx>{`
        .sidebar {
          width: 220px;
          flex-shrink: 0;
          padding: 24px 16px;
          border-right: 1px solid rgba(243, 235, 220, 0.08);
        }

        .sidebar-label {
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 0.72rem;
          color: #d7b97f;
          margin: 0 0 12px;
        }

        .sidebar-empty {
          font-size: 0.85rem;
          color: #8a847a;
          margin: 0;
        }

        .sidebar-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .sidebar-item {
          display: block;
          padding: 8px 12px;
          border-radius: 10px;
          font-size: 0.9rem;
          color: #c9c2b3;
          text-decoration: none;
          transition: background 0.15s, color 0.15s;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sidebar-item:hover {
          background: rgba(243, 235, 220, 0.07);
          color: #f3ebdc;
        }

        .sidebar-item--active {
          background: rgba(215, 185, 127, 0.15);
          color: #f4dcb0;
        }
      `}</style>
    </aside>
  );
}
