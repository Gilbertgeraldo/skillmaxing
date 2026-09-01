import { ArrowRight, TimerReset } from "lucide-react";
import type { TimerStatus } from "@/lib/focus";

const DURATION_PRESETS = [25, 50, 90];

type SessionPlannerProps = {
  topic: string;
  minutesInput: string;
  status: TimerStatus;
  error: string;
  canStart: boolean;
  onTopicChange: (value: string) => void;
  onDurationChange: (value: string) => void;
  onDurationBlur: () => void;
  onStart: () => void;
};

export function SessionPlanner({
  topic,
  minutesInput,
  status,
  error,
  canStart,
  onTopicChange,
  onDurationChange,
  onDurationBlur,
  onStart,
}: SessionPlannerProps) {
  const isLocked = status !== "ready";

  return (
    <section className="planner-panel" aria-labelledby="planner-heading">
      <div className="panel-index" aria-hidden="true">01</div>
      <div className="panel-copy">
        <p className="section-kicker">Plan the session</p>
        <h2 id="planner-heading">Choose one clear outcome.</h2>
        <p>
          Specific work is easier to start—and much easier to finish.
        </p>
      </div>

      <div className="planner-fields">
        <label className="field-label" htmlFor="topic">
          <span>What are you working on?</span>
          <input
            id="topic"
            value={topic}
            onChange={(event) => onTopicChange(event.target.value)}
            disabled={isLocked}
            maxLength={90}
            placeholder="e.g. Draft the pricing page wireframe"
            autoComplete="off"
          />
        </label>

        <div className="duration-fieldset">
          <div className="duration-heading">
            <label className="field-label" htmlFor="duration">Duration</label>
            <span>1–240 minutes</span>
          </div>
          <div className="duration-control">
            <div className="duration-input-wrap">
              <TimerReset size={17} aria-hidden="true" />
              <input
                id="duration"
                type="number"
                min="1"
                max="240"
                value={minutesInput}
                onChange={(event) => onDurationChange(event.target.value)}
                onBlur={onDurationBlur}
                disabled={isLocked}
                inputMode="numeric"
                aria-describedby={error ? "planner-error" : undefined}
              />
              <span>min</span>
            </div>

            <div className="duration-presets" aria-label="Duration presets">
              {DURATION_PRESETS.map((minutes) => (
                <button
                  className={minutesInput === String(minutes) ? "is-selected" : ""}
                  type="button"
                  key={minutes}
                  onClick={() => onDurationChange(String(minutes))}
                  disabled={isLocked}
                  aria-pressed={minutesInput === String(minutes)}
                >
                  {minutes}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          className="start-button"
          type="button"
          onClick={onStart}
          disabled={!canStart || isLocked}
        >
          Start focus session
          <ArrowRight size={18} aria-hidden="true" />
        </button>

        <p className="field-message" id="planner-error" aria-live="polite">
          {error}
        </p>
      </div>
    </section>
  );
}
