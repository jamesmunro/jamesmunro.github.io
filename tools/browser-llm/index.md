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
  import * as webllm from "https://esm.run/@mlc-ai/web-llm";

  // State
  const messages = [
    { content: "You are a helpful AI assistant.", role: "system" }
  ];
  let engine = null;

  // DOM elements
  const modelSelection = document.getElementById("model-selection");
  const downloadBtn = document.getElementById("download");
  const downloadStatus = document.getElementById("download-status");
  const chatBox = document.getElementById("chat-box");
  const userInput = document.getElementById("user-input");
  const sendBtn = document.getElementById("send");
  const chatStats = document.getElementById("chat-stats");

  // Populate model list with recommended smaller models first
  const recommendedModels = [
    "SmolLM2-360M-Instruct-q4f16_1-MLC",
    "SmolLM2-1.7B-Instruct-q4f16_1-MLC",
    "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    "Llama-3.2-3B-Instruct-q4f16_1-MLC",
    "Phi-3.5-mini-instruct-q4f16_1-MLC"
  ];

  const availableModels = webllm.prebuiltAppConfig.model_list.map(m => m.model_id);

  // Add recommended models first
  recommendedModels.forEach(modelId => {
    if (availableModels.includes(modelId)) {
      const option = document.createElement("option");
      option.value = modelId;
      option.textContent = modelId + " (recommended)";
      modelSelection.appendChild(option);
    }
  });

  // Add separator
  const separator = document.createElement("option");
  separator.disabled = true;
  separator.textContent = "──────────";
  modelSelection.appendChild(separator);

  // Add remaining models
  availableModels.forEach(modelId => {
    if (!recommendedModels.includes(modelId)) {
      const option = document.createElement("option");
      option.value = modelId;
      option.textContent = modelId;
      modelSelection.appendChild(option);
    }
  });

  // Check WebGPU support
  async function checkWebGPU() {
    if (!navigator.gpu) {
      downloadStatus.textContent = "WebGPU not supported. Try Chrome 113+ or Edge 113+.";
      downloadStatus.classList.add("error");
      downloadBtn.disabled = true;
      return false;
    }
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        downloadStatus.textContent = "No WebGPU adapter found. Your GPU may not be supported.";
        downloadStatus.classList.add("error");
        downloadBtn.disabled = true;
        return false;
      }
      return true;
    } catch (e) {
      downloadStatus.textContent = "WebGPU error: " + e.message;
      downloadStatus.classList.add("error");
      downloadBtn.disabled = true;
      return false;
    }
  }

  // Initialize engine
  async function initializeEngine() {
    const selectedModel = modelSelection.value;
    downloadStatus.textContent = "Initializing...";
    downloadStatus.classList.remove("ready", "error");
    downloadStatus.classList.add("loading");
    downloadBtn.disabled = true;
    modelSelection.disabled = true;

    try {
      engine = new webllm.MLCEngine();
      engine.setInitProgressCallback((report) => {
        downloadStatus.textContent = report.text;
      });

      await engine.reload(selectedModel, {
        temperature: 0.7,
        top_p: 0.9
      });

      downloadStatus.textContent = "Model loaded and ready!";
      downloadStatus.classList.remove("loading");
      downloadStatus.classList.add("ready");
      sendBtn.disabled = false;
      userInput.focus();
    } catch (err) {
      downloadStatus.textContent = "Error: " + err.message;
      downloadStatus.classList.remove("loading");
      downloadStatus.classList.add("error");
      downloadBtn.disabled = false;
      modelSelection.disabled = false;
      console.error(err);
    }
  }

  // Append message to chat
  function appendMessage(message) {
    const container = document.createElement("div");
    container.classList.add("message-container", message.role);
    const msgEl = document.createElement("div");
    msgEl.classList.add("message");
    msgEl.textContent = message.content;
    container.appendChild(msgEl);
    chatBox.appendChild(container);
    chatBox.scrollTop = chatBox.scrollHeight;
    return msgEl;
  }

  // Update last message
  function updateLastMessage(content) {
    const msgs = chatBox.querySelectorAll(".message");
    if (msgs.length > 0) {
      msgs[msgs.length - 1].textContent = content;
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  }

  // Send message
  async function sendMessage() {
    const input = userInput.value.trim();
    if (!input || !engine) return;

    sendBtn.disabled = true;
    userInput.disabled = true;

    messages.push({ content: input, role: "user" });
    appendMessage({ content: input, role: "user" });
    userInput.value = "";

    const assistantMsg = { content: "...", role: "assistant" };
    appendMessage(assistantMsg);

    try {
      let curMessage = "";
      let usage = null;

      const completion = await engine.chat.completions.create({
        stream: true,
        messages,
        stream_options: { include_usage: true }
      });

      for await (const chunk of completion) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          curMessage += delta;
          updateLastMessage(curMessage);
        }
        if (chunk.usage) {
          usage = chunk.usage;
        }
      }

      const finalMessage = await engine.getMessage();
      updateLastMessage(finalMessage);
      messages.push({ content: finalMessage, role: "assistant" });

      if (usage && usage.extra) {
        chatStats.textContent = `Prefill: ${usage.extra.prefill_tokens_per_s?.toFixed(1) || "?"} tok/s | Decode: ${usage.extra.decode_tokens_per_s?.toFixed(1) || "?"} tok/s`;
        chatStats.hidden = false;
      }
    } catch (err) {
      updateLastMessage("Error: " + err.message);
      console.error(err);
    }

    sendBtn.disabled = false;
    userInput.disabled = false;
    userInput.focus();
  }

  // Event listeners
  downloadBtn.addEventListener("click", initializeEngine);
  sendBtn.addEventListener("click", sendMessage);
  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Init
  checkWebGPU();
</script>
