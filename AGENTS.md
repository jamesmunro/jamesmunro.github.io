# Project Context: [jamesmunro.github.io](https://jamesmunro.github.io)

## Project Overview
This repository hosts a personal website and portfolio built as a static site. It features interactive web tools and integrates Jupyter Lite for running Python notebooks in the browser.

## Interactive Tools

The site includes several interactive web tools:

- **[Commute Dashboard](https://jamesmunro.github.io/tools/commute-dashboard/)** - Real-time train times, tube status, and weather for your commute
- **[JWT Reader](https://jamesmunro.github.io/tools/jwt-reader/)** - Decode JSON Web Tokens right in the browser
- **[Pyodide Terminal](https://jamesmunro.github.io/tools/pyodide-terminal/)** - Run Python code directly in your browser with Pyodide
- **[UK Commute Coverage Analyser](https://jamesmunro.github.io/tools/uk-commute-coverage/)** - Find the best network for your commute by analyzing mobile data coverage along your route
- **[World Clock](https://jamesmunro.github.io/tools/world-clock/)** - Large, multi-timezone clock with second-by-second updates
- **[Browser LLM](https://jamesmunro.github.io/tools/browser-llm/)** - Browser-embedded LLM chatbot tool

## Tech Stack
- **Static Site Generator:** [Eleventy (11ty)](https://www.11ty.dev/)
- **Templating:** Nunjucks (`.njk`) and Markdown (`.md`)
- **Runtime (Build):** Node.js 20+
- **Interactive Tools:** TypeScript (compiled to vanilla JavaScript)
- **Data Analysis/Notebooks:** Python 3.12+, Jupyter Lite
- **Package Management:** `npm` (Node), `pip` (Python)

## Project Structure
- **`_includes/layouts/`**: Nunjucks layouts (e.g., `tool.njk`).
- **`_data/`**: Global site data files (`site.json`, `build.js`).
- **`tools/`**: Contains individual interactive tools. Each tool usually has its own subdirectory with an `index.md` and associated scripts.
    - **`tools/tools.json`**: Directory data file applying `layouts/tool.njk` to all tools.
    - **`tools/jwt-reader/`**: JWT decoder with client-side JS.
    - **`tools/pyodide-terminal/`**: Python REPL using Pyodide (WASM) and xterm.js.
    - **`tools/uk-commute-coverage/`**: Interactive commute coverage analyzer with map visualization.
    - **`tools/commute-dashboard/`**: Commute metrics dashboard.
    - **`tools/browser-llm/`**: Browser-embedded LLM chatbot tool.
    - **`tools/world-clock/`**: World time zone clock.
- **`.eleventy.js`**: Main configuration file for Eleventy (includes CORS proxy for dev server).
- **`tsconfig.json`**: TypeScript compiler configuration. Compiles `tools/**/*.ts` to `dist/` directory.
- **`package.json`**: Node dependencies and scripts.
- **`requirements.txt`**: Python dependencies for Jupyter Lite.

## Development Workflows

### Setup
1.  Install Node.js dependencies: `npm install`
2.  Setup Python virtual environment:
    ```sh
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    ```

### Running Locally
- **First-time setup:** Build Jupyter Lite before running dev server:
  ```sh
  source .venv/bin/activate
  npm run build:jupyter
  ```
- Start the development server (Eleventy):
  ```sh
  npm run dev
  ```
  Access at `http://localhost:8080`. The server is configured to bind to `0.0.0.0` to support access from WSL hosts or other devices on the network.

### Building
- Full build (Site + Jupyter Lite):
  ```sh
  source .venv/bin/activate
  npm run build
  ```
- **Note:** Jupyter Lite build requires an active Python virtual environment and can be slow. For content-only changes, `eleventy` (or `npm run dev`) is sufficient.

### Testing
- Run unit and structural tests:
  ```sh
  npm test
  ```
  Uses Node's built-in test runner (`node --test`) to run all `*.test.js` files in `dist/tools/` (compiled from TypeScript). This includes structural and syntax verification for tools like Pyodide Terminal.
- Run linting checks:
  ```sh
  npm run lint
  ```
- **IMPORTANT:** Always run tests before committing.

## Conventions & Guidelines

### External Libraries & Self-Hosting
- **Prefer self-hosting:** Install libraries via `npm` and use `eleventyConfig.addPassthroughCopy` in `.eleventy.js` to mirror them into `assets/libs/`.
- **Example:** `xterm.js`, `Pyodide`, and `chart.js` are self-hosted to ensure offline reliability and performance on GitHub Pages.

### Adding a New Tool
1.  Create a directory in `tools/` (e.g., `tools/my-new-tool/`).
2.  Add an `index.md` with front matter title.
3.  Add necessary TypeScript/CSS assets in that folder (`.ts` files).
4.  If logic is complex, add a `.test.ts` file (the test glob will pick up the compiled `.test.js` automatically after `npm run build:ts`).
5.  Update AGENTS.md

### Code Style
- **TypeScript:** All tool logic is written in TypeScript (`.ts` files) and compiled to JavaScript in `dist/tools/` using `npm run build:ts`. The compiled JavaScript is then copied to `_site/tools/` by Eleventy.
- **Source Files:** Keep only `.ts` source files in `tools/`. The `.js` and `.mjs` files are generated artifacts in `dist/` (gitignored).
- **Templates:** Prefer Nunjucks for logic/layouts.
- **Paths:** Be mindful of relative paths in Eleventy. Use the `url` filter for internal links.

### Jupyter Lite
- Python dependencies for the *browser* environment must be handled within the Jupyter Lite configuration or pre-installed in the build step if custom packages are needed.