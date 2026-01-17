# [jamesmunro.github.io](https://jamesmunro.github.io)

## Interactive Tools

This site includes several interactive web tools:

- **[Commute Dashboard](https://jamesmunro.github.io/tools/commute-dashboard/)** - Real-time train times, tube status, and weather for your commute
- **[JWT Reader](https://jamesmunro.github.io/tools/jwt-reader/)** - Decode JSON Web Tokens right in the browser
- **[Pyodide Terminal](https://jamesmunro.github.io/tools/pyodide-terminal/)** - Run Python code directly in your browser with Pyodide
- **[UK Commute Coverage Analyser](https://jamesmunro.github.io/tools/uk-commute-coverage/)** - Find the best network for your commute by analyzing mobile data coverage along your route
- **[World Clock](https://jamesmunro.github.io/tools/world-clock/)** - Large, multi-timezone clock with second-by-second updates

## Local development

This site is built with [Eleventy](https://www.11ty.dev/).

### Prerequisites

- Node.js 20+
- Python 3.12+

### Install dependencies

```sh
npm install
# Setup Python environment for Jupyter Lite
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Build and preview locally

```sh
# Ensure your virtual environment is active
npm run dev
```

The server listens on `0.0.0.0:8080`, making it accessible from:
- **Localhost:** `http://localhost:8080`
- **WSL Host / Network:** `http://<YOUR_IP>:8080` (e.g., from Windows via WSL IP)

### Tests

```sh
npm test
```
