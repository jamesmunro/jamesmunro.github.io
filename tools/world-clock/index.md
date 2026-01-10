---
title: World Clock
hero_subtitle: Large, multi-timezone clock with second-by-second updates.
---

<style>
  .clock-grid {
    display: grid;
    gap: 20px;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }

  .clock-tile {
    background: #f6f8ff;
    border-radius: 16px;
    padding: 20px;
    border: 1px solid #d4d9e6;
  }

  .clock-city {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0 0 8px;
  }

  .clock-time {
    font-size: 2.4rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    margin: 0;
  }

  .clock-date {
    margin: 8px 0 0;
    color: #56637e;
    font-size: 0.95rem;
  }

  .timezone-note {
    margin-top: 16px;
    color: #56637e;
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

    const city = document.createElement("p");
    city.className = "clock-city";
    city.textContent = clock.label;

    const time = document.createElement("p");
    time.className = "clock-time";

    const date = document.createElement("p");
    date.className = "clock-date";

    tile.append(city, time, date);
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
