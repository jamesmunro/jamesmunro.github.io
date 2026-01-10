---
title: World Clock
hero_subtitle: Large, multi-timezone clock with second-by-second updates.
---

<style>
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');

  .clock-grid {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 24px;
  }

  .clock-tile {
    background: linear-gradient(145deg, #1a1a2e, #16162a);
    border-radius: 12px;
    padding: 32px 40px;
    border: 2px solid #2a2a4a;
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    position: relative;
    width: fit-content;
  }

  .clock-tile::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(0, 255, 136, 0.3), transparent);
  }

  .clock-city {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.9rem;
    font-weight: 400;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    margin: 0 0 16px;
    color: #00ff88;
    text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
  }

  .clock-time {
    font-family: 'Share Tech Mono', monospace;
    font-size: 4rem;
    font-weight: 400;
    margin: 0;
    color: #ff6b6b;
    text-shadow:
      0 0 20px rgba(255, 107, 107, 0.6),
      0 0 40px rgba(255, 107, 107, 0.3);
    letter-spacing: 0.05em;
    background: rgba(0, 0, 0, 0.3);
    padding: 12px 20px;
    border-radius: 8px;
    border: 1px solid rgba(255, 107, 107, 0.2);
    display: inline-block;
  }

  .clock-date {
    font-family: 'Share Tech Mono', monospace;
    margin: 20px 0 0;
    color: #6b7aa1;
    font-size: 1rem;
    letter-spacing: 0.1em;
  }

  .clock-indicator {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 8px;
    height: 8px;
    background: #00ff88;
    border-radius: 50%;
    box-shadow: 0 0 8px rgba(0, 255, 136, 0.8);
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .timezone-note {
    margin-top: 20px;
    color: #56637e;
    font-size: 0.9rem;
  }

  @media (max-width: 600px) {
    .clock-time {
      font-size: 2.4rem;
    }
    .clock-tile {
      padding: 20px 24px;
    }
    .clock-time-segment {
      padding: 6px 8px;
    }
  }
</style>

<section class="card" aria-labelledby="world-clock-title">
  <div class="tool-header">
    <h2 id="world-clock-title">Multi-timezone clock</h2>
    <span class="status" id="clock-status">Updating every second.</span>
  </div>
  <div class="clock-grid" id="clock-grid"></div>
  <p class="timezone-note">
    Jersey and London share Europe/London time. Singapore and Hong Kong share Asia/Singapore time year-round.
  </p>
</section>

<section class="card" aria-labelledby="clock-notes">
  <h2 id="clock-notes">Notes</h2>
  <ul>
    <li>Clocks render locally in your browser using IANA time zones.</li>
    <li>Seconds are shown for precise coordination.</li>
    <li>Minimal clocks are used to cover the requested locations.</li>
  </ul>
</section>


<script>
  const clocks = [
    {
      label: "Singapore & Hong Kong",
      timeZone: "Asia/Singapore",
    },
    {
      label: "Jersey & London",
      timeZone: "Europe/London",
    },
    {
      label: "New York",
      timeZone: "America/New_York",
    },
  ];

  const clockGrid = document.getElementById("clock-grid");

  const formatters = clocks.map((clock) => ({
    ...clock,
    timeFormatter: new Intl.DateTimeFormat("en-GB", {
      timeZone: clock.timeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }),
    dateFormatter: new Intl.DateTimeFormat("en-GB", {
      timeZone: clock.timeZone,
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
  }));

  const clockNodes = formatters.map((clock) => {
    const tile = document.createElement("div");
    tile.className = "clock-tile";

    const indicator = document.createElement("div");
    indicator.className = "clock-indicator";

    const city = document.createElement("p");
    city.className = "clock-city";
    city.textContent = clock.label;

    const time = document.createElement("p");
    time.className = "clock-time";

    const date = document.createElement("p");
    date.className = "clock-date";

    tile.append(indicator, city, time, date);
    clockGrid.appendChild(tile);

    return { time, date, ...clock };
  });

  const updateClocks = () => {
    const now = new Date();
    clockNodes.forEach((clock) => {
      clock.time.textContent = clock.timeFormatter.format(now);
      clock.date.textContent = clock.dateFormatter.format(now);
    });
  };

  updateClocks();
  setInterval(updateClocks, 1000);
</script>
