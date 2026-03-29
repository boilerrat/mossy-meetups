import { useState } from "react";

function extractMapEmbedSrc(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("<iframe")) {
    const match = trimmed.match(/\bsrc="([^"]+)"/);
    return match ? match[1] : trimmed;
  }
  return trimmed;
}

export interface LocationOptionData {
  id: string;
  name: string;
  mapLink: string | null;
  mapEmbed: string | null;
  createdBy: string;
  voteCount: number;
  votes: Array<{ userId: string }>;
}

interface LocationPollProps {
  eventId: string;
  options: LocationOptionData[];
  members: Array<{ id: string; name: string }>;
  userVoteOptionId: string | null;
  currentUserId: string;
  isAdmin: boolean;
  onLocationConfirmed: () => void;
}

export function LocationPoll({
  eventId,
  options: initialOptions,
  members,
  userVoteOptionId: initialVoteId,
  currentUserId,
  isAdmin,
  onLocationConfirmed,
}: LocationPollProps) {
  const [options, setOptions] = useState(initialOptions);
  const [userVoteId, setUserVoteId] = useState(initialVoteId);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({ name: "", mapLink: "", mapEmbed: "" });
  const [addingOption, setAddingOption] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  async function handleVote(optionId: string) {
    const prevVoteId = userVoteId;
    // Clicking an already-voted option un-votes it; clicking a new one moves the vote
    const nextVoteId = prevVoteId === optionId ? null : optionId;

    // Optimistic update
    setOptions((prev) =>
      prev.map((o) => {
        if (o.id === prevVoteId && prevVoteId !== null) {
          return { ...o, votes: o.votes.filter((v) => v.userId !== currentUserId) };
        }
        if (o.id === nextVoteId) {
          return { ...o, votes: [...o.votes, { userId: currentUserId }] };
        }
        return o;
      })
    );
    setUserVoteId(nextVoteId);

    const response = await fetch("/api/location-votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, locationOptionId: optionId }),
    });

    if (!response.ok) {
      // Revert
      setOptions((prev) =>
        prev.map((o) => {
          if (o.id === prevVoteId && prevVoteId !== null) {
            return { ...o, votes: [...o.votes, { userId: currentUserId }] };
          }
          if (o.id === nextVoteId) {
            return { ...o, votes: o.votes.filter((v) => v.userId !== currentUserId) };
          }
          return o;
        })
      );
      setUserVoteId(prevVoteId);
    }
  }

  async function handleConfirm(option: LocationOptionData) {
    setConfirmingId(option.id);
    const response = await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: option.name,
        mapLink: option.mapLink || "",
        mapEmbed: option.mapEmbed || "",
      }),
    });
    setConfirmingId(null);
    if (response.ok) onLocationConfirmed();
  }

  async function handleDelete(optionId: string) {
    setDeletingId(optionId);
    const response = await fetch(`/api/location-options/${optionId}`, { method: "DELETE" });
    setDeletingId(null);
    if (response.ok) {
      setOptions((prev) => prev.filter((o) => o.id !== optionId));
      if (userVoteId === optionId) setUserVoteId(null);
    }
  }

  async function handleAddOption() {
    if (!addForm.name.trim()) return;
    setAddingOption(true);
    const response = await fetch("/api/location-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, ...addForm }),
    });
    setAddingOption(false);
    if (response.ok) {
      const { data } = await response.json();
      setOptions((prev) => [...prev, { ...data, voteCount: 0, votes: [] }]);
      setAddForm({ name: "", mapLink: "", mapEmbed: "" });
      setShowAddForm(false);
    }
  }

  if (options.length === 0 && !isAdmin) {
    return <p className="lp-empty">No location options yet.</p>;
  }

  return (
    <div className="lp-root">
      {options.length === 0 ? (
        <p className="lp-empty">No options yet — add one below.</p>
      ) : (
        <div className="lp-grid-wrapper">
          <table className="lp-grid">
            <thead>
              <tr>
                <th className="lp-member-col" />
                {options.map((opt) => (
                  <th key={opt.id} className="lp-option-col">
                    <div className="lp-col-name">{opt.name}</div>
                    {opt.mapLink ? (
                      <a
                        href={opt.mapLink}
                        target="_blank"
                        rel="noreferrer"
                        className="lp-col-map"
                      >
                        Map ↗
                      </a>
                    ) : null}
                    <div className="lp-col-count">
                      {opt.voteCount} {opt.voteCount === 1 ? "vote" : "votes"}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const isCurrentUser = member.id === currentUserId;
                return (
                  <tr key={member.id} className={isCurrentUser ? "lp-row--me" : ""}>
                    <td className="lp-member-name">
                      {isCurrentUser ? (
                        <span>
                          {member.name}
                          <span className="lp-you-badge"> (you)</span>
                        </span>
                      ) : (
                        member.name
                      )}
                    </td>
                    {options.map((opt) => {
                      const voted = opt.votes.some((v) => v.userId === member.id);
                      if (isCurrentUser) {
                        return (
                          <td key={opt.id} className="lp-cell">
                            <button
                              type="button"
                              className={`lp-cell-btn ${voted ? "lp-cell--yes" : "lp-cell--no"}`}
                              onClick={() => handleVote(opt.id)}
                              aria-label={
                                voted
                                  ? `Remove vote for ${opt.name}`
                                  : `Vote for ${opt.name}`
                              }
                            >
                              {voted ? "✓" : ""}
                            </button>
                          </td>
                        );
                      }
                      return (
                        <td key={opt.id} className="lp-cell">
                          <div className={`lp-cell-display ${voted ? "lp-cell--yes" : "lp-cell--no"}`}>
                            {voted ? "✓" : ""}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
            {isAdmin ? (
              <tfoot>
                <tr>
                  <td className="lp-member-name lp-admin-label">Admin</td>
                  {options.map((opt) => (
                    <td key={opt.id} className="lp-cell lp-admin-actions">
                      <button
                        type="button"
                        className="lp-confirm-btn"
                        onClick={() => handleConfirm(opt)}
                        disabled={confirmingId === opt.id}
                      >
                        {confirmingId === opt.id ? "…" : "Confirm"}
                      </button>
                      <button
                        type="button"
                        className="lp-delete-btn"
                        onClick={() => handleDelete(opt.id)}
                        disabled={deletingId === opt.id}
                        aria-label={`Remove ${opt.name}`}
                      >
                        ×
                      </button>
                    </td>
                  ))}
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      )}

      {isAdmin ? (
        showAddForm ? (
          <div className="lp-add-form">
            <label className="lp-field-label">
              Location name *
              <input
                type="text"
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Pine Ridge Campground"
                className="lp-input"
              />
            </label>
            <label className="lp-field-label">
              Map link (optional)
              <input
                type="url"
                value={addForm.mapLink}
                onChange={(e) => setAddForm((f) => ({ ...f, mapLink: e.target.value }))}
                placeholder="https://maps.google.com/…"
                className="lp-input"
              />
            </label>
            <label className="lp-field-label">
              Map embed (optional)
              <input
                type="text"
                value={addForm.mapEmbed}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, mapEmbed: extractMapEmbedSrc(e.target.value) }))
                }
                placeholder="Paste the Google Maps embed code or src= URL"
                className="lp-input"
              />
            </label>
            <div className="lp-form-actions">
              <button
                type="button"
                className="lp-add-btn"
                onClick={handleAddOption}
                disabled={!addForm.name.trim() || addingOption}
              >
                {addingOption ? "Adding…" : "Add location"}
              </button>
              <button
                type="button"
                className="lp-cancel-btn"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="lp-show-add-btn"
            onClick={() => setShowAddForm(true)}
          >
            + Add location option
          </button>
        )
      ) : null}

      <style jsx>{`
        .lp-root {
          display: grid;
          gap: 12px;
        }

        .lp-empty {
          color: #8a847a;
          font-size: 0.9rem;
          margin: 0;
        }

        .lp-grid-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .lp-grid {
          border-collapse: collapse;
          width: 100%;
          min-width: max-content;
          font-size: 0.88rem;
        }

        .lp-member-col {
          min-width: 120px;
        }

        .lp-option-col {
          min-width: 100px;
          padding: 8px 10px 12px;
          text-align: center;
          vertical-align: bottom;
          border-bottom: 1px solid rgba(243, 235, 220, 0.1);
        }

        .lp-col-name {
          font-weight: 600;
          color: #f3ebdc;
          font-size: 0.88rem;
          margin-bottom: 2px;
          word-break: break-word;
        }

        .lp-col-map {
          display: block;
          font-size: 0.72rem;
          color: #c9c2b3;
          text-decoration: none;
          margin-bottom: 4px;
        }

        .lp-col-map:hover {
          color: #f3ebdc;
        }

        .lp-col-count {
          font-size: 0.72rem;
          color: #8a847a;
        }

        .lp-member-name {
          padding: 6px 12px 6px 0;
          color: #c9c2b3;
          font-size: 0.88rem;
          white-space: nowrap;
        }

        .lp-admin-label {
          color: #d7b97f;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding-top: 10px;
        }

        .lp-row--me .lp-member-name {
          color: #f3ebdc;
        }

        .lp-you-badge {
          font-size: 0.72rem;
          color: #8a847a;
        }

        .lp-cell {
          padding: 4px 6px;
          text-align: center;
        }

        .lp-admin-actions {
          padding-top: 10px;
        }

        .lp-cell-btn,
        .lp-cell-display {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
          font-weight: 700;
          transition: background 0.15s;
        }

        .lp-cell-btn {
          border: 1px solid rgba(243, 235, 220, 0.12);
          cursor: pointer;
          font-family: inherit;
        }

        .lp-cell--yes {
          background: rgba(126, 200, 126, 0.2);
          border-color: rgba(126, 200, 126, 0.4);
          color: #7ec87e;
        }

        .lp-cell--no {
          background: rgba(255, 255, 255, 0.03);
          color: transparent;
        }

        .lp-cell-btn.lp-cell--no:hover {
          background: rgba(215, 185, 127, 0.1);
          border-color: rgba(215, 185, 127, 0.3);
        }

        .lp-confirm-btn {
          font-family: inherit;
          font-size: 0.72rem;
          border: 0;
          border-radius: 999px;
          padding: 3px 8px;
          background: rgba(126, 200, 126, 0.15);
          color: #7ec87e;
          cursor: pointer;
          display: block;
          margin: 0 auto 4px;
        }

        .lp-confirm-btn:disabled {
          opacity: 0.5;
          cursor: wait;
        }

        .lp-confirm-btn:hover:not(:disabled) {
          background: rgba(126, 200, 126, 0.25);
        }

        .lp-delete-btn {
          font-family: inherit;
          font-size: 0.9rem;
          line-height: 1;
          background: transparent;
          border: 0;
          color: #8a847a;
          cursor: pointer;
          padding: 2px 6px;
          display: block;
          margin: 0 auto;
        }

        .lp-delete-btn:hover:not(:disabled) {
          color: #f0a090;
        }

        .lp-add-form {
          border: 1px solid rgba(243, 235, 220, 0.1);
          border-radius: 14px;
          padding: 14px;
          display: grid;
          gap: 12px;
          background: rgba(0, 0, 0, 0.2);
        }

        .lp-field-label {
          display: grid;
          gap: 6px;
          font-size: 0.88rem;
          color: #c9c2b3;
        }

        .lp-input {
          font: inherit;
          font-size: 0.88rem;
          border: 1px solid rgba(243, 235, 220, 0.14);
          border-radius: 10px;
          background: rgba(5, 11, 9, 0.5);
          color: #f3ebdc;
          padding: 9px 12px;
          width: 100%;
        }

        .lp-form-actions {
          display: flex;
          gap: 8px;
        }

        .lp-add-btn {
          font-family: inherit;
          font-size: 0.88rem;
          border: 0;
          border-radius: 999px;
          padding: 9px 16px;
          background: linear-gradient(135deg, #d7b97f, #b98545);
          color: #10231d;
          font-weight: 700;
          cursor: pointer;
        }

        .lp-add-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .lp-cancel-btn {
          font-family: inherit;
          font-size: 0.88rem;
          border: 1px solid rgba(243, 235, 220, 0.2);
          border-radius: 999px;
          padding: 9px 16px;
          background: transparent;
          color: #c9c2b3;
          cursor: pointer;
        }

        .lp-show-add-btn {
          font-family: inherit;
          font-size: 0.82rem;
          border: 1px dashed rgba(215, 185, 127, 0.3);
          border-radius: 10px;
          padding: 10px;
          background: transparent;
          color: #d7b97f;
          cursor: pointer;
          text-align: center;
          width: 100%;
        }

        .lp-show-add-btn:hover {
          background: rgba(215, 185, 127, 0.06);
        }
      `}</style>
    </div>
  );
}
