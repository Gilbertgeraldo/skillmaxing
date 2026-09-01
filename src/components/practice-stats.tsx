import { minutesLabel } from "@/lib/focus";

type PracticeStatsProps = {
  todayMinutes: number;
  weekMinutes: number;
  streak: number;
  sessionCount: number;
};

export function PracticeStats({
  todayMinutes,
  weekMinutes,
  streak,
  sessionCount,
}: PracticeStatsProps) {
  const metrics = [
    { value: minutesLabel(todayMinutes), label: "Today" },
    { value: minutesLabel(weekMinutes), label: "This week" },
    { value: `${streak}`, label: streak === 1 ? "Day streak" : "Day streak" },
    { value: `${sessionCount}`, label: sessionCount === 1 ? "Session logged" : "Sessions logged" },
  ];

  return (
    <section className="metric-strip" aria-label="Practice summary">
      {metrics.map((metric) => (
        <div className="metric" key={metric.label}>
          <strong>{metric.value}</strong>
          <span>{metric.label}</span>
        </div>
      ))}
    </section>
  );
}
