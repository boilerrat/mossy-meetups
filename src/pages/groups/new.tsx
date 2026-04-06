import { getServerSession } from "next-auth/next";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useState } from "react";
import { Input, Label } from "@boilerhaus-ui/boilerhaus-ui";

import { getAuthOptions } from "../../lib/auth";
import { getPrismaClient } from "../../lib/prisma";
import { AppShell } from "../../components/AppShell";

type Props = InferGetServerSidePropsType<typeof getServerSideProps>;

export default function NewGroupPage({ sidebarGroups }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [state, setState] = useState<{ loading: boolean; error: string | null }>({
    loading: false,
    error: null,
  });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({ loading: true, error: null });
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({ error: "Failed to create group" }));
      setState({ loading: false, error: payload.error || "Failed to create group" });
      return;
    }
    router.push("/");
  }

  return (
    <AppShell title="New Group" groups={sidebarGroups}>
      <div className="page-wrap">
        <div className="form-card">
          <p className="form-eyebrow">Groups</p>
          <h1 className="form-title">Create a new group</h1>
          <p className="form-sub">
            A group is the host for your events. Invite friends after you&apos;ve created it.
          </p>

          <form className="form-body" onSubmit={handleSubmit}>
            <div className="field">
              <Label htmlFor="name" required>Group name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Boilerhaus Camp Crew"
                required
                autoFocus
              />
            </div>

            {state.error ? <p className="form-error">{state.error}</p> : null}

            <div className="form-actions">
              <Link href="/" className="btn btn-ghost">Cancel</Link>
              <button type="submit" className="btn btn-primary" disabled={state.loading}>
                {state.loading ? "Creating…" : "Create group"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        .page-wrap {
          display: flex;
          justify-content: center;
          padding: 40px 16px;
        }

        .form-card {
          width: 100%;
          max-width: 480px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-card);
          padding: 36px 32px;
          backdrop-filter: blur(10px);
        }

        .form-eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 0.75rem;
          color: var(--accent);
          margin: 0 0 8px;
        }

        .form-title {
          font-family: var(--font-display);
          font-size: 1.6rem;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 8px;
          line-height: 1.15;
        }

        .form-sub {
          font-size: 0.88rem;
          color: var(--text-muted);
          margin: 0 0 28px;
          line-height: 1.5;
        }

        .form-body {
          display: grid;
          gap: 20px;
        }

        .field {
          display: grid;
          gap: 6px;
        }

        .form-error {
          color: var(--color-error);
          font-size: 0.88rem;
          margin: 0;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding-top: 4px;
        }

        @media (max-width: 540px) {
          .form-card { padding: 24px 20px; }
        }
      `}</style>
    </AppShell>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, getAuthOptions());
  if (!session) return { redirect: { destination: "/login", permanent: false } };
  if (!session.user.name) return { redirect: { destination: "/profile", permanent: false } };

  const prisma = getPrismaClient();
  const sidebarGroups = prisma
    ? await prisma.group.findMany({
        where: {
          OR: [
            { adminId: session.user.id },
            { invites: { some: { userId: session.user.id, usedAt: { not: null } } } },
          ],
        },
        select: { id: true, name: true },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return { props: { sidebarGroups } };
};
