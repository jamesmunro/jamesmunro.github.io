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

  /* Timezone difference table styles */
  .tz-table-container {
    overflow-x: auto;
    margin-top: 24px;
  }

  .tz-difference-table {
    width: 100%;
    border-collapse: collapse;
    font-family: 'Share Tech Mono', monospace;
    background: linear-gradient(145deg, #1a1a2e, #16162a);
    border-radius: 8px;
    overflow: hidden;
  }

  .tz-difference-table th {
    background: rgba(0, 255, 136, 0.1);
    color: #00ff88;
    text-transform: uppercase;
    font-size: 0.85rem;
    letter-spacing: 0.1em;
    padding: 16px 12px;
    text-align: left;
    border-bottom: 2px solid #2a2a4a;
    text-shadow: 0 0 8px rgba(0, 255, 136, 0.4);
  }

  .tz-difference-table td {
    padding: 14px 12px;
    border-bottom: 1px solid #2a2a4a;
    color: #6b7aa1;
    font-size: 0.9rem;
  }

  .tz-difference-table tr:hover {
    background: rgba(255, 107, 107, 0.05);
  }

  .tz-difference-table .period-cell {
    color: #ff6b6b;
    font-weight: 500;
  }

  .tz-difference-table .offset-cell {
    color: #00ff88;
    font-family: monospace;
  }

  .tz-difference-table .diff-cell {
    color: #6b9aff;
    font-weight: 500;
  }

  .dst-transition {
    background: rgba(255, 107, 107, 0.1);
    border-left: 3px solid #ff6b6b;
  }

  .dst-badge {
    display: inline-block;
    background: rgba(255, 107, 107, 0.2);
    color: #ff6b6b;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.75rem;
    margin-left: 8px;
    text-shadow: 0 0 8px rgba(255, 107, 107, 0.5);
  }

  @media (max-width: 768px) {
    .tz-difference-table {
      font-size: 0.8rem;
    }
    .tz-difference-table th,
    .tz-difference-table td {
      padding: 10px 8px;
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

<section class="card" aria-labelledby="timezone-differences">
  <div class="tool-header">
    <h2 id="timezone-differences">Timezone Differences Over Next Year</h2>
    <span class="status">Including daylight saving time transitions</span>
  </div>
  <div class="tz-table-container">
    <table class="tz-difference-table" id="tz-difference-table">
      <thead>
        <tr>
          <th>Period</th>
          <th>Singapore & HK (UTC)</th>
          <th>Jersey & London (UTC)</th>
          <th>New York (UTC)</th>
          <th>LON → SGP</th>
          <th>NYC → SGP</th>
          <th>NYC → LON</th>
        </tr>
      </thead>
      <tbody id="tz-difference-tbody">
        <tr>
          <td colspan="7" style="text-align: center; padding: 20px;">
            Calculating timezone differences...
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</section>

<section class="card" aria-labelledby="clock-notes">
  <h2 id="clock-notes">Notes</h2>
  <ul>
    <li>Clocks render locally in your browser using IANA time zones.</li>
    <li>Seconds are shown for precise coordination.</li>
    <li>Minimal clocks are used to cover the requested locations.</li>
    <li>The timezone difference table shows how offsets change throughout the year due to daylight saving time transitions.</li>
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

  // Calculate timezone differences and DST transitions
  function calculateTimezoneDifferences() {
    const timezones = [
      { name: 'Singapore & HK', tz: 'Asia/Singapore', label: 'SGP' },
      { name: 'Jersey & London', tz: 'Europe/London', label: 'LON' },
      { name: 'New York', tz: 'America/New_York', label: 'NYC' }
    ];

    // Get UTC offset in hours for a given date and timezone
    function getUTCOffset(date, timezone) {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

      const parts = formatter.formatToParts(date);
      const tzDate = new Date(
        parts.find(p => p.type === 'year').value,
        parts.find(p => p.type === 'month').value - 1,
        parts.find(p => p.type === 'day').value,
        parts.find(p => p.type === 'hour').value,
        parts.find(p => p.type === 'minute').value,
        parts.find(p => p.type === 'second').value
      );

      return (tzDate - date) / (1000 * 60 * 60);
    }

    // Format offset as +HH:MM or -HH:MM
    function formatOffset(offset) {
      const sign = offset >= 0 ? '+' : '-';
      const absOffset = Math.abs(offset);
      const hours = Math.floor(absOffset);
      const minutes = Math.round((absOffset - hours) * 60);
      return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    // Calculate time difference in hours between two timezones
    function getTimeDiff(offset1, offset2) {
      const diff = Math.abs(offset1 - offset2);
      return diff;
    }

    // Scan through next 365 days to find all DST transitions
    const periods = [];
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);

    let currentDate = new Date(startDate);
    let lastOffsets = timezones.map(tz => getUTCOffset(currentDate, tz.tz));
    let periodStart = new Date(currentDate);

    // Check every day for offset changes
    while (currentDate < endDate) {
      currentDate.setDate(currentDate.getDate() + 1);
      const currentOffsets = timezones.map(tz => getUTCOffset(currentDate, tz.tz));

      // Check if any offset has changed
      let offsetChanged = false;
      const changedTimezones = [];
      for (let i = 0; i < currentOffsets.length; i++) {
        if (currentOffsets[i] !== lastOffsets[i]) {
          offsetChanged = true;
          changedTimezones.push(timezones[i].label);
        }
      }

      if (offsetChanged) {
        // Save the period that just ended
        const periodEnd = new Date(currentDate);
        periodEnd.setDate(periodEnd.getDate() - 1);

        periods.push({
          start: new Date(periodStart),
          end: periodEnd,
          offsets: [...lastOffsets],
          transitionNext: changedTimezones
        });

        // Start new period
        periodStart = new Date(currentDate);
        lastOffsets = currentOffsets;
      }
    }

    // Add final period
    periods.push({
      start: new Date(periodStart),
      end: new Date(endDate),
      offsets: [...lastOffsets],
      transitionNext: []
    });

    return { periods, timezones };
  }

  // Populate the table
  function populateTimezoneTable() {
    const { periods, timezones } = calculateTimezoneDifferences();
    const tbody = document.getElementById('tz-difference-tbody');
    tbody.innerHTML = '';

    periods.forEach((period, index) => {
      const row = document.createElement('tr');

      // Add DST transition class if this period has a transition
      if (period.transitionNext.length > 0) {
        row.classList.add('dst-transition');
      }

      // Period date range
      const periodCell = document.createElement('td');
      periodCell.className = 'period-cell';
      const startStr = period.start.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: period.start.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
      });
      const endStr = period.end.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: period.end.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
      });
      periodCell.textContent = `${startStr} – ${endStr}`;

      if (period.transitionNext.length > 0) {
        const badge = document.createElement('span');
        badge.className = 'dst-badge';
        badge.textContent = `${period.transitionNext.join(', ')} DST`;
        periodCell.appendChild(badge);
      }

      row.appendChild(periodCell);

      // UTC offsets for each timezone
      period.offsets.forEach(offset => {
        const offsetCell = document.createElement('td');
        offsetCell.className = 'offset-cell';
        offsetCell.textContent = formatOffset(offset);
        row.appendChild(offsetCell);
      });

      // Time differences
      const sgpOffset = period.offsets[0];
      const lonOffset = period.offsets[1];
      const nycOffset = period.offsets[2];

      // LON → SGP
      const lonToSgpCell = document.createElement('td');
      lonToSgpCell.className = 'diff-cell';
      const lonToSgpDiff = sgpOffset - lonOffset;
      lonToSgpCell.textContent = `${lonToSgpDiff > 0 ? '+' : ''}${lonToSgpDiff}h`;
      row.appendChild(lonToSgpCell);

      // NYC → SGP
      const nycToSgpCell = document.createElement('td');
      nycToSgpCell.className = 'diff-cell';
      const nycToSgpDiff = sgpOffset - nycOffset;
      nycToSgpCell.textContent = `${nycToSgpDiff > 0 ? '+' : ''}${nycToSgpDiff}h`;
      row.appendChild(nycToSgpCell);

      // NYC → LON
      const nycToLonCell = document.createElement('td');
      nycToLonCell.className = 'diff-cell';
      const nycToLonDiff = lonOffset - nycOffset;
      nycToLonCell.textContent = `${nycToLonDiff > 0 ? '+' : ''}${nycToLonDiff}h`;
      row.appendChild(nycToLonCell);

      tbody.appendChild(row);
    });

    function formatOffset(offset) {
      const sign = offset >= 0 ? '+' : '-';
      const absOffset = Math.abs(offset);
      const hours = Math.floor(absOffset);
      const minutes = Math.round((absOffset - hours) * 60);
      return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  }

  // Initialize the timezone table
  populateTimezoneTable();
</script>
