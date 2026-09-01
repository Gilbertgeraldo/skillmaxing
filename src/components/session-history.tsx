import { Check, Trash2 } from "lucide-react";
import { minutesLabel, type SessionRecord } from "@/lib/focus";

type SessionHistoryProps = {
  sessions: SessionRecord[];
  onDelete: (id: string) => void;
};

export function SessionHistory({ sessions, onDelete }: SessionHistoryProps) {
  return (
    <section className="history-panel" aria-labelledby="history-heading">
      <div className="content-heading history-heading">
        <div>
          <p className="section-kicker">Latest work</p>
          <h2 id="history-heading">Session log</h2>
        </div>
        <span className="history-count">{sessions.length} total</span>
      </div>

      {sessions.length ? (
        <ol className="session-list">
          {sessions.slice(0, 6).map((session) => (
            <li key={session.id}>
              <span className="session-check" aria-hidden="true"><Check size={14} /></span>
              <span className="session-detail">
                <strong>{session.topic}</strong>
                <small>
                  {new Date(session.completedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </small>
              </span>
              <span className="session-duration">{minutesLabel(session.durationMinutes)}</span>
              <button
                className="delete-session"
                type="button"
                onClick={() => onDelete(session.id)}
                aria-label={`Delete ${session.topic} session`}
                title="Delete session"
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <div className="empty-state">
          <span className="empty-number">00</span>
          <div>
            <strong>No sessions logged yet.</strong>
            <p>Finished work will appear here with its date and duration.</p>
          </div>
        </div>
      )}
    </section>
  );
}
