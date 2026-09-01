export type TimerStatus = "ready" | "running" | "paused";

export type SessionRecord = {
  id: string;
  topic: string;
  durationMinutes: number;
  completedAt: string;
};

export type StoredTimer = {
  topic: string;
  plannedMinutes: number;
  totalSeconds: number;
  remainingSeconds: number;
  status: Exclude<TimerStatus, "ready">;
  endAt: number | null;
};

export const SESSION_STORAGE_KEY = "maxxing.sessions.v1";
export const TIMER_STORAGE_KEY = "maxxing.timer.v1";
export const SOUND_STORAGE_KEY = "maxxing.sound.v1";
export const DEFAULT_MINUTES = 50;
export const MAX_MINUTES = 240;
export const GRID_WEEKS = 20;

export function clampMinutes(value: number) {
  return Math.min(MAX_MINUTES, Math.max(1, Math.round(value || 1)));
}

export function isValidDuration(value: string) {
  const duration = Number(value);
  return Number.isFinite(duration) && duration >= 1 && duration <= MAX_MINUTES;
}

export function formatTimer(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function minutesLabel(minutes: number) {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function contributionLevel(minutes: number) {
  if (minutes <= 0) return 0;
  if (minutes <= 25) return 1;
  if (minutes <= 60) return 2;
  if (minutes <= 120) return 3;
  return 4;
}

export function isSessionRecord(value: unknown): value is SessionRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<SessionRecord>;
  return (
    typeof record.id === "string" &&
    typeof record.topic === "string" &&
    record.topic.trim().length > 0 &&
    typeof record.durationMinutes === "number" &&
    Number.isFinite(record.durationMinutes) &&
    record.durationMinutes > 0 &&
    typeof record.completedAt === "string" &&
    !Number.isNaN(Date.parse(record.completedAt))
  );
}

export function isStoredTimer(value: unknown): value is StoredTimer {
  if (!value || typeof value !== "object") return false;
  const timer = value as Partial<StoredTimer>;
  return (
    typeof timer.topic === "string" &&
    timer.topic.trim().length > 0 &&
    typeof timer.plannedMinutes === "number" &&
    timer.plannedMinutes >= 1 &&
    timer.plannedMinutes <= MAX_MINUTES &&
    typeof timer.totalSeconds === "number" &&
    timer.totalSeconds > 0 &&
    typeof timer.remainingSeconds === "number" &&
    timer.remainingSeconds >= 0 &&
    (timer.status === "running" || timer.status === "paused") &&
    (timer.status === "running"
      ? typeof timer.endAt === "number"
      : timer.endAt === null)
  );
}

export function calculateStreak(activity: Map<string, number>) {
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

export function createSessionId() {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
