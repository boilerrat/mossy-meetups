import { useState } from "react";

export type EventCommentView = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
};

type DiscussionPanelProps = {
  eventId: string;
  comments: EventCommentView[];
  currentUserId: string;
  isAdmin: boolean;
};

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function DiscussionPanel({
  eventId,
  comments: initialComments,
  currentUserId,
  isAdmin,
}: DiscussionPanelProps) {
  const [comments, setComments] = useState(initialComments);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    const body = draft.trim();
    if (!body) {
      setError("Write a message before posting.");
      return;
    }

    setLoading(true);
    setError(null);

    const response = await fetch(`/api/events/${eventId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });

    const payload = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok) {
      setError(payload?.error || "Failed to post message");
      return;
    }

    setComments((current) => [...current, payload.data]);
    setDraft("");
  }

  async function handleSave(commentId: string) {
    const body = editingBody.trim();
    if (!body) {
      setError("Comments cannot be empty.");
      return;
    }

    setLoading(true);
    setError(null);

    const response = await fetch(`/api/events/${eventId}/comments/${commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });

    const payload = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok) {
      setError(payload?.error || "Failed to update message");
      return;
    }

    setComments((current) =>
      current.map((comment) => (comment.id === commentId ? payload.data : comment))
    );
    setEditingId(null);
    setEditingBody("");
  }

  async function handleDelete(commentId: string) {
    if (!window.confirm("Delete this comment?")) {
      return;
    }

    setLoading(true);
    setError(null);

    const response = await fetch(`/api/events/${eventId}/comments/${commentId}`, {
      method: "DELETE",
    });

    const payload = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok) {
      setError(payload?.error || "Failed to delete message");
      return;
    }

    setComments((current) => current.filter((comment) => comment.id !== commentId));
    if (editingId === commentId) {
      setEditingId(null);
      setEditingBody("");
    }
  }

  return (
    <>
      <section className="panel">
        <div className="header">
          <div>
            <p className="eyebrow">Discussion</p>
            <h2>Camp thread</h2>
          </div>
          <span className="count-pill">
            {comments.length} {comments.length === 1 ? "message" : "messages"}
          </span>
        </div>

        <p className="helper-copy">
          Use this thread for planning details, ride coordination, gear notes, and last-minute updates.
        </p>

        <div className="composer">
          <label htmlFor="comment-body" className="sr-only">New comment</label>
          <textarea
            id="comment-body"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Add a note for the crew..."
            rows={4}
            maxLength={1200}
            disabled={loading}
          />
          <div className="composer-footer">
            <span className="hint">Messages are shared with everyone in this event.</span>
            <button type="button" onClick={handleCreate} disabled={loading}>
              {loading ? "Posting…" : "Post message"}
            </button>
          </div>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        {comments.length === 0 ? (
          <div className="empty-state-box">
            <p>No messages yet.</p>
            <p>Be the first to ask about rides, meals, or who is bringing the lanterns.</p>
          </div>
        ) : (
          <div className="comment-list">
            {comments.map((comment) => {
              const canModerate = isAdmin || comment.authorId === currentUserId;
              const isEditing = editingId === comment.id;
              const edited = comment.updatedAt !== comment.createdAt;

              return (
                <article key={comment.id} className="comment-card">
                  <div className="comment-header">
                    <div>
                      <p className="comment-author">{comment.authorName}</p>
                      <p className="comment-meta">
                        {formatTimestamp(comment.createdAt)}
                        {edited ? " · edited" : ""}
                      </p>
                    </div>
                    {canModerate ? (
                      <div className="comment-actions">
                        {isEditing ? (
                          <button
                            type="button"
                            className="text-btn"
                            onClick={() => {
                              setEditingId(null);
                              setEditingBody("");
                              setError(null);
                            }}
                            disabled={loading}
                          >
                            Cancel
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="text-btn"
                            onClick={() => {
                              setEditingId(comment.id);
                              setEditingBody(comment.body);
                              setError(null);
                            }}
                            disabled={loading}
                          >
                            Edit
                          </button>
                        )}
                        <button
                          type="button"
                          className="text-btn text-btn--danger"
                          onClick={() => handleDelete(comment.id)}
                          disabled={loading}
                        >
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {isEditing ? (
                    <div className="edit-block">
                      <textarea
                        value={editingBody}
                        onChange={(event) => setEditingBody(event.target.value)}
                        rows={4}
                        maxLength={1200}
                        disabled={loading}
                      />
                      <div className="edit-actions">
                        <button type="button" onClick={() => handleSave(comment.id)} disabled={loading}>
                          {loading ? "Saving…" : "Save changes"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="comment-body">{comment.body}</p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <style jsx>{`
        .panel {
          border: 1px solid rgba(243, 235, 220, 0.12);
          background: rgba(13, 28, 23, 0.74);
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(10px);
          border-radius: 28px;
          padding: 24px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 12px;
        }

        .eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 0.78rem;
          color: #d7b97f;
          margin: 0 0 8px;
        }

        h2 {
          margin: 0;
          font-size: 1.25rem;
        }

        .count-pill {
          display: inline-flex;
          align-items: center;
          min-height: 34px;
          padding: 0 14px;
          border-radius: 999px;
          border: 1px solid rgba(215, 185, 127, 0.24);
          background: rgba(255, 255, 255, 0.04);
          color: #f3ebdc;
          font-size: 0.85rem;
        }

        .helper-copy {
          margin: 0 0 16px;
          color: #c9c2b3;
          line-height: 1.6;
        }

        .composer,
        .comment-card,
        .empty-state-box {
          border: 1px solid rgba(243, 235, 220, 0.1);
          background: rgba(255, 255, 255, 0.035);
          border-radius: 20px;
        }

        .composer {
          padding: 16px;
          margin-bottom: 12px;
        }

        textarea {
          width: 100%;
          resize: vertical;
          min-height: 96px;
          border-radius: 16px;
          border: 1px solid rgba(243, 235, 220, 0.12);
          background: rgba(5, 11, 9, 0.5);
          color: #f3ebdc;
          font: inherit;
          padding: 12px 14px;
        }

        textarea:focus {
          outline: 2px solid rgba(215, 185, 127, 0.5);
          outline-offset: 2px;
        }

        .composer-footer,
        .edit-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-top: 12px;
        }

        .hint {
          color: #8a847a;
          font-size: 0.82rem;
        }

        button {
          font: inherit;
          border: 0;
          border-radius: 999px;
          padding: 12px 18px;
          background: linear-gradient(135deg, #d7b97f, #b98545);
          color: #10231d;
          font-weight: 700;
          cursor: pointer;
        }

        button:disabled {
          opacity: 0.7;
          cursor: wait;
        }

        .form-error {
          color: #f0a090;
          margin: 0 0 12px;
        }

        .empty-state-box {
          padding: 20px;
          color: #c9c2b3;
          line-height: 1.6;
        }

        .empty-state-box p {
          margin: 0;
        }

        .empty-state-box p + p {
          margin-top: 8px;
        }

        .comment-list {
          display: grid;
          gap: 12px;
        }

        .comment-card {
          padding: 16px;
        }

        .comment-header {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 10px;
        }

        .comment-author {
          margin: 0 0 4px;
          font-weight: 700;
          color: #f3ebdc;
        }

        .comment-meta {
          margin: 0;
          color: #8a847a;
          font-size: 0.82rem;
        }

        .comment-actions {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .text-btn {
          background: rgba(255, 255, 255, 0.05);
          color: #c9c2b3;
          padding: 8px 12px;
          font-size: 0.82rem;
          font-weight: 500;
        }

        .text-btn--danger {
          color: #f0a090;
        }

        .comment-body {
          margin: 0;
          color: #e7e0d2;
          line-height: 1.65;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .edit-block {
          display: grid;
          gap: 10px;
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        @media (max-width: 720px) {
          .header,
          .comment-header,
          .composer-footer,
          .edit-actions {
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>
    </>
  );
}
