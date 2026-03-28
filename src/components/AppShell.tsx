import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { signOut, useSession } from "next-auth/react";
import type { ReactNode } from "react";

import { GroupSidebar, type SidebarGroup } from "./GroupSidebar";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  groups?: SidebarGroup[];
}

export function AppShell({ children, title, groups }: AppShellProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const pageTitle = title ? `${title} — Mossy Meetups` : "Mossy Meetups";

  function handleSignOut() {
    signOut({ callbackUrl: "/login" });
  }

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
      </Head>

      <div className="shell">
        {/* Top nav */}
        <nav className="nav">
          <Link href="/" className="nav-brand">
            Mossy Meetups
          </Link>

          <div className="nav-right">
            {session?.user?.name ? (
              <Link href="/profile" className="nav-user">
                {session.user.name}
              </Link>
            ) : null}
            <button
              type="button"
              onClick={handleSignOut}
              className="nav-signout"
            >
              Sign out
            </button>
          </div>
        </nav>

        {/* Body: sidebar + content */}
        <div className="body">
          {groups !== undefined ? (
            <div className="sidebar-wrap">
              <GroupSidebar groups={groups} />
            </div>
          ) : null}

          <main className="main">{children}</main>
        </div>
      </div>

      <style jsx>{`
        .shell {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        /* ── Top nav ── */
        .nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          height: 56px;
          border-bottom: 1px solid rgba(243, 235, 220, 0.08);
          background: rgba(10, 21, 18, 0.7);
          backdrop-filter: blur(12px);
          position: sticky;
          top: 0;
          z-index: 50;
          flex-shrink: 0;
        }

        .nav-brand {
          font-size: 1rem;
          font-weight: 700;
          color: #f3ebdc;
          text-decoration: none;
          letter-spacing: 0.02em;
        }

        .nav-brand:hover {
          color: #d7b97f;
        }

        .nav-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .nav-user {
          font-size: 0.88rem;
          color: #c9c2b3;
          text-decoration: none;
        }

        .nav-user:hover {
          color: #f3ebdc;
        }

        .nav-signout {
          font-family: inherit;
          font-size: 0.88rem;
          background: transparent;
          border: 1px solid rgba(243, 235, 220, 0.2);
          color: #c9c2b3;
          padding: 5px 12px;
          border-radius: 999px;
          cursor: pointer;
        }

        .nav-signout:hover {
          border-color: rgba(243, 235, 220, 0.4);
          color: #f3ebdc;
        }

        /* ── Body layout ── */
        .body {
          display: flex;
          flex: 1;
          min-height: 0;
        }

        .sidebar-wrap {
          display: flex;
        }

        .main {
          flex: 1;
          min-width: 0;
          padding: 32px 28px 64px;
        }

        @media (max-width: 768px) {
          .sidebar-wrap {
            display: none;
          }

          .main {
            padding: 24px 16px 48px;
          }
        }
      `}</style>
    </>
  );
}
