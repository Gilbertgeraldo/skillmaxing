import {
  contributionLevel,
  minutesLabel,
} from "@/lib/focus";

type ContributionDay = {
  key: string;
  date: Date;
  minutes: number;
  isToday: boolean;
  isFuture: boolean;
};

type PracticeActivityProps = {
  days: ContributionDay[];
  weekMinutes: number;
  sessionCount: number;
};

export function PracticeActivity({
  days,
  weekMinutes,
  sessionCount,
}: PracticeActivityProps) {
  return (
    <section className="activity-panel" aria-labelledby="activity-heading">
      <div className="content-heading">
        <div>
          <p className="section-kicker">Consistency</p>
          <h2 id="activity-heading">Practice rhythm</h2>
        </div>
        <div className="week-summary">
          <strong>{minutesLabel(weekMinutes)}</strong>
          <span>this week</span>
        </div>
      </div>

      <div className="contribution-shell">
        <div className="weekday-labels" aria-hidden="true">
          <span>Mon</span>
          <span>Wed</span>
          <span>Fri</span>
        </div>
        <div className="contribution-scroll">
          <div className="contribution-grid" role="grid" aria-label="Practice activity over the last 20 weeks">
            {days.map((day) => {
              const label = day.date.toLocaleDateString("en-US", {
                weekday: "long",
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
      </div>

      <div className="contribution-footer">
        <p>
          {sessionCount
            ? "Small, repeatable sessions build visible momentum."
            : "Complete a session to start building your practice record."}
        </p>
        <span className="legend" aria-label="Activity intensity legend">
          Less
          {[0, 1, 2, 3, 4].map((level) => (
            <i className={`contribution-cell level-${level}`} key={level} />
          ))}
          More
        </span>
      </div>
    </section>
  );
}
