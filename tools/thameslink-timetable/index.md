---
footer_text: Built for quick commuting checks.
title: Thameslink Timetable
hero_subtitle: Live Thameslink departures alongside the latest service updates.
---

<style>
  .timetable-grid {
    display: grid;
    gap: 24px;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    align-items: start;
  }

  .embed-card {
    background: #f6f8ff;
    border-radius: 16px;
    border: 1px solid #d4d9e6;
    padding: 16px;
  }

  .embed-card h3 {
    margin: 0 0 12px;
    font-size: 1.1rem;
  }

  .embed-frame {
    width: 100%;
    min-height: 640px;
    border: 0;
    border-radius: 12px;
    background: #fff;
  }

  .embed-note {
    margin-top: 12px;
    color: #56637e;
    font-size: 0.95rem;
  }
</style>

<section class="card" aria-labelledby="thameslink-timetable-title">
  <div class="tool-header">
    <h2 id="thameslink-timetable-title">Thameslink timetable + service updates</h2>
    <span class="status">Harpenden → St Pancras defaults</span>
  </div>

  <div class="timetable-grid">
    <div class="embed-card">
      <h3>OTRL timetable</h3>
      <iframe
        class="embed-frame"
        title="Thameslink timetable from Harpenden to St Pancras"
        src="https://otrl.co.uk/widgets/timetable?from=HPD&to=STP&operator=TL"
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
      ></iframe>
      <p class="embed-note">
        If the widget does not load, open the timetable directly at
        <a href="https://otrl.co.uk/widgets/timetable?from=HPD&to=STP&operator=TL">OTRL</a>.
      </p>
    </div>

    <div class="embed-card">
      <h3>Latest Thameslink posts</h3>
      <a
        class="twitter-timeline"
        data-height="640"
        data-dnt="true"
        href="https://twitter.com/Thameslink"
      >Tweets by Thameslink</a>
      <p class="embed-note">
        X/Twitter embeds may require consent for third-party scripts.
      </p>
    </div>
  </div>
</section>

<section class="card" aria-labelledby="thameslink-notes">
  <h2 id="thameslink-notes">Notes</h2>
  <ul>
    <li>Timetable defaults to Harpenden (HPD) → St Pancras (STP).</li>
    <li>Use the embedded feed for real-time service updates.</li>
  </ul>
</section>


<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
