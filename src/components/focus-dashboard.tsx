"use client";

import {
  BarChart3,
  Check,
  Clock3,
  Flame,
  Pause,
  Play,
  Square,
  Target,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type TimerStatus = "ready" | "running" | "paused";

type SessionRecord = {
  id: string;
  topic: string;
  durationMinutes: number;
  completedAt: string;
};

type StoredTimer = {
  topic: string;
  plannedMinutes: number;
  totalSeconds: number;
  remainingSeconds: number;
  status: Exclude<TimerStatus, "ready">;
  endAt: number | null;
};

const SESSION_STORAGE_KEY = "maxxing.sessions.v1";
const TIMER_STORAGE_KEY = "maxxing.timer.v1";
const MAX_MINUTES = 240;
const GRID_WEEKS = 26;

function clampMinutes(value: number) {
  return Math.min(MAX_MINUTES, Math.max(1, Math.round(value || 1)));
}

function formatTimer(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function minutesLabel(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function contributionLevel(minutes: number) {
  if (minutes <= 0) return 0;
  if (minutes <= 25) return 1;
  if (minutes <= 60) return 2;
  if (minutes <= 120) return 3;
  return 4;
}

function isSessionRecord(value: unknown): value is SessionRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<SessionRecord>;
  return (
    typeof record.id === "string" &&
    typeof record.topic === "string" &&
    typeof record.durationMinutes === "number" &&
    typeof record.completedAt === "string"
  );
}

function calculateStreak(activity: Map<string, number>) {
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  if (!activity.get(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (activity.get(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default function FocusDashboard() {
  const [topic, setTopic] = useState("Dynamic Programming — Knapsack");
  const [minutesInput, setMinutesInput] = useState("50");
  const [totalSeconds, setTotalSeconds] = useState(50 * 60);
  const [remainingSeconds, setRemainingSeconds] = useState(50 * 60);
  const [status, setStatus] = useState<TimerStatus>("ready");
  const [endAt, setEndAt] = useState<number | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const savedSessions = JSON.parse(
          window.localStorage.getItem(SESSION_STORAGE_KEY) ?? "[]",
        );
        let restoredSessions: SessionRecord[] = Array.isArray(savedSessions)
          ? savedSessions.filter(isSessionRecord)
          : [];

        const savedTimerRaw = window.localStorage.getItem(TIMER_STORAGE_KEY);
        if (savedTimerRaw) {
          const savedTimer = JSON.parse(savedTimerRaw) as Partial<StoredTimer>;
          if (
            typeof savedTimer.topic === "string" &&
            typeof savedTimer.plannedMinutes === "number" &&
            typeof savedTimer.totalSeconds === "number" &&
            typeof savedTimer.remainingSeconds === "number" &&
            (savedTimer.status === "running" || savedTimer.status === "paused")
          ) {
            const restoredRemaining =
              savedTimer.status === "running" && typeof savedTimer.endAt === "number"
                ? Math.max(0, Math.ceil((savedTimer.endAt - Date.now()) / 1000))
                : savedTimer.remainingSeconds;

            if (restoredRemaining === 0) {
              if (savedTimer.status === "running") {
                restoredSessions = [
                  {
                    id: window.crypto.randomUUID(),
                    topic: savedTimer.topic,
                    durationMinutes: clampMinutes(savedTimer.plannedMinutes),
                    completedAt: new Date(savedTimer.endAt ?? Date.now()).toISOString(),
                  },
                  ...restoredSessions,
                ];
                setMessage("Your completed focus session was restored.");
              }
              window.localStorage.removeItem(TIMER_STORAGE_KEY);
            } else {
              setTopic(savedTimer.topic);
              setMinutesInput(String(savedTimer.plannedMinutes));
              setTotalSeconds(savedTimer.totalSeconds);
              setRemainingSeconds(restoredRemaining);
              setStatus(savedTimer.status);
              setEndAt(savedTimer.endAt ?? null);
            }
          }
        }
        setSessions(restoredSessions);
      } catch {
        window.localStorage.removeItem(TIMER_STORAGE_KEY);
      } finally {
        setHydrated(true);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));
  }, [hydrated, sessions]);

  useEffect(() => {
    if (!hydrated) return;
    if (status === "ready") {
      window.localStorage.removeItem(TIMER_STORAGE_KEY);
      return;
    }

    const timer: StoredTimer = {
      topic,
      plannedMinutes: clampMinutes(Number(minutesInput)),
      totalSeconds,
      remainingSeconds,
      status,
      endAt,
    };
    window.localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timer));
  }, [endAt, hydrated, minutesInput, remainingSeconds, status, topic, totalSeconds]);

  const completeSession = useCallback(
    (timerFinished = false) => {
      const elapsedSeconds = timerFinished
        ? totalSeconds
        : Math.max(0, totalSeconds - remainingSeconds);
      const durationMinutes = timerFinished
        ? clampMinutes(Number(minutesInput))
        : Math.max(1, Math.ceil(elapsedSeconds / 60));

      const record: SessionRecord = {
        id: window.crypto.randomUUID(),
        topic: topic.trim(),
        durationMinutes,
        completedAt: new Date().toISOString(),
      };

      setSessions((current) => [record, ...current]);
      setStatus("ready");
      setEndAt(null);
      const nextTotal = clampMinutes(Number(minutesInput)) * 60;
      setTotalSeconds(nextTotal);
      setRemainingSeconds(nextTotal);
      setError("");
      setMessage(`${durationMinutes} focused minutes saved to your activity.`);
    }, [minutesInput, remainingSeconds, topic, totalSeconds],
  );

  useEffect(() => {
    if (status !== "running" || !endAt) return;

    const updateTimer = () => {
      const nextRemaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setRemainingSeconds(nextRemaining);
      if (nextRemaining === 0) completeSession(true);
    };

    updateTimer();
    const interval = window.setInterval(updateTimer, 500);
    return () => window.clearInterval(interval);
  }, [completeSession, endAt, status]);

  useEffect(() => {
    if (status === "running") {
      document.title = `${formatTimer(remainingSeconds)} · ${topic}`;
      return;
    }
    document.title = "Maxxing — Deliberate Practice Tracker";
  }, [remainingSeconds, status, topic]);

  const activity = useMemo(() => {
    const totals = new Map<string, number>();
    sessions.forEach((session) => {
      const key = dateKey(new Date(session.completedAt));
      totals.set(key, (totals.get(key) ?? 0) + session.durationMinutes);
    });
    return totals;
  }, [sessions]);

  const contributionDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() - (GRID_WEEKS - 1) * 7);

    return Array.from({ length: GRID_WEEKS * 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = dateKey(date);
      return {
        key,
        date,
        minutes: activity.get(key) ?? 0,
        isToday: key === dateKey(today),
        isFuture: date > today,
      };
    });
  }, [activity]);

  const todayMinutes = activity.get(dateKey(new Date())) ?? 0;
  const weekMinutes = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const day = start.getDay();
    start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
    return sessions.reduce((total, session) => {
      return new Date(session.completedAt) >= start
        ? total + session.durationMinutes
        : total;
    }, 0);
  }, [sessions]);
  const streak = calculateStreak(activity);
  const progress = totalSeconds
    ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100
    : 0;

  function handleDurationChange(value: string) {
    setMinutesInput(value);
    if (status !== "ready") return;
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      const seconds = clampMinutes(parsed) * 60;
      setTotalSeconds(seconds);
      setRemainingSeconds(seconds);
    }
  }

  function normalizeDuration() {
    const normalized = clampMinutes(Number(minutesInput));
    setMinutesInput(String(normalized));
    if (status === "ready") {
      setTotalSeconds(normalized * 60);
      setRemainingSeconds(normalized * 60);
    }
  }

  function startTimer() {
    if (!topic.trim()) {
      setError("Write a specific learning target before starting.");
      setMessage("");
      return;
    }

    const plannedMinutes = clampMinutes(Number(minutesInput));
    const seconds = status === "paused" ? remainingSeconds : plannedMinutes * 60;
    setMinutesInput(String(plannedMinutes));
    if (status !== "paused") {
      setTotalSeconds(seconds);
      setRemainingSeconds(seconds);
    }
    setStatus("running");
    setEndAt(Date.now() + seconds * 1000);
    setError("");
    setMessage("");
  }

  function pauseTimer() {
    const pausedRemaining = endAt
      ? Math.max(0, Math.ceil((endAt - Date.now()) / 1000))
      : remainingSeconds;
    setRemainingSeconds(pausedRemaining);
    setStatus("paused");
    setEndAt(null);
    setMessage("Session paused. Your remaining time is saved.");
  }

  const statusLabel =
    status === "running" ? "Focusing" : status === "paused" ? "Paused" : "Ready";

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#focus" aria-label="Maxxing home">
          <span className="brand-mark">M</span>
          <span>
            <strong>Maxxing</strong>
            <small>Deliberate practice</small>
          </span>
        </a>
        <div className="header-meta">
          <span className="header-dot" />
          Stored privately on this device
        </div>
      </header>

      <section className="workspace" id="focus">
        <div className="intro">
          <p className="eyebrow">Daily practice</p>
          <h1>What will you master today?</h1>
          <p className="lede">
            Define one clear learning target, choose your own duration, and
            turn focused time into visible progress.
          </p>
        </div>

        <section className="focus-panel" aria-labelledby="session-heading">
          <div className="session-form">
            <div className={`status-badge status-${status}`}>
              <span /> {statusLabel}
            </div>
            <h2 id="session-heading">Plan the next block.</h2>
            <p className="panel-copy">
              Keep the target small enough to finish and specific enough to measure.
            </p>

            <div className="field-grid">
              <label htmlFor="topic">
                What are you learning?
                <input
                  id="topic"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  disabled={status !== "ready"}
                  maxLength={90}
                  placeholder="e.g. Gradient descent fundamentals"
                  autoComplete="off"
                />
              </label>
              <label htmlFor="duration">
                Minutes
                <input
                  id="duration"
                  type="number"
                  min="1"
                  max={MAX_MINUTES}
                  value={minutesInput}
                  onChange={(event) => handleDurationChange(event.target.value)}
                  onBlur={normalizeDuration}
                  disabled={status !== "ready"}
                  inputMode="numeric"
                />
              </label>
            </div>

            <div className="button-row">
              <button
                className="primary-button"
                type="button"
                onClick={startTimer}
                disabled={status === "running"}
              >
                <Play size={16} aria-hidden="true" />
                {status === "paused" ? "Resume" : "Start focus"}
              </button>
              <button type="button" onClick={pauseTimer} disabled={status !== "running"}>
                <Pause size={16} aria-hidden="true" /> Pause
              </button>
              <button
                type="button"
                onClick={() => completeSession(false)}
                disabled={status === "ready"}
              >
                <Square size={15} aria-hidden="true" /> Stop & save
              </button>
            </div>

            <div className="form-message" aria-live="polite">
              {error ? <span className="error-message">{error}</span> : message}
            </div>
          </div>

          <div className="timer-area">
            <span className={`timer-status timer-status-${status}`}>{statusLabel}</span>
            <div
              className="timer-ring"
              style={{ "--timer-progress": `${progress}%` } as React.CSSProperties}
              role="timer"
              aria-label={`${formatTimer(remainingSeconds)} remaining`}
            >
              <span>{formatTimer(remainingSeconds)}</span>
            </div>
            <p className="timer-topic">
              {status === "ready" ? "Ready for your next session" : topic}
            </p>
          </div>
        </section>

        <section className="stats-grid" aria-label="Learning statistics">
          <article className="stat-card">
            <span className="stat-icon"><Clock3 size={17} /></span>
            <div><strong>{minutesLabel(todayMinutes)}</strong><span>Focused today</span></div>
          </article>
          <article className="stat-card">
            <span className="stat-icon"><Flame size={17} /></span>
            <div><strong>{streak} days</strong><span>Current streak</span></div>
          </article>
          <article className="stat-card">
            <span className="stat-icon"><Target size={17} /></span>
            <div><strong>{sessions.length}</strong><span>Sessions completed</span></div>
          </article>
        </section>

        <section className="activity-layout">
          <article className="activity-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Consistency map</p>
                <h2>Build proof of practice.</h2>
              </div>
              <span className="week-total">{minutesLabel(weekMinutes)} this week</span>
            </div>

            <div className="contribution-scroll">
              <div className="contribution-grid" role="grid" aria-label="Learning contribution activity">
                {contributionDays.map((day) => {
                  const label = day.date.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  return (
                    <span
                      key={day.key}
                      className={`contribution-cell level-${contributionLevel(day.minutes)}${day.isToday ? " is-today" : ""}${day.isFuture ? " is-future" : ""}`}
                      role="gridcell"
                      aria-label={`${label}: ${day.minutes} focused minutes`}
                      title={`${label} · ${day.minutes} minutes`}
                    />
                  );
                })}
              </div>
            </div>

            <div className="contribution-footer">
              <span>{sessions.length ? "Every completed session adds color." : "Complete your first session to light up the grid."}</span>
              <span className="legend" aria-label="Contribution intensity legend">
                Less
                {[0, 1, 2, 3, 4].map((level) => (
                  <i className={`contribution-cell level-${level}`} key={level} />
                ))}
                More
              </span>
            </div>
          </article>

          <article className="recent-panel">
            <div className="section-heading compact-heading">
              <div>
                <p className="eyebrow">Recent focus</p>
                <h2>Latest sessions.</h2>
              </div>
              <BarChart3 size={19} aria-hidden="true" />
            </div>

            {sessions.length ? (
              <ol className="session-list">
                {sessions.slice(0, 5).map((session) => (
                  <li key={session.id}>
                    <span className="session-check"><Check size={14} /></span>
                    <span className="session-detail">
                      <strong>{session.topic}</strong>
                      <small>
                        {new Date(session.completedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </small>
                    </span>
                    <span className="session-duration">{minutesLabel(session.durationMinutes)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="empty-state">
                <span className="empty-mark"><Target size={19} /></span>
                <strong>No completed sessions yet</strong>
                <p>Your first focused block will appear here.</p>
              </div>
            )}
          </article>
        </section>
      </section>
    </main>
  );
}
