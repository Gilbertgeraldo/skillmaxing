import { HardDrive } from "lucide-react";

export function AppHeader() {
  return (
    <header className="site-header">
      <a className="wordmark" href="#main-content" aria-label="Maxxing home">
        <span className="wordmark-symbol" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>
          <strong>Maxxing</strong>
          <small>Practice log</small>
        </span>
      </a>

      <nav className="site-nav" aria-label="Primary navigation">
        <a href="#focus">Focus</a>
        <a href="#activity">Activity</a>
      </nav>

      <div className="storage-note" title="Your practice history stays in this browser">
        <HardDrive size={14} aria-hidden="true" />
        <span>Saved on this device</span>
      </div>
    </header>
  );
}
