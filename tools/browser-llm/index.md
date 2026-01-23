---
title: Browser LLM Chat
hero_subtitle: Run a large language model entirely in your browser using WebLLM. No server required - everything runs locally on your device using WebGPU.
---

<section class="card" aria-labelledby="model-setup-title">
  <div class="tool-header">
    <h2 id="model-setup-title">Step 1: Load Model</h2>
    <span class="status" id="download-status">Select a model and click Download to begin.</span>
  </div>
  <div class="model-controls">
    <label for="model-selection">Model</label>
    <select id="model-selection"></select>
    <button id="download" type="button">Download</button>
  </div>
  <p class="helper">
    Smaller models (e.g., SmolLM2 or Qwen2) load faster. Larger models require more VRAM and time.
  </p>
</section>

<section class="card" aria-labelledby="chat-title">
  <div class="tool-header">
    <h2 id="chat-title">Step 2: Chat</h2>
    <span class="status" id="chat-stats" hidden></span>
  </div>
  <div id="chat-box" class="chat-box"></div>
  <div class="chat-input-row">
    <textarea id="user-input" placeholder="Type a message..." rows="2"></textarea>
    <button id="send" type="button" disabled>Send</button>
  </div>
</section>

<section class="card" aria-labelledby="notes-title">
  <h2 id="notes-title">Notes</h2>
  <ul>
    <li>Requires a browser with <strong>WebGPU support</strong> (Chrome 113+, Edge 113+, or recent Chromium-based browsers).</li>
    <li>Models are downloaded and cached in your browser. First load may take several minutes.</li>
    <li>All inference runs locally - no data is sent to any server.</li>
    <li>Performance depends on your GPU. Dedicated GPUs work best.</li>
  </ul>
</section>

<style>
  .model-controls {
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
  }
  .model-controls select {
    flex: 1;
    min-width: 200px;
    max-width: 400px;
  }
  .chat-box {
    min-height: 300px;
    max-height: 500px;
    overflow-y: auto;
    border: 1px solid var(--color-border, #ddd);
    border-radius: 4px;
    padding: 1rem;
    margin-bottom: 1rem;
    background: var(--color-bg-secondary, #fafafa);
  }
  .message-container {
    margin-bottom: 1rem;
    display: flex;
  }
  .message-container.user {
    justify-content: flex-end;
  }
  .message-container.assistant {
    justify-content: flex-start;
  }
  .message {
    max-width: 80%;
    padding: 0.75rem 1rem;
    border-radius: 1rem;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  .message-container.user .message {
    background: var(--color-primary, #0066cc);
    color: white;
    border-bottom-right-radius: 4px;
  }
  .message-container.assistant .message {
    background: var(--color-bg, #fff);
    border: 1px solid var(--color-border, #ddd);
    border-bottom-left-radius: 4px;
  }
  .chat-input-row {
    display: flex;
    gap: 0.5rem;
  }
  .chat-input-row textarea {
    flex: 1;
    resize: vertical;
  }
  .chat-input-row button {
    align-self: flex-end;
  }
  #chat-stats {
    font-size: 0.85em;
    opacity: 0.8;
  }
  #download-status.loading {
    color: var(--color-warning, #b58900);
  }
  #download-status.ready {
    color: var(--color-success, #2aa198);
  }
  #download-status.error {
    color: var(--color-error, #dc322f);
  }
</style>

<script type="module">
  import { initializeBrowserLLM } from "{{ './browser-llm.js' | cacheBust }}";
  initializeBrowserLLM();
</script>
