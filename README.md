# [jamesmunro.github.io](https://jamesmunro.github.io)

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

Then open `http://localhost:8080` in your browser.

### Tests

```sh
npm test
```
