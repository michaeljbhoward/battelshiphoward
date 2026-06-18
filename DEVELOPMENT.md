# Local Development

## Prerequisites

| Tool | Minimum version | Purpose |
|------|----------------|---------|
| **Python 3** | 3.7+ | Dev server (`serve.py`) |
| **Web browser** | Any modern browser (Chrome, Firefox, Safari, Edge) | Run the game |

No Node.js, npm, or build toolchain is required. The project is plain HTML + CSS + vanilla JavaScript with no compile step.

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/michaeljbhoward/battelshiphoward.git
cd battelshiphoward

# 2. Start the dev server (disables caching so edits appear instantly)
python3 serve.py

# 3. Open in your browser
#    http://localhost:8000
```

Alternatively, use any static file server or simply open `index.html` directly in a browser:

```bash
# Python built-in server (caches normally)
python3 -m http.server 8000

# Or just double-click index.html — works for most browsers,
# though some features may behave differently under file:// URLs.
```

## Project Structure

```
.
├── index.html          # Entry point — game UI and DOM structure
├── game.js             # All game logic, AI, and event wiring
├── styles.css          # Responsive layout and visual theme
├── serve.py            # No-cache dev server (Python stdlib only)
├── make_slides.py      # Generates Battleship_Summary.pptx (requires python-pptx)
├── Battleship_Summary.pptx
├── README.md           # Player-facing overview
├── BUGS_FIXED.md       # Detailed bug resolution log
├── BUG_FIXES.md        # Additional bug fix notes
└── SUMMARY.md          # Project summary
```

## How It Works

The game runs entirely in the browser. `index.html` loads `styles.css` and `game.js`; there is no bundler or transpiler. The `serve.py` script is a convenience wrapper around Python's `http.server` that injects `Cache-Control: no-store` headers so you always see the latest code during development.

## Tests and Linting

The project does **not** currently have a test suite, linter configuration, or CI pipeline. There are no `package.json`, `.eslintrc`, or GitHub Actions workflows.

To run a one-off lint check you can use a globally installed linter:

```bash
# Example with ESLint (not required)
npx eslint game.js
```

## `make_slides.py`

This script generates the `Battleship_Summary.pptx` presentation. It requires the `python-pptx` package:

```bash
pip install python-pptx
python3 make_slides.py
```

It is not part of the game itself and can be ignored for normal development.

## Gotchas

- **Port conflict**: `serve.py` binds to port 8000. If that port is already in use, you will see `OSError: [Errno 98] Address already in use`. Kill the other process or change the `PORT` variable in `serve.py`.
- **Cache busting**: `index.html` references `styles.css?v=13` and `game.js?v=13`. If you make changes and don't see them, hard-refresh (`Ctrl+Shift+R`) or use `serve.py` which disables caching.
- **`file://` quirk**: Opening `index.html` directly via `file://` works in most browsers, but touch/drag events may behave slightly differently than over HTTP.
