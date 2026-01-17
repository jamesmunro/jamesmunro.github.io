---
layout: layouts/tool.njk
title: Pyodide Terminal
---

<link rel="stylesheet" href="../../assets/libs/xterm/xterm.css" />

<style>
  /* Expand main container */
  main {
    max-width: none !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  .breadcrumb {
    margin: 0 !important;
    padding: 12px 24px !important;
    background: #fdfdfe;
    border-bottom: 1px solid #e2e8f0;
  }

  #terminal-container {
    width: 100%;
    height: calc(100vh - 180px); /* Adjust to fill remaining viewport */
    background: #1e1e1e;
    margin: 0;
    padding: 0;
    position: relative;
    overflow: hidden;
  }
  
  /* Loading overlay */
  #loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #fff;
    font-family: monospace;
    font-size: 1.2rem;
    z-index: 10;
  }

  header {
    padding: 24px 24px 32px !important; /* Shrink header for this tool */
  }

  .helper {
    padding: 12px 24px;
    font-size: 0.85rem;
    color: #64748b;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    margin: 0;
  }
</style>

<div id="terminal-container">
  <div id="loading">Loading Python environment...</div>
</div>

<p class="helper">
  Powered by <a href="https://pyodide.org/" target="_blank">Pyodide</a> and <a href="https://xtermjs.org/" target="_blank">xterm.js</a>.
</p>

<!-- Load xterm.js -->
<script src="{{ '../../assets/libs/xterm/xterm.js' | cacheBust }}"></script>
<script src="{{ '../../assets/libs/xterm/xterm-addon-fit.js' | cacheBust }}"></script>
<!-- Load Pyodide -->
<script src="{{ '../../assets/libs/pyodide/pyodide.js' | cacheBust }}"></script>

<script>
  // Global error handler to catch issues early
  window.onerror = function(message, source, lineno, colno, error) {
    const errorMsg = `\x1b[31m[Error] ${message} (${source ? source.split('/').pop() : 'unknown'}:${lineno})\x1b[0m\r\n`;
    if (window.term) {
        term.write(errorMsg);
    } else {
        // If term isn't ready, try to append to container if possible or just console
        console.error(message);
        const container = document.getElementById('terminal-container');
        if (container) {
            const errDiv = document.createElement('div');
            errDiv.style.color = 'red';
            errDiv.textContent = message;
            container.appendChild(errDiv);
        }
    }
  };

  // Terminal setup
  const term = new Terminal({
    cursorBlink: true,
    theme: {
      background: '#1e1e1e',
      foreground: '#f0f0f0',
      cursor: '#f0f0f0'
    },
    fontSize: 14,
    fontFamily: '"JetBrains Mono", "Menlo", "Consolas", monospace'
  });
  
  const fitAddon = new FitAddon.FitAddon();
  term.loadAddon(fitAddon);
  
  term.open(document.getElementById('terminal-container'));
  fitAddon.fit();
  
  // Handle window resize
  window.addEventListener('resize', () => fitAddon.fit());

  // Input handling variables
  let inputBuffer = '';
  let commandHistory = [];
  let historyIndex = -1;
  let pyodideReady = false;
  let pyodide = null;

  // Initialize Pyodide
  async function initPyodide() {
    try {
      pyodide = await loadPyodide({ indexURL: "../../assets/libs/pyodide/" });
      
      // Redirect stdout/stderr
      pyodide.setStdout({
        batched: (str) => {
           term.write(str + '\r\n');
        }
      });
      pyodide.setStderr({
        batched: (str) => {
           term.write('\x1b[31m' + str + '\x1b[0m\r\n');
        }
      });

      // Prepare basic environment
      await pyodide.runPythonAsync(`
        import sys
        print(f"Python {sys.version}")
        print('Type "help", "copyright", "credits" or "license" for more information.')
      `);
      
      document.getElementById('loading').style.display = 'none';
      pyodideReady = true;
      prompt();
    } catch (err) {
      document.getElementById('loading').textContent = "Error loading Pyodide: " + err.message;
      console.error(err);
    }
  }

  function prompt() {
    term.write('>>> ');
  }

  function promptContinuation() {
    term.write('... ');
  }

  // Simple line editor and history handler
  term.onData(async (data) => {
    if (!pyodideReady) return;

    const ord = data.charCodeAt(0);

    if (ord === 13) { // Enter
      term.write('\r\n');
      const code = inputBuffer;
      
      if (code.trim()) {
        commandHistory.push(code);
        historyIndex = commandHistory.length;
      }
      
      inputBuffer = '';
      
      await executeCode(code);
      
    } else if (ord === 127) { // Backspace
      if (inputBuffer.length > 0) {
        term.write('\b \b');
        inputBuffer = inputBuffer.slice(0, -1);
      }
    } else if (data === '\x1b[A') { // Up arrow
       if (commandHistory.length > 0 && historyIndex > 0) {
          historyIndex--;
          const cmd = commandHistory[historyIndex];
          // Clear current line
          while (inputBuffer.length > 0) {
            term.write('\b \b');
            inputBuffer = inputBuffer.slice(0, -1);
          }
          term.write(cmd);
          inputBuffer = cmd;
       }
    } else if (data === '\x1b[B') { // Down arrow
       if (historyIndex < commandHistory.length - 1) {
          historyIndex++;
          const cmd = commandHistory[historyIndex];
          // Clear current line
          while (inputBuffer.length > 0) {
            term.write('\b \b');
            inputBuffer = inputBuffer.slice(0, -1);
          }
          term.write(cmd);
          inputBuffer = cmd;
       } else if (historyIndex === commandHistory.length - 1) {
          historyIndex++;
           while (inputBuffer.length > 0) {
            term.write('\b \b');
            inputBuffer = inputBuffer.slice(0, -1);
          }
       }
    } else if (ord < 32) {
       // Ignore other control characters for now
    } else {
      term.write(data);
      inputBuffer += data;
    }
  });

  async function executeCode(code) {
    if (!code.trim()) {
       prompt();
       return;
    }
    
    try {
      // Check for complete statement is hard without more complex logic, 
      // so we just try to run it.
      // For a true REPL we would need to check if more input is expected.
      // Here we assume single statements or simple blocks.
      
      let result = await pyodide.runPythonAsync(code);
      if (result !== undefined) {
         term.write(result + '\r\n');
      }
    } catch (err) {
       term.write('\x1b[31m' + err + '\x1b[0m\r\n');
    }
    prompt();
  }

  // Start
  initPyodide();

</script>
