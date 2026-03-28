import { useEffect, useRef, useState } from "react";

interface DatePickerProps {
  label: string;
  value: string; // "YYYY-MM-DDTHH:mm" or ""
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}

const DAY_HEADERS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parseValue(val: string): { year: number; month: number; day: number; hour: number; minute: number } | null {
  if (!val) return null;
  const [datePart, timePart = "00:00"] = val.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  if (!year || !month || !day) return null;
  return { year, month: month - 1, day, hour: hour || 0, minute: minute || 0 };
}

function formatDisplay(val: string): string {
  if (!val) return "";
  const parsed = parseValue(val);
  if (!parsed) return "";
  const { year, month, day, hour, minute } = parsed;
  const date = new Date(year, month, day, hour, minute);
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function toDatetimeLocal(year: number, month: number, day: number, hour: number, minute: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month + 1)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
}

function buildCalendarDays(year: number, month: number): Array<{ day: number; month: number; year: number; otherMonth: boolean }> {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells: Array<{ day: number; month: number; year: number; otherMonth: boolean }> = [];

  // Days from prev month
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const [m, y] = month === 0 ? [11, year - 1] : [month - 1, year];
    cells.push({ day: d, month: m, year: y, otherMonth: true });
  }

  // Days in this month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month, year, otherMonth: false });
  }

  // Days from next month to fill last row
  const remainder = cells.length % 7;
  if (remainder !== 0) {
    for (let d = 1; d <= 7 - remainder; d++) {
      const [m, y] = month === 11 ? [0, year + 1] : [month + 1, year];
      cells.push({ day: d, month: m, year: y, otherMonth: true });
    }
  }

  return cells;
}

export function DatePicker({ label, value, onChange, required, placeholder = "Pick a date…" }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const parsed = parseValue(value);

  const today = new Date();
  const [viewYear, setViewYear] = useState(parsed?.year ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? today.getMonth());
  const [hour, setHour] = useState(parsed?.hour ?? 12);
  const [minute, setMinute] = useState(parsed?.minute ?? 0);

  const overlayRef = useRef<HTMLDivElement>(null);

  // Keep time inputs in sync with the selected value
  useEffect(() => {
    if (parsed) {
      setHour(parsed.hour);
      setMinute(parsed.minute);
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  function selectDay(cell: { day: number; month: number; year: number }) {
    onChange(toDatetimeLocal(cell.year, cell.month, cell.day, hour, minute));
  }

  function confirmTime() {
    if (!parsed) return;
    onChange(toDatetimeLocal(parsed.year, parsed.month, parsed.day, hour, minute));
    setOpen(false);
  }

  function clearValue() {
    onChange("");
    setOpen(false);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  const cells = buildCalendarDays(viewYear, viewMonth);

  function isSelected(cell: { day: number; month: number; year: number }) {
    if (!parsed) return false;
    return parsed.year === cell.year && parsed.month === cell.month && parsed.day === cell.day;
  }

  function isToday(cell: { day: number; month: number; year: number }) {
    return (
      today.getFullYear() === cell.year &&
      today.getMonth() === cell.month &&
      today.getDate() === cell.day
    );
  }

  return (
    <div className="dp-root">
      <label className="dp-label">
        {label}
        {required ? <span className="dp-required"> *</span> : null}
      </label>
      <button
        type="button"
        className={`dp-trigger ${value ? "" : "dp-trigger--empty"}`}
        onClick={() => setOpen(true)}
      >
        {value ? formatDisplay(value) : placeholder}
      </button>

      {open ? (
        <div
          ref={overlayRef}
          className="dp-overlay"
          onClick={(e) => { if (e.target === overlayRef.current) setOpen(false); }}
        >
          <div className="dp-modal">
            {/* Month navigation */}
            <div className="dp-month-nav">
              <button type="button" className="dp-arrow" onClick={prevMonth} aria-label="Previous month">←</button>
              <span className="dp-month-label">{MONTHS[viewMonth]} {viewYear}</span>
              <button type="button" className="dp-arrow" onClick={nextMonth} aria-label="Next month">→</button>
            </div>

            {/* Day headers */}
            <div className="dp-grid dp-header-row">
              {DAY_HEADERS.map((d) => (
                <span key={d} className="dp-day-header">{d}</span>
              ))}
            </div>

            {/* Day cells */}
            <div className="dp-grid">
              {cells.map((cell, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectDay(cell)}
                  className={[
                    "dp-cell",
                    isSelected(cell) ? "dp-cell--selected" : "",
                    isToday(cell) ? "dp-cell--today" : "",
                    cell.otherMonth ? "dp-cell--other" : "",
                  ].join(" ")}
                >
                  {cell.day}
                </button>
              ))}
            </div>

            {/* Time picker */}
            <div className="dp-time">
              <span className="dp-time-label">Time</span>
              <div className="dp-time-inputs">
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={hour}
                  onChange={(e) => setHour(Math.max(0, Math.min(23, Number(e.target.value))))}
                  className="dp-time-input"
                  aria-label="Hour"
                />
                <span className="dp-time-sep">:</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  step={5}
                  value={minute}
                  onChange={(e) => setMinute(Math.max(0, Math.min(59, Number(e.target.value))))}
                  className="dp-time-input"
                  aria-label="Minute"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="dp-actions">
              <button type="button" className="dp-btn dp-btn-ghost" onClick={clearValue}>
                Clear
              </button>
              <button
                type="button"
                className="dp-btn dp-btn-confirm"
                onClick={confirmTime}
                disabled={!parsed}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .dp-root {
          display: grid;
          gap: 8px;
          position: relative;
        }

        .dp-label {
          font-size: 0.95rem;
          color: #e6dfd0;
        }

        .dp-required {
          color: #d7b97f;
        }

        .dp-trigger {
          font-family: inherit;
          font-size: 0.95rem;
          width: 100%;
          text-align: left;
          border: 1px solid rgba(243, 235, 220, 0.14);
          border-radius: 16px;
          background: rgba(5, 11, 9, 0.5);
          color: #f3ebdc;
          padding: 12px 14px;
          cursor: pointer;
        }

        .dp-trigger--empty {
          color: #8a847a;
        }

        .dp-trigger:hover {
          border-color: rgba(243, 235, 220, 0.28);
        }

        .dp-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 200;
        }

        .dp-modal {
          width: 300px;
          border: 1px solid rgba(243, 235, 220, 0.12);
          background: #0d1c17;
          border-radius: 24px;
          padding: 20px;
          box-shadow: 0 40px 80px rgba(0, 0, 0, 0.5);
        }

        .dp-month-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .dp-arrow {
          font-family: inherit;
          background: rgba(243, 235, 220, 0.07);
          border: 0;
          color: #c9c2b3;
          border-radius: 8px;
          padding: 4px 10px;
          cursor: pointer;
          font-size: 1rem;
        }

        .dp-arrow:hover {
          background: rgba(243, 235, 220, 0.12);
          color: #f3ebdc;
        }

        .dp-month-label {
          font-size: 0.95rem;
          font-weight: 600;
          color: #f3ebdc;
        }

        .dp-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
          margin-bottom: 4px;
        }

        .dp-header-row {
          margin-bottom: 6px;
        }

        .dp-day-header {
          text-align: center;
          font-size: 0.72rem;
          color: #8a847a;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 2px 0;
        }

        .dp-cell {
          font-family: inherit;
          font-size: 0.85rem;
          text-align: center;
          padding: 6px 2px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: #d4d0c7;
          cursor: pointer;
        }

        .dp-cell:hover {
          background: rgba(215, 185, 127, 0.15);
          color: #f4dcb0;
        }

        .dp-cell--selected {
          background: linear-gradient(135deg, #d7b97f, #b98545);
          color: #10231d;
          font-weight: 700;
        }

        .dp-cell--selected:hover {
          background: linear-gradient(135deg, #e0c48a, #c49550);
          color: #10231d;
        }

        .dp-cell--today:not(.dp-cell--selected) {
          border: 1px solid rgba(215, 185, 127, 0.4);
          color: #f4dcb0;
        }

        .dp-cell--other {
          color: #4a4640;
        }

        .dp-cell--other:hover {
          color: #8a847a;
        }

        .dp-time {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin: 14px 0;
          padding: 12px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 12px;
        }

        .dp-time-label {
          font-size: 0.82rem;
          color: #8a847a;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .dp-time-inputs {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .dp-time-input {
          width: 46px;
          font-family: inherit;
          font-size: 0.95rem;
          text-align: center;
          border: 1px solid rgba(243, 235, 220, 0.14);
          border-radius: 8px;
          background: rgba(5, 11, 9, 0.5);
          color: #f3ebdc;
          padding: 6px 4px;
        }

        .dp-time-sep {
          color: #8a847a;
          font-weight: 700;
        }

        .dp-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 4px;
        }

        .dp-btn {
          font-family: inherit;
          font-size: 0.9rem;
          border-radius: 999px;
          padding: 10px 14px;
          cursor: pointer;
          border: 0;
          font-weight: 600;
        }

        .dp-btn-ghost {
          background: transparent;
          border: 1px solid rgba(243, 235, 220, 0.2);
          color: #c9c2b3;
        }

        .dp-btn-ghost:hover {
          border-color: rgba(243, 235, 220, 0.4);
          color: #f3ebdc;
        }

        .dp-btn-confirm {
          background: linear-gradient(135deg, #d7b97f, #b98545);
          color: #10231d;
        }

        .dp-btn-confirm:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
