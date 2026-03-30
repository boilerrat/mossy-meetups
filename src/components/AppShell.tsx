import Head from "next/head";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import type { ReactNode } from "react";

import { GroupSidebar, type SidebarGroup } from "./GroupSidebar";
import { LogoWordmark } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { MossTexture } from "./MossTexture";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  groups?: SidebarGroup[];
}

export function AppShell({ children, title, groups }: AppShellProps) {
  const { data: session } = useSession();
  const pageTitle = title ? `${title} — Mossy Meetups` : "Mossy Meetups";

  function handleSignOut() {
    signOut({ callbackUrl: "/login" });
  }

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="shell">
        {/* Top nav */}
        <nav className="nav" role="navigation" aria-label="Main navigation">
          <Link href="/" className="nav-brand" aria-label="Mossy Meetups home">
            <LogoWordmark size="md" />
          </Link>

          <div className="nav-right">
            <Link href="/camp-guide" className="nav-link" title="Field Manual">
              📖
            </Link>
            <Link href="/faq" className="nav-link" title="FAQ & How-To">
              ❓
            </Link>
            {session?.user?.name ? (
              <Link href="/profile" className="nav-user">
                {session.user.name}
              </Link>
            ) : null}
            <ThemeToggle />
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

          <main className="main" id="main-content">{children}</main>
        </div>

        {/* Page footer moss strip */}
        <footer className="page-footer" aria-hidden="true">
          <MossTexture variant="footer" />
        </footer>
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
          height: 58px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-nav);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          position: sticky;
          top: 0;
          z-index: 50;
          flex-shrink: 0;
          box-shadow: var(--shadow-nav);
        }

        .nav-brand {
          text-decoration: none;
          display: flex;
          align-items: center;
          padding: 4px 0;
        }

        .nav-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .nav-link {
          min-width: 36px;
          height: 36px;
          padding: 0 10px;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid transparent;
          background: transparent;
          font-size: 1rem;
          text-decoration: none;
          color: var(--text-muted);
          transition: border-color 0.15s, background 0.15s, color 0.15s, transform 0.15s;
          line-height: 1;
          display: flex;
          align-items: center;
        }

        .nav-link:hover {
          transform: translateY(-1px);
          border-color: rgba(215, 185, 127, 0.26);
          background: rgba(243, 235, 220, 0.06);
          color: var(--accent-hover);
        }

        .nav-user {
          display: inline-flex;
          align-items: center;
          min-height: 38px;
          padding: 0 14px;
          border-radius: var(--radius-pill);
          border: 1px solid rgba(215, 185, 127, 0.26);
          background:
            linear-gradient(135deg, rgba(215, 185, 127, 0.16), rgba(185, 133, 69, 0.08)),
            rgba(9, 18, 15, 0.58);
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--accent-hover);
          text-decoration: none;
          transition: transform 0.15s, border-color 0.15s, background 0.15s, color 0.15s, box-shadow 0.15s;
        }

        .nav-user:hover {
          transform: translateY(-1px);
          color: var(--text);
          border-color: rgba(215, 185, 127, 0.48);
          background:
            linear-gradient(135deg, rgba(215, 185, 127, 0.24), rgba(185, 133, 69, 0.12)),
            rgba(11, 22, 17, 0.88);
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.16);
        }

        .nav-signout {
          font-family: inherit;
          font-size: 0.88rem;
          background: transparent;
          border: 1px solid var(--border-strong);
          color: var(--text-muted);
          padding: 5px 12px;
          border-radius: var(--radius-pill);
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
        }

        .nav-signout:hover {
          border-color: var(--accent);
          color: var(--text);
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

        /* ── Page footer moss ── */
        .page-footer {
          height: 48px;
          overflow: hidden;
          opacity: 0.55;
          flex-shrink: 0;
          padding: 0 8px;
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
