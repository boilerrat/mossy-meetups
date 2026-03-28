import { useState } from "react";

export interface LocationOptionData {
  id: string;
  name: string;
  mapLink: string | null;
  mapEmbed: string | null;
  createdBy: string;
  voteCount: number;
}

interface LocationPollProps {
  eventId: string;
  options: LocationOptionData[];
  userVoteOptionId: string | null;
  currentUserId: string;
  isAdmin: boolean;
  totalVoters: number;
  onLocationConfirmed: () => void;
}

export function LocationPoll({
  eventId,
  options: initialOptions,
  userVoteOptionId: initialVoteId,
  currentUserId,
  isAdmin,
  totalVoters,
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

    // Optimistic update
    setOptions((prev) =>
      prev.map((o) => {
        if (o.id === prevVoteId) return { ...o, voteCount: o.voteCount - 1 };
        if (o.id === optionId) return { ...o, voteCount: o.voteCount + 1 };
        return o;
      })
    );
    setUserVoteId(optionId);

    const response = await fetch("/api/location-votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, locationOptionId: optionId }),
    });

    if (!response.ok) {
      // Revert
      setOptions((prev) =>
        prev.map((o) => {
          if (o.id === prevVoteId) return { ...o, voteCount: o.voteCount + 1 };
          if (o.id === optionId) return { ...o, voteCount: o.voteCount - 1 };
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
      setOptions((prev) => [...prev, { ...data, voteCount: 0 }]);
      setAddForm({ name: "", mapLink: "", mapEmbed: "" });
      setShowAddForm(false);
    }
  }

  const maxVotes = Math.max(...options.map((o) => o.voteCount), 1);

  return (
    <div className="lp-root">
      {options.length === 0 ? (
        <p className="lp-empty">No location options yet{isAdmin ? " — add one below" : ""}.</p>
      ) : (
        <div className="lp-options">
          {options.map((option) => {
            const isMyVote = userVoteId === option.id;
            const barWidth = totalVoters > 0
              ? Math.round((option.voteCount / totalVoters) * 100)
              : 0;

            return (
              <div key={option.id} className={`lp-option ${isMyVote ? "lp-option--voted" : ""}`}>
                <div className="lp-option-header">
                  <span className="lp-name">{option.name}</span>
                  <div className="lp-actions">
                    {option.mapLink ? (
                      <a href={option.mapLink} target="_blank" rel="noreferrer" className="lp-map-link">
                        Map ↗
                      </a>
                    ) : null}
                    <button
                      type="button"
                      className={`lp-vote-btn ${isMyVote ? "lp-vote-btn--active" : ""}`}
                      onClick={() => handleVote(option.id)}
                    >
                      {isMyVote ? "Voted ✓" : "Vote"}
                    </button>
                    {isAdmin ? (
                      <>
                        <button
                          type="button"
                          className="lp-confirm-btn"
                          onClick={() => handleConfirm(option)}
                          disabled={confirmingId === option.id}
                        >
                          {confirmingId === option.id ? "…" : "Confirm"}
                        </button>
                        <button
                          type="button"
                          className="lp-delete-btn"
                          onClick={() => handleDelete(option.id)}
                          disabled={deletingId === option.id}
                          aria-label="Remove option"
                        >
                          ×
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="lp-bar-row">
                  <div className="lp-bar-track">
                    <div className="lp-bar-fill" style={{ width: `${barWidth}%` }} />
                  </div>
                  <span className="lp-vote-count">
                    {option.voteCount} {option.voteCount === 1 ? "vote" : "votes"}
                  </span>
                </div>
              </div>
            );
          })}
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

        .lp-options {
          display: grid;
          gap: 10px;
        }

        .lp-option {
          border: 1px solid rgba(243, 235, 220, 0.1);
          border-radius: 14px;
          padding: 12px 14px;
          background: rgba(255, 255, 255, 0.03);
          display: grid;
          gap: 8px;
        }

        .lp-option--voted {
          border-color: rgba(215, 185, 127, 0.35);
          background: rgba(215, 185, 127, 0.06);
        }

        .lp-option-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .lp-name {
          font-size: 0.95rem;
          color: #f3ebdc;
          font-weight: 600;
        }

        .lp-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .lp-map-link {
          font-size: 0.78rem;
          color: #c9c2b3;
          text-decoration: none;
        }

        .lp-map-link:hover {
          color: #f3ebdc;
        }

        .lp-vote-btn {
          font-family: inherit;
          font-size: 0.78rem;
          border: 1px solid rgba(215, 185, 127, 0.3);
          border-radius: 999px;
          padding: 4px 10px;
          background: transparent;
          color: #d7b97f;
          cursor: pointer;
        }

        .lp-vote-btn--active {
          background: rgba(215, 185, 127, 0.18);
          border-color: rgba(215, 185, 127, 0.5);
        }

        .lp-vote-btn:hover:not(.lp-vote-btn--active) {
          background: rgba(215, 185, 127, 0.1);
        }

        .lp-confirm-btn {
          font-family: inherit;
          font-size: 0.72rem;
          border: 0;
          border-radius: 999px;
          padding: 4px 10px;
          background: rgba(126, 200, 126, 0.15);
          color: #7ec87e;
          cursor: pointer;
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
        }

        .lp-delete-btn:hover:not(:disabled) {
          color: #f0a090;
        }

        .lp-bar-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .lp-bar-track {
          flex: 1;
          height: 6px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.07);
          overflow: hidden;
        }

        .lp-bar-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #d7b97f, #b98545);
          transition: width 0.25s;
        }

        .lp-vote-count {
          font-size: 0.78rem;
          color: #8a847a;
          white-space: nowrap;
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
