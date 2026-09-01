"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { FocusTimer } from "@/components/focus-timer";
import { PracticeActivity } from "@/components/practice-activity";
import { PracticeStats } from "@/components/practice-stats";
import { SessionHistory } from "@/components/session-history";
import { SessionPlanner } from "@/components/session-planner";
import {
  calculateStreak,
  clampMinutes,
  createSessionId,
  dateKey,
  DEFAULT_MINUTES,
  formatTimer,
  GRID_WEEKS,
  isSessionRecord,
  isStoredTimer,
  isValidDuration,
  MAX_MINUTES,
  SESSION_STORAGE_KEY,
  SOUND_STORAGE_KEY,
  TIMER_STORAGE_KEY,
  type SessionRecord,
  type StoredTimer,
  type TimerStatus,
} from "@/lib/focus";

export default function FocusDashboard() {
  const [topic, setTopic] = useState("");
  const [minutesInput, setMinutesInput] = useState(String(DEFAULT_MINUTES));
  const [totalSeconds, setTotalSeconds] = useState(DEFAULT_MINUTES * 60);
  const [remainingSeconds, setRemainingSeconds] = useState(DEFAULT_MINUTES * 60);
  const [status, setStatus] = useState<TimerStatus>("ready");
  const [endAt, setEndAt] = useState<number | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const completionLock = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      let restoredSessions: SessionRecord[] = [];
      let storageWasRepaired = false;

      if (window.localStorage.getItem(SOUND_STORAGE_KEY) === "off") {
        setSoundEnabled(false);
      }

      try {
        const savedSessions = JSON.parse(
          window.localStorage.getItem(SESSION_STORAGE_KEY) ?? "[]",
        ) as unknown;

        if (Array.isArray(savedSessions)) {
          restoredSessions = savedSessions.filter(isSessionRecord);
          storageWasRepaired = restoredSessions.length !== savedSessions.length;
        } else {
          storageWasRepaired = true;
        }
      } catch {
        storageWasRepaired = true;
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
      }

      try {
        const savedTimerRaw = window.localStorage.getItem(TIMER_STORAGE_KEY);
        if (savedTimerRaw) {
          const savedTimer = JSON.parse(savedTimerRaw) as unknown;

          if (!isStoredTimer(savedTimer)) {
            throw new Error("Invalid saved timer");
          }

          const restoredRemaining =
            savedTimer.status === "running" && savedTimer.endAt
              ? Math.max(0, Math.ceil((savedTimer.endAt - Date.now()) / 1000))
              : savedTimer.remainingSeconds;

          if (restoredRemaining === 0) {
            if (savedTimer.status === "running") {
              restoredSessions = [
                {
                  id: createSessionId(),
                  topic: savedTimer.topic,
                  durationMinutes: clampMinutes(savedTimer.plannedMinutes),
                  completedAt: new Date(savedTimer.endAt ?? Date.now()).toISOString(),
                },
                ...restoredSessions,
              ];
              setMessage("Your finished session was recovered and added to the log.");
            }
            window.localStorage.removeItem(TIMER_STORAGE_KEY);
          } else {
            setTopic(savedTimer.topic);
            setMinutesInput(String(savedTimer.plannedMinutes));
            setTotalSeconds(savedTimer.totalSeconds);
            setRemainingSeconds(restoredRemaining);
            setStatus(savedTimer.status);
            setEndAt(savedTimer.status === "running" ? savedTimer.endAt : null);
            setMessage(
              savedTimer.status === "running"
                ? "Your active session was restored."
                : "Your paused session is ready to continue.",
            );
          }
        }
      } catch {
        window.localStorage.removeItem(TIMER_STORAGE_KEY);
        setMessage("A damaged saved timer was removed safely.");
      }

      if (storageWasRepaired) {
        setMessage("Invalid history entries were removed safely.");
      }

      setSessions(restoredSessions);
      setHydrated(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));
    } catch {
      // Keep the in-memory session usable when browser storage is unavailable.
    }
  }, [hydrated, sessions]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(SOUND_STORAGE_KEY, soundEnabled ? "on" : "off");
  }, [hydrated, soundEnabled]);

  useEffect(() => {
    return () => {
      const context = audioContextRef.current;
      audioContextRef.current = null;
      if (context && context.state !== "closed") {
        void context.close();
      }
    };
  }, []);

  useEffect(() => {
    if (!hydrated || status !== "ready") return;
    window.localStorage.removeItem(TIMER_STORAGE_KEY);
  }, [hydrated, status]);

  useEffect(() => {
    if (!hydrated || status !== "running" || !endAt) return;
    const timer: StoredTimer = {
      topic,
      plannedMinutes: clampMinutes(Number(minutesInput)),
      totalSeconds,
      remainingSeconds: totalSeconds,
      status,
      endAt,
    };
    window.localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timer));
  }, [endAt, hydrated, minutesInput, status, topic, totalSeconds]);

  useEffect(() => {
    if (!hydrated || status !== "paused") return;
    const timer: StoredTimer = {
      topic,
      plannedMinutes: clampMinutes(Number(minutesInput)),
      totalSeconds,
      remainingSeconds,
      status,
      endAt: null,
    };
    window.localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timer));
  }, [hydrated, minutesInput, remainingSeconds, status, topic, totalSeconds]);

  const resetTimer = useCallback((notice = "") => {
    const nextTotal = clampMinutes(Number(minutesInput)) * 60;
    setStatus("ready");
    setEndAt(null);
    setTotalSeconds(nextTotal);
    setRemainingSeconds(nextTotal);
    setError("");
    setMessage(notice);
  }, [minutesInput]);

  const getAudioContext = useCallback(() => {
    if (audioContextRef.current?.state === "closed") {
      audioContextRef.current = null;
    }
    if (audioContextRef.current) return audioContextRef.current;

    const AudioContextClass = window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    const context = new AudioContextClass();
    audioContextRef.current = context;
    return context;
  }, []);

  const playCompletionAlarm = useCallback(() => {
    if (!soundEnabled) return;
    const context = getAudioContext();
    if (!context) return;

    const playNotes = () => {
      const startAt = context.currentTime + 0.04;
      const notes = [
        { frequency: 523.25, delay: 0, duration: 0.18 },
        { frequency: 659.25, delay: 0.22, duration: 0.18 },
        { frequency: 783.99, delay: 0.44, duration: 0.42 },
        { frequency: 523.25, delay: 1.02, duration: 0.18 },
        { frequency: 659.25, delay: 1.24, duration: 0.18 },
        { frequency: 783.99, delay: 1.46, duration: 0.62 },
      ];

      notes.forEach(({ frequency, delay, duration }) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const noteStart = startAt + delay;
        const noteEnd = noteStart + duration;

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, noteStart);
        gain.gain.setValueAtTime(0.0001, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.2, noteStart + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(noteStart);
        oscillator.stop(noteEnd + 0.02);
      });
    };

    playNotes();
    if (context.state === "suspended") {
      void context.resume().catch(() => undefined);
    }
  }, [getAudioContext, soundEnabled]);

  const completeSession = useCallback((timerFinished = false) => {
    if (completionLock.current) return;

    const elapsedSeconds = timerFinished
      ? totalSeconds
      : Math.max(0, totalSeconds - remainingSeconds);

    if (!timerFinished && elapsedSeconds < 10) {
      resetTimer("Session discarded because no meaningful time had elapsed.");
      return;
    }

    completionLock.current = true;
    const durationMinutes = timerFinished
      ? clampMinutes(Number(minutesInput))
      : Math.max(1, Math.round(elapsedSeconds / 60));

    const record: SessionRecord = {
      id: createSessionId(),
      topic: topic.trim(),
      durationMinutes,
      completedAt: new Date().toISOString(),
    };

    if (timerFinished) {
      playCompletionAlarm();
    }
    setSessions((current) => [record, ...current]);
    resetTimer(
      `${timerFinished ? "Time's up — " : ""}${durationMinutes} focused minute${durationMinutes === 1 ? "" : "s"} added to your log.`,
    );
  }, [minutesInput, playCompletionAlarm, remainingSeconds, resetTimer, topic, totalSeconds]);

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
      document.title = `${formatTimer(remainingSeconds)} — ${topic}`;
      return;
    }
    document.title = "Maxxing — Focus with intent";
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
  const canStart = topic.trim().length >= 3 && isValidDuration(minutesInput);

  function handleTopicChange(value: string) {
    setTopic(value);
    setError("");
    setMessage("");
  }

  function handleDurationChange(value: string) {
    setMinutesInput(value);
    setError("");
    setMessage("");

    if (status !== "ready") return;
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= MAX_MINUTES) {
      setTotalSeconds(parsed * 60);
      setRemainingSeconds(parsed * 60);
    }
  }

  function normalizeDuration() {
    if (!minutesInput.trim()) {
      setError("Enter a duration between 1 and 240 minutes.");
      return;
    }
    const normalized = clampMinutes(Number(minutesInput));
    setMinutesInput(String(normalized));
    setTotalSeconds(normalized * 60);
    setRemainingSeconds(normalized * 60);
  }

  function startTimer() {
    if (!topic.trim()) {
      setError("Add a specific outcome before starting.");
      return;
    }
    if (!isValidDuration(minutesInput)) {
      setError("Enter a duration between 1 and 240 minutes.");
      return;
    }

    const plannedMinutes = clampMinutes(Number(minutesInput));
    const seconds = status === "paused" ? remainingSeconds : plannedMinutes * 60;
    if (soundEnabled) {
      const context = getAudioContext();
      if (context?.state === "suspended") {
        void context.resume();
      }
    }
    completionLock.current = false;
    setTopic(topic.trim());
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

    if (pausedRemaining === 0) {
      completeSession(true);
      return;
    }

    setRemainingSeconds(pausedRemaining);
    setStatus("paused");
    setEndAt(null);
    setMessage("Session paused. Your remaining time is saved.");
  }

  function discardTimer() {
    completionLock.current = false;
    resetTimer("Session discarded. Nothing was added to your log.");
  }

  function deleteSession(id: string) {
    setSessions((current) => current.filter((session) => session.id !== id));
    setMessage("Session removed from your log.");
  }

  function toggleSound() {
    const nextSoundEnabled = !soundEnabled;
    setSoundEnabled(nextSoundEnabled);
    setMessage(nextSoundEnabled ? "Completion alarm turned on." : "Completion alarm turned off.");

    if (nextSoundEnabled) {
      const context = getAudioContext();
      if (context?.state === "suspended") {
        void context.resume();
      }
    }
  }

  return (
    <main className="app-shell" id="main-content">
      <AppHeader />

      <section className="hero-copy">
        <div>
          <p className="hero-kicker">Deliberate practice, made visible</p>
          <h1>Put in the work.<br />Keep the proof.</h1>
        </div>
        <p className="hero-intro">
          A quiet place to plan one focused block, do the work, and build a record
          of the time you chose to invest.
        </p>
      </section>

      <div className="session-workspace" id="focus">
        <SessionPlanner
          topic={topic}
          minutesInput={minutesInput}
          status={status}
          error={error}
          canStart={canStart}
          onTopicChange={handleTopicChange}
          onDurationChange={handleDurationChange}
          onDurationBlur={normalizeDuration}
          onStart={startTimer}
        />
        <FocusTimer
          topic={topic}
          status={status}
          remainingSeconds={remainingSeconds}
          progress={progress}
          soundEnabled={soundEnabled}
          onPause={pauseTimer}
          onResume={startTimer}
          onFinish={() => completeSession(false)}
          onDiscard={discardTimer}
          onToggleSound={toggleSound}
        />
      </div>

      <div className={`notice-bar${message ? " is-visible" : ""}`} aria-live="polite">
        <span aria-hidden="true" />
        {message}
      </div>

      <PracticeStats
        todayMinutes={todayMinutes}
        weekMinutes={weekMinutes}
        streak={streak}
        sessionCount={sessions.length}
      />

      <section className="insights-layout" id="activity">
        <PracticeActivity
          days={hydrated ? contributionDays : []}
          weekMinutes={weekMinutes}
          sessionCount={sessions.length}
        />
        <SessionHistory sessions={sessions} onDelete={deleteSession} />
      </section>

      <footer className="site-footer">
        <span>Maxxing / Practice with intent</span>
        <span>Your data never leaves this browser.</span>
      </footer>
    </main>
  );
}
