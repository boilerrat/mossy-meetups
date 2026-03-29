import { getServerSession } from "next-auth/next";
import type { GetServerSideProps } from "next";
import { useState } from "react";

import { authOptions } from "../lib/auth";
import { AppShell } from "../components/AppShell";
import { MossTexture } from "../components/MossTexture";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session) return { redirect: { destination: "/login", permanent: false } };
  return { props: {} };
};

// ── Data ───────────────────────────────────────────────────────────────────

const ESSENTIALS = [
  { emoji: "⛺", item: "Tent + footprint", note: "Check poles & stakes the night before" },
  { emoji: "🛌", item: "Sleeping bag rated for the temp", note: "Go 10°F colder than the forecast" },
  { emoji: "💧", item: "Water filter or purification tablets", note: "Minimum 3 L capacity per person per day" },
  { emoji: "🔦", item: "Headlamp + spare batteries", note: "Hands-free beats a hand torch every time" },
  { emoji: "🧰", item: "First-aid kit", note: "See the First Aid section below" },
  { emoji: "🔥", item: "Fire starter (lighter + waterproof matches)", note: "Two methods, always" },
  { emoji: "🗺", item: "Paper map + compass", note: "Phones die; paper doesn't" },
  { emoji: "🧴", item: "Sunscreen SPF 50 + lip balm", note: "Reapply every two hours" },
  { emoji: "🦟", item: "Insect repellent (DEET or picaridin)", note: "Tuck pants into socks in tall grass" },
  { emoji: "🥾", item: "Broken-in hiking boots", note: "Not 'I'll break them in on the trail'" },
  { emoji: "🧤", item: "Layers (base, mid, shell)", note: "Weather turns; layers save trips" },
  { emoji: "🍫", item: "High-calorie snacks", note: "Trail mix, jerky, bars — pack more than you think" },
  { emoji: "🔪", item: "Multi-tool or knife", note: "A good one; cheap ones break" },
  { emoji: "🪢", item: "50 ft paracord", note: "Tarps, clothes lines, bear hangs, and 100 other uses" },
  { emoji: "🧼", item: "Biodegradable soap + trowel", note: "Cat-hole at least 200 ft from water" },
  { emoji: "📱", item: "Charged power bank", note: "Offline maps downloaded before you leave cell range" },
  { emoji: "🪑", item: "Camp chair or sit-pad", note: "Your lower back will thank you" },
  { emoji: "☕", item: "Camp stove + fuel canister", note: "Confirm fuel type matches stove before leaving home" },
];

const FIRST_AID = [
  {
    title: "Cuts & scrapes",
    steps: [
      "Rinse with clean water for at least 2 minutes.",
      "Apply antibiotic ointment (Neosporin or similar).",
      "Cover with a bandage; change daily or when wet.",
      "Watch for redness, warmth, or pus — signs of infection.",
    ],
  },
  {
    title: "Burns",
    steps: [
      "Cool under running water for 10 minutes. No ice.",
      "Cover with non-stick sterile dressing.",
      "Do NOT pop blisters.",
      "Seek care if larger than a palm or on face/hands/joints.",
    ],
  },
  {
    title: "Sprains & strains",
    steps: [
      "Rest — stop walking on it if possible.",
      "Ice (wrapped in cloth) 20 min on, 20 off.",
      "Compress with an ACE bandage, firm but not tight.",
      "Elevate above the heart when resting.",
      "Evacuate if bone tenderness or inability to bear weight.",
    ],
  },
  {
    title: "Bee stings & allergic reactions",
    steps: [
      "Remove stinger by scraping (not pinching) with a card edge.",
      "Apply ice and hydrocortisone cream.",
      "For hives, swelling of lips/throat, or difficulty breathing — use EpiPen if available and evacuate immediately.",
      "Anyone with a known allergy should carry two epinephrine auto-injectors.",
    ],
  },
  {
    title: "Heat exhaustion",
    steps: [
      "Move to shade; loosen clothing.",
      "Cool with wet cloths to neck, armpits, groin.",
      "Sip cool water or electrolyte drink if alert.",
      "Vomiting, confusion, or no sweating = heat stroke → evacuate.",
    ],
  },
  {
    title: "Hypothermia",
    steps: [
      "Remove wet clothing; replace with dry layers.",
      "Insulate from the ground (sleeping pad).",
      "Share body heat in a sleeping bag if severe.",
      "Warm sweet drinks if fully conscious.",
      "Do not rub extremities — causes cold blood to rush to core.",
    ],
  },
];

const TICK_GUIDE = {
  prevention: [
    "Wear long sleeves and tuck pants into light-coloured socks so you spot ticks easily.",
    "Use DEET ≥20% or permethrin-treated clothing on pants, boots, and gaiters.",
    "Stick to the centre of trails; ticks quest from brush and leaf litter.",
  ],
  checking: [
    "Check within 2 hours of coming inside — transmission risk rises after 24–36 hours of attachment.",
    "Focus on: scalp & hair, behind ears, neck, armpits, belt line, behind knees, and between toes.",
    "Have a buddy check your back and the backs of knees.",
  ],
  removal: [
    "Use fine-tipped tweezers. Grasp the tick as close to the skin as possible.",
    "Pull upward with steady, even pressure. No twisting or jerking.",
    "Clean the bite site and your hands with alcohol or soap and water.",
    "Dispose in a sealed bag or flush. Never crush with fingers.",
    "Do NOT use petroleum jelly, nail polish, or heat to make the tick detach.",
  ],
  whenToSeeDoctor: [
    "A bull's-eye rash (erythema migrans) appears — Lyme disease indicator.",
    "Fever, chills, fatigue, or muscle aches within 30 days.",
    "The tick was attached for more than 36 hours.",
    "You are in a high-risk area (northeast US, upper midwest, parts of Europe).",
  ],
};

const RAINY_DAY = [
  { emoji: "🃏", title: "Cards & dice", body: "Cribbage, Euchre, Spades, Yahtzee. Bring a waterproof deck." },
  { emoji: "📖", title: "Read aloud to each other", body: "Pick one person's favourite and take turns reading chapters. Better than you'd think." },
  { emoji: "🎵", title: "Acoustic jam session", body: "Deadheads know: the rain makes it sound better. Pull out the guitars." },
  { emoji: "✍️", title: "Write the setlist", body: "Vote on the ideal Grateful Dead show setlist. Argue about it for hours." },
  { emoji: "🍲", title: "Cook something ambitious", body: "Rain is the universe telling you to make a proper camp stew. Take your time." },
  { emoji: "🧩", title: "Camp puzzles & trivia", body: "Nature/wildlife trivia cards are lightweight and surprisingly rowdy." },
  { emoji: "📓", title: "Journal", body: "Write it down. You will not remember as much as you think you will." },
  { emoji: "🌿", title: "Identify what's growing around you", body: "iNaturalist works offline. Learn three plants you didn't know before this trip." },
  { emoji: "🪵", title: "Whittle something", body: "A knife, a stick, patience. It's meditative. Make a spoon." },
  { emoji: "🎲", title: "Invent a camp game", body: "The best camp traditions started with boredom and creativity. Go." },
];

const ETIQUETTE = [
  {
    commandment: "I. Thou shalt observe quiet hours",
    rule: "10 PM to 7 AM. Voices low, music off. Other people's tents are closer than they feel.",
  },
  {
    commandment: "II. Thou shalt leave no trace",
    rule: "Pack it in, pack it out. All of it. Including that twist-tie and the burnt foil.",
  },
  {
    commandment: "III. Thou shalt share the fire wood",
    rule: "Don't hoard the last of the split wood. Cut more, or offer what you have.",
  },
  {
    commandment: "IV. Thou shalt keep a clean kitchen",
    rule: "Wash dishes, secure food, and hang your bear bag every night. One lax night ruins the whole trip.",
  },
  {
    commandment: "V. Thou shalt not monopolise the water source",
    rule: "Fill your containers, then step aside. Rinse upstream, wash downstream — always downstream.",
  },
  {
    commandment: "VI. Thou shalt dig thy cat hole 200 ft from water",
    rule: "Measure it. Then add more. Your fellow campers drink that water.",
  },
  {
    commandment: "VII. Thou shalt mind thy pets",
    rule: "On leash when required. Pick it up. Not everyone wants your dog in their face.",
  },
  {
    commandment: "VIII. Thou shalt not walk through others' campsites",
    rule: "Go around. A campsite, however informal, is someone's temporary home.",
  },
  {
    commandment: "IX. Thou shalt offer before thou asketh",
    rule: "Got extra coffee? Offer. Need something? Ask once. The spirit of the camp is generosity.",
  },
  {
    commandment: "X. Thou shalt leave the site better than thou found it",
    rule: "Pick up one piece of litter that isn't yours. Everyone does this; nobody's campsite is ever worse.",
  },
];

// ── Component ──────────────────────────────────────────────────────────────

const SECTIONS = ["essentials", "first-aid", "ticks", "rainy-day", "etiquette"] as const;
type Section = typeof SECTIONS[number];

const SECTION_LABELS: Record<Section, string> = {
  essentials: "📦 Camping Essentials",
  "first-aid": "🩹 First Aid",
  ticks: "🕷 Tick Safety",
  "rainy-day": "🌧 Rainy Day Activities",
  etiquette: "📜 Camp Commandments",
};

export default function CampGuide() {
  const [activeSection, setActiveSection] = useState<Section>("essentials");

  return (
    <AppShell title="Camp Guide">
      <div className="guide-root">
        <header className="guide-header">
          <h1>The Mossy Meetups Field Manual</h1>
          <p className="guide-sub">Practical wisdom for happy campers, written in the spirit of the trail.</p>
          <div className="moss-divider">
            <MossTexture variant="divider" />
          </div>
        </header>

        {/* Tab navigation */}
        <nav className="guide-tabs" aria-label="Guide sections">
          {SECTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className={`guide-tab ${activeSection === s ? "guide-tab--active" : ""}`}
              onClick={() => setActiveSection(s)}
              aria-current={activeSection === s ? "page" : undefined}
            >
              {SECTION_LABELS[s]}
            </button>
          ))}
        </nav>

        <div className="guide-content">
          {/* ── Essentials ── */}
          {activeSection === "essentials" && (
            <section>
              <h2>📦 Camping Essentials Checklist</h2>
              <p className="section-intro">
                The timeless packing list. Tick everything before you leave the driveway.
              </p>
              <ul className="checklist">
                {ESSENTIALS.map(({ emoji, item, note }) => (
                  <li key={item} className="checklist-item">
                    <span className="check-emoji">{emoji}</span>
                    <div>
                      <strong>{item}</strong>
                      <span className="check-note">{note}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="print-note">
                <a href="#" onClick={(e) => { e.preventDefault(); window.print(); }} className="print-link">
                  🖨 Print this checklist
                </a>
              </p>
            </section>
          )}

          {/* ── First Aid ── */}
          {activeSection === "first-aid" && (
            <section>
              <h2>🩹 Basic Wilderness First Aid</h2>
              <p className="section-intro">
                Not a substitute for a first-aid course or professional care — but useful reminders when you&apos;re
                an hour from the trailhead.
              </p>
              <div className="cards-grid">
                {FIRST_AID.map(({ title, steps }) => (
                  <div key={title} className="info-card">
                    <h3>{title}</h3>
                    <ol className="steps-list">
                      {steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
              <p className="disclaimer">
                Always seek professional medical care when in doubt. In an emergency, call 911 or the
                nearest park emergency line.
              </p>
            </section>
          )}

          {/* ── Ticks ── */}
          {activeSection === "ticks" && (
            <section>
              <h2>🕷 Tick Safety</h2>
              <p className="section-intro">
                Most tick bites are uneventful. The ones that aren&apos;t are entirely preventable.
              </p>
              <div className="tick-blocks">
                <div className="info-card">
                  <h3>Prevention</h3>
                  <ul className="steps-list">
                    {TICK_GUIDE.prevention.map((s) => <li key={s}>{s}</li>)}
                  </ul>
                </div>
                <div className="info-card">
                  <h3>How to check</h3>
                  <ul className="steps-list">
                    {TICK_GUIDE.checking.map((s) => <li key={s}>{s}</li>)}
                  </ul>
                </div>
                <div className="info-card">
                  <h3>Safe removal</h3>
                  <ol className="steps-list">
                    {TICK_GUIDE.removal.map((s) => <li key={s}>{s}</li>)}
                  </ol>
                </div>
                <div className="info-card info-card--warn">
                  <h3>When to see a doctor</h3>
                  <ul className="steps-list">
                    {TICK_GUIDE.whenToSeeDoctor.map((s) => <li key={s}>{s}</li>)}
                  </ul>
                </div>
              </div>
            </section>
          )}

          {/* ── Rainy day ── */}
          {activeSection === "rainy-day" && (
            <section>
              <h2>🌧 Rainy Day Activities</h2>
              <p className="section-intro">
                The rain is part of the trip. Lean in — some of the best camp moments happen under a tarp.
              </p>
              <div className="rainy-grid">
                {RAINY_DAY.map(({ emoji, title, body }) => (
                  <div key={title} className="rainy-card">
                    <span className="rainy-emoji">{emoji}</span>
                    <div>
                      <strong>{title}</strong>
                      <p className="rainy-body">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Etiquette ── */}
          {activeSection === "etiquette" && (
            <section>
              <h2>📜 The Ten Camp Commandments</h2>
              <p className="section-intro">
                Handed down from many a muddy festival field. Observe them and thou shalt be welcomed back.
              </p>
              <ol className="commandments">
                {ETIQUETTE.map(({ commandment, rule }) => (
                  <li key={commandment} className="commandment-item">
                    <h3 className="commandment-title">{commandment}</h3>
                    <p className="commandment-rule">{rule}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </div>

      <style jsx>{`
        .guide-root {
          max-width: 860px;
          margin: 0 auto;
        }

        .guide-header {
          margin-bottom: 28px;
        }

        h1 {
          font-family: var(--font-display, Georgia, serif);
          font-size: clamp(1.5rem, 4vw, 2.2rem);
          margin: 0 0 8px;
          color: var(--text);
        }

        .guide-sub {
          color: var(--text-muted);
          margin: 0 0 16px;
          font-size: 1rem;
        }

        .moss-divider {
          height: 14px;
          overflow: hidden;
          opacity: 0.7;
          margin-bottom: 4px;
        }

        /* ── Tabs ── */
        .guide-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 28px;
        }

        .guide-tab {
          font-family: inherit;
          font-size: 0.82rem;
          padding: 7px 14px;
          border-radius: 999px;
          border: 1px solid var(--border-strong);
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }

        .guide-tab:hover {
          background: rgba(215, 185, 127, 0.08);
          color: var(--text);
        }

        .guide-tab--active {
          background: rgba(215, 185, 127, 0.18);
          border-color: var(--accent);
          color: var(--accent-hover, #f4dcb0);
          font-weight: 600;
        }

        /* ── Section wrapper ── */
        .guide-content {
          animation: fade-in 0.2s ease;
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        h2 {
          font-family: var(--font-display, Georgia, serif);
          font-size: 1.5rem;
          margin: 0 0 8px;
          color: var(--text);
        }

        .section-intro {
          color: var(--text-muted);
          margin: 0 0 20px;
          font-size: 0.95rem;
          line-height: 1.6;
        }

        /* ── Essentials checklist ── */
        .checklist {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 8px;
        }

        .checklist-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 12px 14px;
        }

        .check-emoji {
          font-size: 1.3rem;
          line-height: 1;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .check-note {
          display: block;
          font-size: 0.82rem;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .print-note {
          margin-top: 20px;
          font-size: 0.85rem;
        }

        .print-link {
          color: var(--accent);
          text-decoration: none;
          font-weight: 600;
          border-bottom: 1px solid rgba(215, 185, 127, 0.3);
          padding-bottom: 1px;
        }

        /* ── Cards grid ── */
        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 14px;
        }

        .info-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 16px 18px;
        }

        .info-card--warn {
          border-color: rgba(240, 160, 100, 0.3);
          background: rgba(240, 160, 100, 0.05);
        }

        .info-card h3 {
          font-size: 1rem;
          margin: 0 0 10px;
          color: var(--accent-hover, #f4dcb0);
        }

        .steps-list {
          margin: 0;
          padding-left: 18px;
          display: grid;
          gap: 6px;
        }

        .steps-list li {
          font-size: 0.88rem;
          color: var(--text-muted);
          line-height: 1.5;
        }

        .disclaimer {
          margin-top: 16px;
          font-size: 0.82rem;
          color: var(--text-dim);
          font-style: italic;
        }

        /* ── Ticks ── */
        .tick-blocks {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 14px;
        }

        /* ── Rainy day ── */
        .rainy-grid {
          display: grid;
          gap: 10px;
        }

        .rainy-card {
          display: flex;
          gap: 14px;
          align-items: flex-start;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 12px 16px;
        }

        .rainy-emoji {
          font-size: 1.6rem;
          line-height: 1;
          flex-shrink: 0;
        }

        .rainy-body {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin: 4px 0 0;
          line-height: 1.5;
        }

        /* ── Commandments ── */
        .commandments {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 12px;
          counter-reset: commandment;
        }

        .commandment-item {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 16px 18px;
        }

        .commandment-title {
          font-family: var(--font-display, Georgia, serif);
          font-size: 1rem;
          margin: 0 0 6px;
          color: var(--accent, #d7b97f);
        }

        .commandment-rule {
          margin: 0;
          font-size: 0.9rem;
          color: var(--text-muted);
          line-height: 1.55;
        }

        @media print {
          .guide-tabs, .guide-header .moss-divider { display: none; }
          .guide-root { max-width: 100%; }
          .info-card, .checklist-item, .rainy-card, .commandment-item {
            break-inside: avoid;
            border: 1px solid #ccc;
            background: white;
          }
        }

        @media (max-width: 600px) {
          .guide-tabs { gap: 5px; }
          .guide-tab { font-size: 0.75rem; padding: 6px 10px; }
          .cards-grid, .tick-blocks { grid-template-columns: 1fr; }
        }
      `}</style>
    </AppShell>
  );
}
