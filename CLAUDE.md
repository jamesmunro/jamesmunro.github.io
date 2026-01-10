# Claude Project Context: jamesmunro.github.io

## Project Overview
This repository hosts a personal website and portfolio built as a static site. It features interactive web tools and integrates Jupyter Lite for running Python notebooks in the browser.

## Tech Stack
- **Static Site Generator:** Eleventy (11ty)
- **Templating:** Nunjucks (`.njk`) and Markdown (`.md`)
- **Runtime (Build):** Node.js 20+
- **Interactive Tools:** Vanilla JavaScript (ES6+, no build step)
- **Data Analysis/Notebooks:** Python 3.12+, Jupyter Lite
- **Package Management:** `npm` (Node), `pip` (Python)

## Project Structure
- **`_includes/`**: Nunjucks layouts and partials
- **`_data/`**: Global site data files (e.g., `site.json`)
- **`tools/`**: Contains individual interactive tools. Each tool has its own subdirectory with an `index.md` and associated scripts
    - **`tools/tools.json`**: Directory data file applying `layouts/tool.njk` to all tools
- **`.eleventy.js`**: Main configuration file for Eleventy
- **`package.json`**: Node dependencies and scripts
- **`requirements.txt`**: Python dependencies for Jupyter Lite
- **`assets/libs/`**: Self-hosted external libraries

## Key Commands
- `npm install` - Install Node dependencies
- `npm run dev` - Start dev server at localhost:8080
- `npm run build` - Full build (requires Python venv active)
- `npm test` - Run unit tests (*.test.js files)

## Development Workflow

### Setup
```sh
npm install
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Running Locally
```sh
npm run dev
```
Server binds to `0.0.0.0:8080` to support WSL and network access.

## Conventions

### Adding a New Tool
1. Create a directory in `tools/` (e.g., `tools/my-new-tool/`)
2. Add an `index.md` with front matter title and `hero_subtitle`
3. Add JavaScript/CSS inline or as separate files
4. Add a `.test.js` file for unit tests if logic is complex

### External Libraries
Prefer self-hosting: Install via `npm` and use `eleventyConfig.addPassthroughCopy` in `.eleventy.js` to mirror into `assets/libs/`.

### Code Style
- ES6+ JavaScript, browser-compatible (no transpilation)
- Prefer Nunjucks for layouts, Markdown for content
- Use the `url` filter for internal links in templates
