import Link from "next/link";
import { useRouter } from "next/router";
import { MossTexture } from "./MossTexture";

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

      <div className="sidebar-moss">
        <MossTexture variant="footer" />
      </div>

      <style jsx>{`
        .sidebar {
          width: 220px;
          flex-shrink: 0;
          padding: 24px 16px 8px;
          border-right: 1px solid rgba(243, 235, 220, 0.08);
          display: flex;
          flex-direction: column;
        }

        .sidebar-moss {
          margin-top: auto;
          padding-top: 12px;
          opacity: 0.7;
          overflow: hidden;
          height: 40px;
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
          gap: 10px;
        }

        .sidebar-item {
          display: flex;
          align-items: center;
          min-height: 44px;
          padding: 10px 14px;
          border-radius: 14px;
          border: 1px solid rgba(243, 235, 220, 0.12);
          background:
            linear-gradient(180deg, rgba(243, 235, 220, 0.05), rgba(243, 235, 220, 0.02)),
            rgba(8, 18, 14, 0.55);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
          font-size: 0.92rem;
          font-weight: 600;
          color: #f3ebdc;
          text-decoration: none;
          transition: transform 0.15s, border-color 0.15s, background 0.15s, color 0.15s, box-shadow 0.15s;
          white-space: normal;
          line-height: 1.3;
        }

        .sidebar-item:hover {
          transform: translateY(-1px);
          border-color: rgba(215, 185, 127, 0.38);
          background:
            linear-gradient(180deg, rgba(215, 185, 127, 0.16), rgba(215, 185, 127, 0.06)),
            rgba(10, 21, 17, 0.88);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.18);
          color: #fff4de;
        }

        .sidebar-item--active {
          border-color: rgba(215, 185, 127, 0.5);
          background:
            linear-gradient(135deg, rgba(215, 185, 127, 0.24), rgba(185, 133, 69, 0.16)),
            rgba(10, 21, 17, 0.95);
          color: #fff0cb;
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.22);
        }
      `}</style>
    </aside>
  );
}
