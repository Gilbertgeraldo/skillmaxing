import { Check, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { formatTimer, type TimerStatus } from "@/lib/focus";

type FocusTimerProps = {
  topic: string;
  status: TimerStatus;
  remainingSeconds: number;
  progress: number;
  soundEnabled: boolean;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onDiscard: () => void;
  onToggleSound: () => void;
};

const STATUS_COPY: Record<TimerStatus, { label: string; note: string }> = {
  ready: { label: "Ready", note: "Your session starts when you do." },
  running: { label: "In focus", note: "Stay with the work in front of you." },
  paused: { label: "Paused", note: "The remaining time is safely held." },
};

export function FocusTimer({
  topic,
  status,
  remainingSeconds,
  progress,
  soundEnabled,
  onPause,
  onResume,
  onFinish,
  onDiscard,
  onToggleSound,
}: FocusTimerProps) {
  const circumference = 2 * Math.PI * 128;
  const dashOffset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference;
  const copy = STATUS_COPY[status];

  return (
    <section className={`timer-panel timer-${status}`} aria-labelledby="timer-heading">
      <div className="timer-topline">
        <span className="timer-step">02 / Focus</span>
        <div className="timer-utilities">
          <button
            className="sound-toggle"
            type="button"
            onClick={onToggleSound}
            aria-label={soundEnabled ? "Turn completion alarm off" : "Turn completion alarm on"}
            aria-pressed={soundEnabled}
            title={soundEnabled ? "Alarm on" : "Alarm off"}
          >
            {soundEnabled ? <Volume2 size={14} aria-hidden="true" /> : <VolumeX size={14} aria-hidden="true" />}
            <span>{soundEnabled ? "Alarm on" : "Alarm off"}</span>
          </button>
          <span className="timer-status">
            <i aria-hidden="true" />
            {copy.label}
          </span>
        </div>
      </div>

      <div className="clock-wrap">
        <svg className="progress-ring" viewBox="0 0 280 280" aria-hidden="true">
          <circle className="progress-track" cx="140" cy="140" r="128" />
          <circle
            className="progress-value"
            cx="140"
            cy="140"
            r="128"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: dashOffset,
            }}
          />
        </svg>
        <div
          className="clock-face"
          role="timer"
          aria-label={`${formatTimer(remainingSeconds)} remaining`}
        >
          <span>{formatTimer(remainingSeconds)}</span>
          <small>remaining</small>
        </div>
      </div>

      <div className="timer-context">
        <p className="timer-topic" id="timer-heading">
          {status === "ready" ? "A deliberate block of uninterrupted work" : topic}
        </p>
        <p>{copy.note}</p>
      </div>

      {status !== "ready" ? (
        <div className="timer-actions">
          {status === "running" ? (
            <button className="timer-action-primary" type="button" onClick={onPause}>
              <Pause size={17} aria-hidden="true" /> Pause
            </button>
          ) : (
            <button className="timer-action-primary" type="button" onClick={onResume}>
              <Play size={17} aria-hidden="true" /> Resume
            </button>
          )}
          <button type="button" onClick={onFinish}>
            <Check size={17} aria-hidden="true" /> Finish & save
          </button>
          <button className="discard-button" type="button" onClick={onDiscard}>
            <RotateCcw size={16} aria-hidden="true" /> Discard
          </button>
        </div>
      ) : (
        <div className="timer-idle-line" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      )}
    </section>
  );
}
