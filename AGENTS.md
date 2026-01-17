# Gemini Project Context: jamesmunro.github.io

## Project Overview
This repository hosts a personal website and portfolio built as a static site. It features interactive web tools and integrates Jupyter Lite for running Python notebooks in the browser.

## Tech Stack
- **Static Site Generator:** [Eleventy (11ty)](https://www.11ty.dev/)
- **Templating:** Nunjucks (`.njk`) and Markdown (`.md`)
- **Runtime (Build):** Node.js 20+
- **Interactive Tools:** Vanilla JavaScript
- **Data Analysis/Notebooks:** Python 3.12+, Jupyter Lite
- **Package Management:** `npm` (Node), `pip` (Python)

## Project Structure
- **`_includes/`**: Nunjucks layouts and partials.
- **`_data/`**: Global site data files (e.g., `site.json`).
- **`tools/`**: Contains individual interactive tools. Each tool usually has its own subdirectory with an `index.md` and associated scripts.
    - **`tools/tools.json`**: Directory data file applying `layouts/tool.njk` to all tools.
    - **`tools/jwt-reader/`**: Example tool with client-side JS and tests.
    - **`tools/pyodide-terminal/`**: Python REPL using Pyodide (WASM) and xterm.js.
- **`.eleventy.js`**: Main configuration file for Eleventy.
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
  Uses Node's built-in test runner (`node --test`) to run all `*.test.js` files in `tools/`. This includes structural and syntax verification for tools like Pyodide Terminal.
- Run linting checks:
  ```sh
  npm run lint
  ```

## Conventions & Guidelines

### External Libraries & Self-Hosting
- **Prefer self-hosting:** Install libraries via `npm` and use `eleventyConfig.addPassthroughCopy` in `.eleventy.js` to mirror them into `assets/libs/`. 
- **Example:** `xterm.js` and `Pyodide` are self-hosted to ensure offline reliability and performance on GitHub Pages.

### Adding a New Tool
1.  Create a directory in `tools/` (e.g., `tools/my-new-tool/`).
2.  Add an `index.md` with front matter title.
3.  Add necessary JavaScript/CSS assets in that folder.
4.  If logic is complex, add a `.test.js` file and update `scripts.test` in `package.json` to include it (or ensure the test glob picks it up).

### Code Style
- **JavaScript:** Use modern ES6+ syntax. No compilation step for client scripts (currently), so keep it browser-compatible or update build pipeline.
- **Templates:** Prefer Nunjucks for logic/layouts.
- **Paths:** Be mindful of relative paths in Eleventy. Use the `url` filter for internal links.

### Jupyter Lite
- Python dependencies for the *browser* environment must be handled within the Jupyter Lite configuration or pre-installed in the build step if custom packages are needed.