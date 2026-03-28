import Link from "next/link";
import { useState } from "react";

export interface WeekEvent {
  id: string;
  title: string;
  groupName: string;
  arrivalDate: string; // ISO string, non-null (TBD events go elsewhere)
}

interface WeekViewProps {
  events: WeekEvent[];
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Monday of the ISO week containing `date` */
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatWeekLabel(monday: Date): string {
  const sunday = addDays(monday, 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const fmt = (d: Date) => new Intl.DateTimeFormat("en-CA", opts).format(d);
  if (monday.getFullYear() !== sunday.getFullYear()) {
    return `${fmt(monday)}, ${monday.getFullYear()} – ${fmt(sunday)}, ${sunday.getFullYear()}`;
  }
  if (monday.getMonth() !== sunday.getMonth()) {
    return `${fmt(monday)} – ${fmt(sunday)}, ${sunday.getFullYear()}`;
  }
  return `${new Intl.DateTimeFormat("en-CA", { month: "long" }).format(monday)} ${monday.getDate()}–${sunday.getDate()}, ${monday.getFullYear()}`;
}

function formatDayNum(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { day: "numeric", month: "short" }).format(date);
}

function formatEventTime(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeStyle: "short" }).format(new Date(iso));
}

export function WeekView({ events }: WeekViewProps) {
  const today = new Date();
  const [monday, setMonday] = useState(() => getMonday(today));
  const [activeDayIndex, setActiveDayIndex] = useState(0); // mobile: which day is showing

  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const weekLabel = formatWeekLabel(monday);

  function prevWeek() { setMonday((m) => addDays(m, -7)); }
  function nextWeek() { setMonday((m) => addDays(m, 7)); }
  function goToday() {
    const newMonday = getMonday(today);
    setMonday(newMonday);
    const todayIdx = days.findIndex((d) => sameDay(d, today));
    setActiveDayIndex(todayIdx >= 0 ? todayIdx : 0);
  }

  function eventsForDay(day: Date): WeekEvent[] {
    return events.filter((e) => sameDay(new Date(e.arrivalDate), day));
  }

  const isThisWeek = sameDay(monday, getMonday(today));

  return (
    <div className="wv-root">
      {/* Week navigation */}
      <div className="wv-nav">
        <div className="wv-nav-left">
          <button type="button" className="wv-arrow" onClick={prevWeek} aria-label="Previous week">←</button>
          <span className="wv-label">{weekLabel}</span>
          <button type="button" className="wv-arrow" onClick={nextWeek} aria-label="Next week">→</button>
        </div>
        {!isThisWeek ? (
          <button type="button" className="wv-today-btn" onClick={goToday}>
            Today
          </button>
        ) : null}
      </div>

      {/* Desktop: 7-column grid */}
      <div className="wv-grid">
        {days.map((day, i) => {
          const dayEvents = eventsForDay(day);
          const isToday = sameDay(day, today);
          return (
            <div key={i} className={`wv-col ${isToday ? "wv-col--today" : ""}`}>
              <div className="wv-col-header">
                <span className="wv-day-name">{DAY_NAMES[i]}</span>
                <span className={`wv-day-num ${isToday ? "wv-day-num--today" : ""}`}>
                  {formatDayNum(day)}
                </span>
              </div>
              <div className="wv-events">
                {dayEvents.length === 0 ? (
                  <div className="wv-empty" />
                ) : (
                  dayEvents.map((ev) => (
                    <Link key={ev.id} href={`/events/${ev.id}`} className="wv-event">
                      <span className="wv-event-title">{ev.title}</span>
                      <span className="wv-event-meta">{formatEventTime(ev.arrivalDate)}</span>
                      <span className="wv-event-group">{ev.groupName}</span>
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: single-day view with day tabs */}
      <div className="wv-mobile">
        <div className="wv-day-tabs">
          {days.map((day, i) => {
            const isToday = sameDay(day, today);
            const hasEvents = eventsForDay(day).length > 0;
            return (
              <button
                key={i}
                type="button"
                className={[
                  "wv-day-tab",
                  activeDayIndex === i ? "wv-day-tab--active" : "",
                  isToday ? "wv-day-tab--today" : "",
                ].join(" ")}
                onClick={() => setActiveDayIndex(i)}
              >
                <span className="wv-tab-name">{DAY_NAMES[i]}</span>
                <span className="wv-tab-num">{day.getDate()}</span>
                {hasEvents ? <span className="wv-tab-dot" /> : null}
              </button>
            );
          })}
        </div>

        <div className="wv-mobile-day">
          <p className="wv-mobile-day-label">{DAY_NAMES_FULL[activeDayIndex]}, {formatDayNum(days[activeDayIndex])}</p>
          {eventsForDay(days[activeDayIndex]).length === 0 ? (
            <p className="wv-mobile-empty">No events this day</p>
          ) : (
            eventsForDay(days[activeDayIndex]).map((ev) => (
              <Link key={ev.id} href={`/events/${ev.id}`} className="wv-mobile-event">
                <span className="wv-event-title">{ev.title}</span>
                <span className="wv-event-meta">
                  {formatEventTime(ev.arrivalDate)} · {ev.groupName}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>

      <style jsx>{`
        .wv-root {
          width: 100%;
        }

        /* ── Navigation ── */
        .wv-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .wv-nav-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .wv-arrow {
          font-family: inherit;
          font-size: 1rem;
          background: rgba(243, 235, 220, 0.07);
          border: 0;
          color: #c9c2b3;
          border-radius: 8px;
          padding: 4px 10px;
          cursor: pointer;
        }

        .wv-arrow:hover {
          background: rgba(243, 235, 220, 0.12);
          color: #f3ebdc;
        }

        .wv-label {
          font-size: 0.9rem;
          color: #d4d0c7;
          font-weight: 600;
        }

        .wv-today-btn {
          font-family: inherit;
          font-size: 0.82rem;
          background: transparent;
          border: 1px solid rgba(243, 235, 220, 0.2);
          color: #c9c2b3;
          border-radius: 999px;
          padding: 4px 12px;
          cursor: pointer;
        }

        .wv-today-btn:hover {
          border-color: rgba(243, 235, 220, 0.4);
          color: #f3ebdc;
        }

        /* ── Desktop grid ── */
        .wv-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 6px;
          min-height: 200px;
        }

        .wv-col {
          border: 1px solid rgba(243, 235, 220, 0.08);
          border-radius: 14px;
          overflow: hidden;
        }

        .wv-col--today {
          border-color: rgba(215, 185, 127, 0.3);
        }

        .wv-col-header {
          padding: 8px 8px 6px;
          border-bottom: 1px solid rgba(243, 235, 220, 0.07);
          background: rgba(255, 255, 255, 0.03);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

        .wv-day-name {
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #8a847a;
        }

        .wv-day-num {
          font-size: 0.78rem;
          color: #c9c2b3;
        }

        .wv-day-num--today {
          color: #d7b97f;
          font-weight: 700;
        }

        .wv-events {
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-height: 80px;
        }

        .wv-empty {
          height: 80px;
        }

        .wv-event {
          display: block;
          background: rgba(215, 185, 127, 0.1);
          border: 1px solid rgba(215, 185, 127, 0.2);
          border-radius: 8px;
          padding: 5px 7px;
          text-decoration: none;
          transition: background 0.15s;
        }

        .wv-event:hover {
          background: rgba(215, 185, 127, 0.18);
        }

        .wv-event-title {
          display: block;
          font-size: 0.75rem;
          color: #f4dcb0;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .wv-event-meta {
          display: block;
          font-size: 0.68rem;
          color: #8a847a;
          margin-top: 1px;
        }

        .wv-event-group {
          display: block;
          font-size: 0.65rem;
          color: #d7b97f;
          margin-top: 1px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ── Mobile ── */
        .wv-mobile {
          display: none;
        }

        .wv-day-tabs {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
          margin-bottom: 12px;
        }

        .wv-day-tab {
          font-family: inherit;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 6px 2px;
          border-radius: 10px;
          border: 0;
          background: transparent;
          color: #c9c2b3;
          cursor: pointer;
          position: relative;
        }

        .wv-day-tab--active {
          background: rgba(215, 185, 127, 0.15);
          color: #f4dcb0;
        }

        .wv-day-tab--today .wv-tab-num {
          color: #d7b97f;
          font-weight: 700;
        }

        .wv-tab-name {
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .wv-tab-num {
          font-size: 0.9rem;
        }

        .wv-tab-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #d7b97f;
          position: absolute;
          bottom: 4px;
        }

        .wv-mobile-day-label {
          font-size: 0.88rem;
          color: #d7b97f;
          margin: 0 0 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .wv-mobile-empty {
          font-size: 0.9rem;
          color: #8a847a;
          margin: 0;
        }

        .wv-mobile-event {
          display: block;
          background: rgba(215, 185, 127, 0.1);
          border: 1px solid rgba(215, 185, 127, 0.2);
          border-radius: 12px;
          padding: 12px 14px;
          text-decoration: none;
          margin-bottom: 8px;
        }

        .wv-mobile-event .wv-event-title {
          font-size: 0.95rem;
          white-space: normal;
        }

        .wv-mobile-event .wv-event-meta {
          font-size: 0.82rem;
          margin-top: 4px;
        }

        @media (max-width: 768px) {
          .wv-grid {
            display: none;
          }

          .wv-mobile {
            display: block;
          }
        }
      `}</style>
    </div>
  );
}
