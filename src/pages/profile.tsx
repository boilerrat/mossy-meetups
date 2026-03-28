import { getServerSession } from "next-auth/next";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useState } from "react";

import { authOptions } from "../lib/auth";
import { getPrismaClient } from "../lib/prisma";
import { AppShell } from "../components/AppShell";

type ProfileData = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  hometown: string | null;
  bio: string | null;
};

type Props = InferGetServerSidePropsType<typeof getServerSideProps>;

export default function ProfilePage({ profile, isFirstVisit }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: profile.name || "",
    phone: profile.phone || "",
    hometown: profile.hometown || "",
    bio: profile.bio || "",
  });
  const [state, setState] = useState<{ loading: boolean; error: string | null; saved: boolean }>({
    loading: false,
    error: null,
    saved: false,
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ loading: true, error: null, saved: false });

    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Failed to save profile" }));
      setState({ loading: false, error: payload.error || "Failed to save profile", saved: false });
      return;
    }

    if (isFirstVisit) {
      router.push("/");
      return;
    }

    setState({ loading: false, error: null, saved: true });
  }

  return (
    <AppShell title={isFirstVisit ? "Set up your profile" : "Your profile"}>
      <div className="profile-wrap">
        <div className="card">
          <p className="eyebrow">Mossy Meetups</p>
          <h1>{isFirstVisit ? "Set up your profile" : "Your profile"}</h1>
          {isFirstVisit ? (
            <p className="lede">Tell your group a little about yourself before you dive in.</p>
          ) : null}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={profile.email || ""} disabled />
              <span className="hint">Your sign-in address — cannot be changed here.</span>
            </div>

            <div className="field">
              <label htmlFor="name">Display name <span className="required">*</span></label>
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Alex"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+1 555 000 0000"
              />
            </div>

            <div className="field">
              <label htmlFor="hometown">Hometown</label>
              <input
                id="hometown"
                type="text"
                value={form.hometown}
                onChange={(e) => setForm((f) => ({ ...f, hometown: e.target.value }))}
                placeholder="Portland, OR"
              />
            </div>

            <div className="field">
              <label htmlFor="bio">About you</label>
              <textarea
                id="bio"
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder="I bring the camp kitchen and the good vibes."
                rows={3}
                maxLength={280}
              />
            </div>

            {state.error ? <p className="error">{state.error}</p> : null}
            {state.saved ? <p className="saved">Profile saved.</p> : null}

            <button type="submit" disabled={state.loading}>
              {state.loading ? "Saving..." : isFirstVisit ? "Save and continue" : "Save profile"}
            </button>

            {!isFirstVisit ? (
              <Link href="/" className="back-link">← Back to dashboard</Link>
            ) : null}
          </form>
        </div>
      </div>
      <style jsx>{`
        .profile-wrap {
          display: flex;
          justify-content: center;
          padding: 32px 20px;
        }

        .card {
          width: 100%;
          max-width: 480px;
          border: 1px solid rgba(243, 235, 220, 0.12);
          background: rgba(13, 28, 23, 0.74);
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(10px);
          border-radius: 28px;
          padding: 36px;
        }

        .eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 0.78rem;
          color: #d7b97f;
          margin: 0 0 12px;
        }

        h1 {
          margin: 0 0 8px;
          font-size: 2rem;
          line-height: 1.1;
        }

        .lede {
          color: #c9c2b3;
          margin: 0 0 24px;
        }

        form {
          display: grid;
          gap: 18px;
          margin-top: 24px;
        }

        .field {
          display: grid;
          gap: 7px;
        }

        label {
          font-size: 0.95rem;
          color: #e6dfd0;
        }

        .required {
          color: #d7b97f;
        }

        .hint {
          font-size: 0.82rem;
          color: #8a847a;
        }

        input,
        textarea {
          font: inherit;
          width: 100%;
          border: 1px solid rgba(243, 235, 220, 0.14);
          border-radius: 16px;
          background: rgba(5, 11, 9, 0.5);
          color: #f3ebdc;
          padding: 12px 14px;
        }

        input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        input:focus,
        textarea:focus {
          outline: 2px solid rgba(215, 185, 127, 0.5);
          outline-offset: 2px;
        }

        textarea {
          resize: vertical;
        }

        button {
          font: inherit;
          border: 0;
          border-radius: 999px;
          padding: 14px 18px;
          background: linear-gradient(135deg, #d7b97f, #b98545);
          color: #10231d;
          font-weight: 700;
          cursor: pointer;
        }

        button:disabled {
          cursor: wait;
          opacity: 0.7;
        }

        .error {
          color: #f0a090;
          font-size: 0.9rem;
          margin: 0;
        }

        .saved {
          color: #a8d5a2;
          font-size: 0.9rem;
          margin: 0;
        }

        .back-link {
          display: block;
          text-align: center;
          color: #c9c2b3;
          font-size: 0.9rem;
          text-decoration: none;
        }

        .back-link:hover {
          color: #f3ebdc;
        }
      `}</style>
    </AppShell>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  const prisma = getPrismaClient();
  if (!prisma) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, phone: true, hometown: true, bio: true },
  });

  if (!user) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  return {
    props: {
      profile: user as ProfileData,
      isFirstVisit: !user.name,
    },
  };
};
