import { useState, useCallback } from "react";
import { DatePicker } from "./DatePicker";

export interface DateProposalData {
  id: string;
  date: string; // ISO string
  createdBy: string;
  creatorName: string;
  votes: Array<{ userId: string }>;
}

export interface MemberData {
  id: string;
  name: string;
}

interface DateVoteGridProps {
  eventId: string;
  proposals: DateProposalData[];
  members: MemberData[];
  currentUserId: string;
  isAdmin: boolean;
  onDateConfirmed: () => void;
}

function formatColDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

function formatColTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  if (h === 0 && m === 0) return "";
  return new Intl.DateTimeFormat("en-CA", { timeStyle: "short" }).format(d);
}

export function DateVoteGrid({
  eventId,
  proposals: initialProposals,
  members,
  currentUserId,
  isAdmin,
  onDateConfirmed,
}: DateVoteGridProps) {
  const [proposals, setProposals] = useState(initialProposals);
  const [newDate, setNewDate] = useState("");
  const [addingDate, setAddingDate] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function hasVoted(proposal: DateProposalData): boolean {
    return proposal.votes.some((v) => v.userId === currentUserId);
  }

  const toggleVote = useCallback(
    async (proposal: DateProposalData) => {
      const voted = hasVoted(proposal);

      // Optimistic update
      setProposals((prev) =>
        prev.map((p) =>
          p.id !== proposal.id
            ? p
            : {
                ...p,
                votes: voted
                  ? p.votes.filter((v) => v.userId !== currentUserId)
                  : [...p.votes, { userId: currentUserId }],
              }
        )
      );

      const response = await fetch("/api/date-votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateProposalId: proposal.id }),
      });

      if (!response.ok) {
        // Revert on error
        setProposals((prev) =>
          prev.map((p) =>
            p.id !== proposal.id
              ? p
              : {
                  ...p,
                  votes: voted
                    ? [...p.votes, { userId: currentUserId }]
                    : p.votes.filter((v) => v.userId !== currentUserId),
                }
          )
        );
      }
    },
    [currentUserId]
  );

  async function handleAddProposal() {
    if (!newDate) return;
    setAddingDate(true);
    const response = await fetch("/api/date-proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, date: newDate }),
    });
    setAddingDate(false);
    if (response.ok) {
      const { data } = await response.json();
      setProposals((prev) => [
        ...prev,
        { id: data.id, date: data.date, createdBy: data.createdBy, creatorName: "You", votes: [] },
      ]);
      setNewDate("");
    }
  }

  async function handleDeleteProposal(proposalId: string) {
    setDeletingId(proposalId);
    const response = await fetch(`/api/date-proposals/${proposalId}`, { method: "DELETE" });
    setDeletingId(null);
    if (response.ok) {
      setProposals((prev) => prev.filter((p) => p.id !== proposalId));
    }
  }

  async function handleConfirmDate(proposal: DateProposalData) {
    setConfirmingId(proposal.id);
    const response = await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ arrivalDate: proposal.date }),
    });
    setConfirmingId(null);
    if (response.ok) {
      onDateConfirmed();
    }
  }

  const canDeleteProposal = (proposal: DateProposalData) =>
    isAdmin || proposal.createdBy === currentUserId;

  return (
    <div className="dvg-root">
      <div className="dvg-table-wrap">
        <table className="dvg-table">
          <thead>
            <tr>
              <th className="dvg-member-col">Member</th>
              {proposals.map((p) => (
                <th key={p.id} className="dvg-date-col">
                  <div className="dvg-date-header">
                    <span className="dvg-date-label">{formatColDate(p.date)}</span>
                    {formatColTime(p.date) ? (
                      <span className="dvg-time-label">{formatColTime(p.date)}</span>
                    ) : null}
                    {canDeleteProposal(p) ? (
                      <button
                        type="button"
                        className="dvg-delete-btn"
                        onClick={() => handleDeleteProposal(p.id)}
                        disabled={deletingId === p.id}
                        aria-label="Remove this date proposal"
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className={member.id === currentUserId ? "dvg-current-user" : ""}>
                <td className="dvg-member-name">
                  {member.name}
                  {member.id === currentUserId ? <span className="dvg-you"> (you)</span> : null}
                </td>
                {proposals.map((p) => {
                  const voted = p.votes.some((v) => v.userId === member.id);
                  const isCurrentUser = member.id === currentUserId;
                  return (
                    <td key={p.id} className="dvg-cell-td">
                      {isCurrentUser ? (
                        <button
                          type="button"
                          className={`dvg-cell dvg-cell--interactive ${voted ? "dvg-cell--yes" : "dvg-cell--no"}`}
                          onClick={() => toggleVote(p)}
                          aria-label={voted ? "Remove availability" : "Mark as available"}
                        >
                          {voted ? "✓" : ""}
                        </button>
                      ) : (
                        <div className={`dvg-cell ${voted ? "dvg-cell--yes" : "dvg-cell--no"}`}>
                          {voted ? "✓" : ""}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {/* Vote counts row */}
            <tr className="dvg-count-row">
              <td className="dvg-member-name dvg-count-label">Available</td>
              {proposals.map((p) => (
                <td key={p.id} className="dvg-cell-td">
                  <span className="dvg-vote-count">{p.votes.length}</span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Admin confirm buttons */}
      {isAdmin && proposals.length > 0 ? (
        <div className="dvg-confirm-row">
          {proposals.map((p) => (
            <button
              key={p.id}
              type="button"
              className="dvg-confirm-btn"
              onClick={() => handleConfirmDate(p)}
              disabled={confirmingId === p.id}
            >
              {confirmingId === p.id ? "Confirming…" : `Confirm ${formatColDate(p.date)}`}
            </button>
          ))}
        </div>
      ) : null}

      {/* Add a date */}
      <div className="dvg-add-row">
        <DatePicker
          label="Propose a date"
          value={newDate}
          onChange={setNewDate}
          placeholder="Pick a date to propose…"
        />
        <button
          type="button"
          className="dvg-add-btn"
          onClick={handleAddProposal}
          disabled={!newDate || addingDate}
        >
          {addingDate ? "Adding…" : "Add date"}
        </button>
      </div>

      <style jsx>{`
        .dvg-root {
          display: grid;
          gap: 16px;
        }

        .dvg-table-wrap {
          overflow-x: auto;
          border-radius: 14px;
          border: 1px solid rgba(243, 235, 220, 0.1);
        }

        .dvg-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.88rem;
        }

        .dvg-member-col {
          text-align: left;
          padding: 10px 14px;
          font-weight: 600;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #8a847a;
          background: rgba(255,255,255,0.03);
          min-width: 130px;
          white-space: nowrap;
        }

        .dvg-date-col {
          padding: 8px 10px;
          text-align: center;
          min-width: 100px;
          background: rgba(255,255,255,0.03);
          border-left: 1px solid rgba(243, 235, 220, 0.06);
        }

        .dvg-date-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          position: relative;
        }

        .dvg-date-label {
          font-size: 0.8rem;
          color: #d4d0c7;
          font-weight: 600;
        }

        .dvg-time-label {
          font-size: 0.7rem;
          color: #8a847a;
        }

        .dvg-delete-btn {
          position: absolute;
          top: -4px;
          right: -4px;
          font-family: inherit;
          font-size: 0.9rem;
          line-height: 1;
          background: rgba(255, 100, 100, 0.15);
          border: 0;
          color: #f0a090;
          border-radius: 4px;
          padding: 1px 4px;
          cursor: pointer;
        }

        .dvg-delete-btn:hover {
          background: rgba(255, 100, 100, 0.3);
        }

        .dvg-member-name {
          padding: 8px 14px;
          color: #d4d0c7;
          white-space: nowrap;
          border-top: 1px solid rgba(243, 235, 220, 0.06);
        }

        .dvg-you {
          font-size: 0.75rem;
          color: #8a847a;
        }

        .dvg-current-user .dvg-member-name {
          color: #f4dcb0;
        }

        .dvg-cell-td {
          padding: 6px 10px;
          text-align: center;
          border-top: 1px solid rgba(243, 235, 220, 0.06);
          border-left: 1px solid rgba(243, 235, 220, 0.06);
        }

        .dvg-cell {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 700;
        }

        .dvg-cell--yes {
          background: rgba(126, 200, 126, 0.2);
          color: #7ec87e;
        }

        .dvg-cell--no {
          background: rgba(255, 255, 255, 0.04);
          color: transparent;
        }

        .dvg-cell--interactive {
          font-family: inherit;
          border: 1px solid rgba(243, 235, 220, 0.1);
          cursor: pointer;
          transition: background 0.12s;
        }

        .dvg-cell--interactive.dvg-cell--no:hover {
          background: rgba(126, 200, 126, 0.1);
        }

        .dvg-cell--interactive.dvg-cell--yes:hover {
          background: rgba(126, 200, 126, 0.12);
        }

        .dvg-count-row .dvg-count-label {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #8a847a;
          border-top: 1px solid rgba(243, 235, 220, 0.12);
        }

        .dvg-count-row .dvg-cell-td {
          border-top: 1px solid rgba(243, 235, 220, 0.12);
        }

        .dvg-vote-count {
          font-size: 0.88rem;
          font-weight: 700;
          color: #7ec87e;
        }

        .dvg-confirm-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .dvg-confirm-btn {
          font-family: inherit;
          font-size: 0.82rem;
          border: 0;
          border-radius: 999px;
          padding: 8px 14px;
          background: linear-gradient(135deg, #7ec87e, #4fa04f);
          color: #0a1a0a;
          font-weight: 700;
          cursor: pointer;
        }

        .dvg-confirm-btn:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .dvg-add-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          align-items: end;
        }

        .dvg-add-btn {
          font-family: inherit;
          font-size: 0.88rem;
          border: 1px solid rgba(215, 185, 127, 0.3);
          border-radius: 999px;
          padding: 12px 16px;
          background: transparent;
          color: #d7b97f;
          cursor: pointer;
          white-space: nowrap;
        }

        .dvg-add-btn:hover:not(:disabled) {
          background: rgba(215, 185, 127, 0.1);
        }

        .dvg-add-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .dvg-add-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
