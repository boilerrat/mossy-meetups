import { useState } from "react";

export type RSVPStatus = "ATTENDING" | "MAYBE" | "NOT_ATTENDING";

interface RSVPButtonProps {
  eventId: string;
  initialStatus: RSVPStatus | null;
  onStatusChange?: (newStatus: RSVPStatus, hadPreviousRsvp: boolean) => void;
}

const LABELS: Record<RSVPStatus, string> = {
  ATTENDING: "Going",
  MAYBE: "Maybe",
  NOT_ATTENDING: "Can't go",
};

const STATUSES: RSVPStatus[] = ["ATTENDING", "MAYBE", "NOT_ATTENDING"];

export function RSVPButton({ eventId, initialStatus, onStatusChange }: RSVPButtonProps) {
  const [status, setStatus] = useState<RSVPStatus | null>(initialStatus);
  const [loading, setLoading] = useState(false);

  async function handleSelect(newStatus: RSVPStatus) {
    if (loading) return;
    setLoading(true);

    const response = await fetch("/api/rsvps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, status: newStatus }),
    });

    if (response.ok) {
      const hadPreviousRsvp = status !== null;
      setStatus(newStatus);
      onStatusChange?.(newStatus, hadPreviousRsvp);
    }

    setLoading(false);
  }

  return (
    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
      {STATUSES.map((s) => {
        const isActive = status === s;
        return (
          <button
            key={s}
            type="button"
            onClick={() => handleSelect(s)}
            disabled={loading}
            aria-pressed={isActive}
            style={{
              padding: "5px 10px",
              borderRadius: "999px",
              border: isActive
                ? "1px solid #d7b97f"
                : "1px solid rgba(243, 235, 220, 0.2)",
              background: isActive
                ? "rgba(215, 185, 127, 0.2)"
                : "transparent",
              color: isActive ? "#f4dcb0" : "#c9c2b3",
              fontSize: "0.78rem",
              fontWeight: isActive ? 600 : 400,
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.7 : 1,
              transition: "border-color 0.15s, background 0.15s, color 0.15s",
            }}
          >
            {LABELS[s]}
          </button>
        );
      })}
    </div>
  );
}
