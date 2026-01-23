// WebLLM types (simplified for TypeScript compilation)
type WebLLMModule = any;

// State
const messages: Array<{ content: string; role: string }> = [
  { content: "You are a helpful AI assistant.", role: "system" }
];
let engine: any = null;
let webllm: WebLLMModule = null;

// DOM elements
let modelSelection: HTMLSelectElement;
let downloadBtn: HTMLButtonElement;
let downloadStatus: HTMLSpanElement;
let chatBox: HTMLDivElement;
let userInput: HTMLTextAreaElement;
let sendBtn: HTMLButtonElement;
let chatStats: HTMLSpanElement;

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

function populateModelList() {
  const availableModels = webllm.prebuiltAppConfig.model_list.map((m: any) => m.model_id);

  // Add recommended models first
  recommendedModels.forEach((modelId: string) => {
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
  availableModels.forEach((modelId: string) => {
    if (!recommendedModels.includes(modelId)) {
      const option = document.createElement("option");
      option.value = modelId;
      option.textContent = modelId;
      modelSelection.appendChild(option);
    }
  });
}

// Check WebGPU support
async function checkWebGPU(): Promise<boolean> {
  const nav = navigator as any;
  if (!nav.gpu) {
    downloadStatus.textContent = "WebGPU not supported. Try Chrome 113+ or Edge 113+.";
    downloadStatus.classList.add("error");
    downloadBtn.disabled = true;
    return false;
  }
  try {
    const adapter = await nav.gpu.requestAdapter();
    if (!adapter) {
      downloadStatus.textContent = "No WebGPU adapter found. Your GPU may not be supported.";
      downloadStatus.classList.add("error");
      downloadBtn.disabled = true;
      return false;
    }
    return true;
  } catch (e) {
    const error = e as Error;
    downloadStatus.textContent = "WebGPU error: " + error.message;
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
    engine.setInitProgressCallback((report: any) => {
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
    const error = err as Error;
    downloadStatus.textContent = "Error: " + error.message;
    downloadStatus.classList.remove("loading");
    downloadStatus.classList.add("error");
    downloadBtn.disabled = false;
    modelSelection.disabled = false;
    console.error(err);
  }
}

// Append message to chat
function appendMessage(message: { content: string; role: string }): HTMLDivElement {
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
function updateLastMessage(content: string) {
  const msgs = chatBox.querySelectorAll(".message");
  if (msgs.length > 0) {
    const lastMsg = msgs[msgs.length - 1] as HTMLDivElement;
    lastMsg.textContent = content;
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
    const error = err as Error;
    updateLastMessage("Error: " + error.message);
    console.error(err);
  }

  sendBtn.disabled = false;
  userInput.disabled = false;
  userInput.focus();
}

// Initialize the app
export async function initializeBrowserLLM() {
  // Dynamically import webllm from CDN
  // @ts-ignore - Dynamic import from CDN
  webllm = await import("https://esm.run/@mlc-ai/web-llm");

  // Get DOM elements
  modelSelection = document.getElementById("model-selection") as HTMLSelectElement;
  downloadBtn = document.getElementById("download") as HTMLButtonElement;
  downloadStatus = document.getElementById("download-status") as HTMLSpanElement;
  chatBox = document.getElementById("chat-box") as HTMLDivElement;
  userInput = document.getElementById("user-input") as HTMLTextAreaElement;
  sendBtn = document.getElementById("send") as HTMLButtonElement;
  chatStats = document.getElementById("chat-stats") as HTMLSpanElement;

  // Populate model list
  populateModelList();

  // Event listeners
  downloadBtn.addEventListener("click", initializeEngine);
  sendBtn.addEventListener("click", sendMessage);
  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Check WebGPU support
  checkWebGPU();
}
