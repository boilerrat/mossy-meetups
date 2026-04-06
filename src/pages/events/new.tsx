import { getServerSession } from "next-auth/next";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useState } from "react";
import {
  Button,
  Checkbox,
  Input,
  Label,
  Select,
  SelectItem,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@boilerhaus-ui/boilerhaus-ui";

import { getAuthOptions } from "../../lib/auth";
import { getPrismaClient } from "../../lib/prisma";
import { hasTooManyLocationOptions } from "../../lib/location-options";
import { AppShell } from "../../components/AppShell";
import { DatePicker } from "../../components/DatePicker";

type Props = InferGetServerSidePropsType<typeof getServerSideProps>;

const initialForm = {
  groupId: "",
  title: "",
  description: "",
  location: "",
  mapLink: "",
  mapEmbed: "",
  locationOptions: "",
  arrivalDate: "",
  nights: "",
  isPotluck: false,
};

function extractMapEmbedSrc(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("<iframe")) {
    const match = trimmed.match(/\bsrc="([^"]+)"/);
    return match ? match[1] : trimmed;
  }
  return trimmed;
}

export default function NewEventPage({ groups, sidebarGroups }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    ...initialForm,
    groupId: groups[0]?.id ?? "",
  });
  const [state, setState] = useState<{ loading: boolean; error: string | null }>({
    loading: false,
    error: null,
  });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (form.location.trim() && form.locationOptions.trim()) {
      setState({
        loading: false,
        error: "Choose either a confirmed location or comma-separated location vote options",
      });
      return;
    }

    if (hasTooManyLocationOptions(form.locationOptions)) {
      setState({ loading: false, error: "You can add up to 4 location vote options" });
      return;
    }

    setState({ loading: true, error: null });
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({ error: "Failed to create event" }));
      setState({ loading: false, error: payload.error || "Failed to create event" });
      return;
    }
    router.push("/");
  }

  if (groups.length === 0) {
    return (
      <AppShell title="New Event" groups={sidebarGroups}>
        <div className="page-wrap">
          <div className="form-card">
            <p className="form-eyebrow">Events</p>
            <h1 className="form-title">No groups yet</h1>
            <p className="form-sub">
              You need to be a member of a group before you can create an event.
            </p>
            <Button asChild variant="primary">
              <Link href="/groups/new">Create a group first</Link>
            </Button>
          </div>
        </div>
        <style jsx>{`
          .page-wrap { display: flex; justify-content: center; padding: 40px 16px; }
          .form-card { width: 100%; max-width: 560px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-card); padding: 36px 32px; backdrop-filter: blur(10px); display: grid; gap: 16px; }
          .form-eyebrow { text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.75rem; color: var(--accent); margin: 0; }
          .form-title { font-family: var(--font-display); font-size: 1.6rem; font-weight: 700; color: var(--text); margin: 0; line-height: 1.15; }
          .form-sub { font-size: 0.88rem; color: var(--text-muted); margin: 0; line-height: 1.5; }
        `}</style>
      </AppShell>
    );
  }

  return (
    <AppShell title="New Event" groups={sidebarGroups}>
      <div className="page-wrap">
        <div className="form-card">
          <p className="form-eyebrow">Events</p>
          <h1 className="form-title">Schedule a meetup</h1>
          <p className="form-sub">
            Fill in the details — you can always edit later.
          </p>

          <form className="form-body" onSubmit={handleSubmit}>
            <div className="field">
              <Label htmlFor="ev-group">Group</Label>
              <Select
                id="ev-group"
                value={form.groupId}
                onValueChange={(v) => setForm((f) => ({ ...f, groupId: v }))}
                placeholder="Select a group"
              >
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </Select>
              <span className="field-hint">Only groups you&apos;ve joined can host events.</span>
            </div>

            <div className="field">
              <Label htmlFor="ev-title" required>Event title</Label>
              <Input
                id="ev-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Friday campfire set"
                required
                autoFocus
              />
            </div>

            <div className="field">
              <Label htmlFor="ev-desc">Description</Label>
              <Textarea
                id="ev-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Casual acoustic set and shared snacks."
                rows={3}
              />
            </div>

            <div className="two-col">
              <div className="field">
                <Label htmlFor="ev-location">Location</Label>
                <Input
                  id="ev-location"
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="North Grove"
                />
              </div>
              <div className="field">
                <Label htmlFor="ev-locopts">Location vote options</Label>
                <Input
                  id="ev-locopts"
                  value={form.locationOptions}
                  onChange={(e) => setForm((f) => ({ ...f, locationOptions: e.target.value }))}
                  placeholder="Turtle Dunes, Pine Ridge…"
                />
                <span className="field-hint">Comma-separated. Leave Location blank to let the group vote.</span>
              </div>
            </div>

            <div className="two-col">
              <div className="field">
                <Label htmlFor="ev-maplink">Map link</Label>
                <Input
                  id="ev-maplink"
                  type="url"
                  value={form.mapLink}
                  onChange={(e) => setForm((f) => ({ ...f, mapLink: e.target.value }))}
                  placeholder="https://maps.google.com/…"
                />
              </div>
              <div className="field">
                <Label htmlFor="ev-mapembed">Map embed</Label>
                <Input
                  id="ev-mapembed"
                  value={form.mapEmbed}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, mapEmbed: extractMapEmbedSrc(e.target.value) }))
                  }
                  placeholder="Paste Google Maps embed code"
                />
                <span className="field-hint">Share → Embed a map → paste the code or src= URL</span>
              </div>
            </div>

            <div className="two-col">
              <DatePicker
                label="Arrival"
                value={form.arrivalDate}
                onChange={(v) => setForm((f) => ({ ...f, arrivalDate: v }))}
                placeholder="TBD — leave blank to vote later"
              />
              <div className="field">
                <Label htmlFor="ev-nights">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    How many nights?
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            aria-label="Help"
                            style={{ cursor: "help", fontSize: "0.8rem", color: "var(--text-dim)", lineHeight: 1 }}
                          >
                            ⓘ
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          Departure date is calculated automatically as arrival + nights.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </span>
                </Label>
                <Input
                  id="ev-nights"
                  type="number"
                  min="1"
                  max="30"
                  value={form.nights}
                  onChange={(e) => setForm((f) => ({ ...f, nights: e.target.value }))}
                  placeholder="e.g. 3"
                />
              </div>
            </div>

            <div className="checkbox-row">
              <Checkbox
                id="ev-potluck"
                checked={form.isPotluck}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isPotluck: v === true }))}
              />
              <Label htmlFor="ev-potluck">Potluck — everyone brings a dish</Label>
            </div>

            {state.error ? <p className="form-error">{state.error}</p> : null}

            <div className="form-actions">
              <Button asChild variant="ghost">
                <Link href="/">Cancel</Link>
              </Button>
              <Button type="submit" variant="secondary" disabled={state.loading}>
                {state.loading ? "Creating…" : "Create event"}
              </Button>
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
          max-width: 640px;
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

        .two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          align-items: start;
        }

        .field-hint {
          font-size: 0.8rem;
          color: var(--text-dim);
        }

        .checkbox-row {
          display: flex;
          align-items: center;
          gap: 10px;
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
          .two-col { grid-template-columns: 1fr; }
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
  if (!prisma) {
    return { props: { groups: [], sidebarGroups: [] } };
  }

  const userId = session.user.id;
  const groups = await prisma.group.findMany({
    where: {
      OR: [
        { adminId: userId },
        { invites: { some: { userId, usedAt: { not: null } } } },
      ],
    },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  return { props: { groups, sidebarGroups: groups } };
};
