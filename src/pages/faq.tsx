import { getServerSession } from "next-auth/next";
import type { GetServerSideProps } from "next";
import { useState } from "react";

import { getAuthOptions } from "../lib/auth";
import { AppShell } from "../components/AppShell";
import { MossTexture } from "../components/MossTexture";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, getAuthOptions());
  if (!session) return { redirect: { destination: "/login", permanent: false } };
  return { props: {} };
};

const FAQS: Array<{ q: string; a: string | string[] }> = [
  {
    q: "How do I create a group?",
    a: [
      "From the dashboard, find the **Create a Group** form on the left side of the screen.",
      "Enter a name for your group and click **Create group**.",
      "You'll automatically become the group admin.",
    ],
  },
  {
    q: "How do I invite people to my group?",
    a: [
      "Open the group detail page by clicking the group name in the sidebar or from the Groups panel.",
      "Find the **Invite a member** form and enter their email address.",
      "They'll receive a magic-link email. When they click it and sign in, they're automatically added to the group.",
    ],
  },
  {
    q: "What's a TBD event?",
    a: "An event without a confirmed arrival date. TBD events appear in the **Needs a date** section on the dashboard and group pages. Members can propose candidate dates and vote on availability until the admin confirms one.",
  },
  {
    q: "How does date voting work?",
    a: [
      "On a TBD event's detail page you'll see the **Date Availability Grid**.",
      "Any group member can propose a date using the picker at the bottom.",
      "Click your cell in the grid to mark yourself as available (green ✓) or unavailable (empty).",
      "The group admin sees **Confirm date** buttons at the bottom of the grid — clicking one sets the arrival date and moves the event to Upcoming.",
    ],
  },
  {
    q: "How does location voting work?",
    a: [
      "The admin can add candidate locations in two ways: during event creation/editing using comma-separated names, or later on the event detail page.",
      "You can add up to 4 location options per event.",
      "Each member can cast one vote per event by clicking a cell in the Location Poll grid.",
      "You can change your vote at any time.",
      "The admin confirms a location once the group has decided.",
    ],
  },
  {
    q: "How do I create an event that needs a location vote?",
    a: [
      "Create or edit the event from the dashboard.",
      "Leave the **Location** field blank.",
      "In **Location vote options**, enter comma-separated names such as **Turtle Dunes, Pine Ridge, North Grove**.",
      "Save the event — it will appear in the **Needs a location** section until the admin confirms one option.",
    ],
  },
  {
    q: "How do I RSVP to an event?",
    a: [
      "Find the event on the dashboard or in the group page.",
      "Click **Going**, **Maybe**, or **Can't go** on the event card.",
      "Your RSVP is saved immediately and the count on the card updates.",
      "You can change your response at any time.",
    ],
  },
  {
    q: "Does each event have its own discussion thread?",
    a: [
      "Yes. Open any event detail page and scroll to the **Camp thread** panel.",
      "Every event has one flat conversation thread that stays with it while dates and locations are being decided and after the event is confirmed.",
      "All event members can post messages.",
      "You can edit or delete your own messages, and the group admin can moderate the whole thread.",
    ],
  },
  {
    q: "What does 'Maybe' mean for headcount?",
    a: "Maybe counts toward the displayed RSVP total so organisers know to plan for you, but it flags your response as uncertain. The event admin can see the breakdown (Going / Maybe / Can't go) on the event detail page.",
  },
  {
    q: "How do I add this event to my calendar?",
    a: [
      "Open the event detail page.",
      "Once the event has a confirmed arrival date, you'll see a **Download .ics** link.",
      "Click it — your device will offer to add it to Apple Calendar, Google Calendar, Outlook, or any ICS-compatible app.",
    ],
  },
  {
    q: "Can I export all my events at once?",
    a: [
      "Yes. On the dashboard, open the **Upcoming events** panel.",
      "Use the **Export all events** button to download one `.ics` file containing all confirmed events you can access.",
      "Import that file into Apple Calendar, Google Calendar, Outlook, or any other ICS-compatible calendar app.",
    ],
  },
  {
    q: "What are the List, Week, and Month views?",
    a: [
      "**List** is the default view and shows full event cards.",
      "**Week** shows a rolling 7-day window starting from today.",
      "**Month** shows a calendar-style overview of upcoming events.",
      "Use the view toggle in the **Upcoming events** panel to switch between them at any time.",
    ],
  },
  {
    q: "How does weather work?",
    a: [
      "Confirmed events with a location show forecast cards on the event card.",
      "Weather is displayed in Celsius first.",
      "Multi-night events show one forecast tile per day of the trip.",
      "If an event has no confirmed location yet, weather won't appear until the location is set.",
    ],
  },
  {
    q: "Can I edit or delete an event?",
    a: "Only the group admin can edit or delete events. Use the **Edit** and **Delete** buttons that appear on the event card when you're the admin. Deleting an event is permanent and removes all RSVPs, date votes, and location votes.",
  },
  {
    q: "Can I edit or delete a group?",
    a: "Only the group admin can edit or delete the group. Deleting a group permanently removes all its events, invites, and RSVPs. You'll be asked to confirm before anything is removed.",
  },
  {
    q: "I didn't receive my magic-link email. What do I do?",
    a: [
      "Check your spam or junk folder first.",
      "Make sure you typed the exact same email address you used to sign up.",
      "Magic links expire after 24 hours — request a fresh one.",
      "If the problem persists, ask your group admin to send a new invite to your address.",
    ],
  },
  {
    q: "How do I update my profile?",
    a: "Click your name in the top navigation bar, or go to the **Profile** page. You can update your display name, phone number, hometown, and a short bio there.",
  },
  {
    q: "Is there a mobile app?",
    a: "Not yet — Mossy Meetups is a mobile-friendly web app that works well in any phone browser. You can add it to your home screen for an app-like experience (use 'Add to Home Screen' in Safari or Chrome).",
  },
  {
    q: "Can other group members see my RSVP?",
    a: "Yes. All group members can see who is Going, Maybe, and Can't go on the event detail page. This is by design — it helps everyone plan.",
  },
];

function Answer({ a }: { a: string | string[] }) {
  if (typeof a === "string") {
    return <p className="faq-answer">{a}</p>;
  }
  return (
    <ol className="faq-steps">
      {a.map((step) => (
        <li key={step} dangerouslySetInnerHTML={{ __html: step.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
      ))}
    </ol>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function toggle(i: number) {
    setOpenIndex((prev) => (prev === i ? null : i));
  }

  return (
    <AppShell title="FAQ">
      <div className="faq-root">
        <header className="faq-header">
          <h1>How-To Guide & FAQ</h1>
          <p className="faq-sub">
            Everything you need to know about creating groups, planning events, voting on dates, and
            getting your people together.
          </p>
          <div className="moss-divider">
            <MossTexture variant="divider" />
          </div>
        </header>

        <ol className="faq-list">
          {FAQS.map(({ q, a }, i) => {
            const isOpen = openIndex === i;
            return (
              <li key={q} className="faq-item">
                <button
                  type="button"
                  className={`faq-q ${isOpen ? "faq-q--open" : ""}`}
                  onClick={() => toggle(i)}
                  aria-expanded={isOpen}
                >
                  <span>{q}</span>
                  <span className="faq-chevron" aria-hidden="true">{isOpen ? "▲" : "▼"}</span>
                </button>
                {isOpen ? (
                  <div className="faq-body">
                    <Answer a={a} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>

        <div className="faq-footer-moss">
          <MossTexture variant="footer" />
        </div>
      </div>

      <style jsx>{`
        .faq-root {
          max-width: 720px;
          margin: 0 auto;
        }

        .faq-header {
          margin-bottom: 28px;
        }

        h1 {
          font-family: var(--font-display, Georgia, serif);
          font-size: clamp(1.5rem, 4vw, 2.2rem);
          margin: 0 0 8px;
          color: var(--text);
        }

        .faq-sub {
          color: var(--text-muted);
          margin: 0 0 16px;
          font-size: 0.95rem;
          line-height: 1.6;
        }

        .moss-divider {
          height: 14px;
          overflow: hidden;
          opacity: 0.7;
        }

        .faq-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 8px;
        }

        .faq-item {
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
          background: var(--bg-card);
          transition: border-color 0.15s;
        }

        .faq-item:has(.faq-q--open) {
          border-color: rgba(215, 185, 127, 0.3);
        }

        .faq-q {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 16px 18px;
          background: transparent;
          border: 0;
          font-family: inherit;
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text);
          cursor: pointer;
          text-align: left;
          transition: background 0.12s;
        }

        .faq-q:hover {
          background: rgba(215, 185, 127, 0.06);
        }

        .faq-q--open {
          color: var(--accent-hover, #f4dcb0);
        }

        .faq-chevron {
          font-size: 0.6rem;
          color: var(--text-dim);
          flex-shrink: 0;
        }

        .faq-body {
          padding: 0 18px 16px;
          border-top: 1px solid var(--border);
        }

        :global(.faq-answer) {
          margin: 12px 0 0;
          font-size: 0.9rem;
          color: var(--text-muted);
          line-height: 1.6;
        }

        :global(.faq-steps) {
          margin: 12px 0 0;
          padding-left: 20px;
          display: grid;
          gap: 6px;
        }

        :global(.faq-steps li) {
          font-size: 0.9rem;
          color: var(--text-muted);
          line-height: 1.55;
        }

        .faq-footer-moss {
          height: 40px;
          overflow: hidden;
          opacity: 0.6;
          margin-top: 32px;
        }

        @media (max-width: 600px) {
          .faq-q { font-size: 0.88rem; padding: 13px 14px; }
          .faq-body { padding: 0 14px 13px; }
        }
      `}</style>
    </AppShell>
  );
}
