# Trace — WebGL Line Renderer

## Overview

**Trace** is a browser-based drawing app that renders lines in real time with **WebGL**. You can sketch freehand by clicking on the canvas, optionally smooth segments, 
plot **algebraic functions** (y = f(x)) and their **derivatives** using math expressions, and **export** the result as a PNG. The UI is built with **React** 
and is laid out for desktop and smaller screens, with a grid background on the canvas to help read coordinates.

---

## Tech Stack

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![WebGL](https://img.shields.io/badge/WebGL-990000?style=for-the-badge&logo=webgl&logoColor=white)
![Vercel](https://img.shields.io/badge/vercel-%23000000.svg?style=for-the-badge&logo=vercel&logoColor=white)
![VS Code](https://img.shields.io/badge/VS%20Code-0078d7.svg?style=for-the-badge&logo=visual-studio-code&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/css-%23663399.svg?style=for-the-badge&logo=css&logoColor=white)
![Python](https://img.shields.io/badge/python-%233776AB.svg?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi&logoColor=white)

---

## Prerequisites

- **Node.js** (current LTS recommended, e.g. 20+)
- **npm** (comes with Node)
- **FastAPI** (version 0.129.0)
- **uvicorn[standard]** (version 0.38.0)
- **pydantic-settings** (version 2.12.0)
- **pytest** (version 9.0.2)
- **httpx** (version 0.28.1)

---

## Setup and run

From the project root (`line_rendering_app_migration`):

### Install dependencies

```bash
npm install
```

### Development server (hot reload)

```bash
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

### Production build

```bash
npm run build
```

Output is written to `dist/`.

### Preview production build locally

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

---

# Trace REST API Backend

FastAPI service for saving, loading, updating, listing, and deleting generated line data without changing the React UI.

## Run

```bash
cd backend
python -m uvicorn app.main:app --reload
```

By default the API uses `trace_lines.db` in the backend working directory. Override settings with environment variables:

```bash
$env:TRACE_API_KEY="replace-with-a-long-secret"
$env:TRACE_DATABASE_PATH="data/trace_lines.db"
```

Every request to `/api/v1/line-documents` requires:

- `X-API-Key`: shared API key from `TRACE_API_KEY`
- `X-User-Id`: stable user identifier; the backend stores only a SHA-256 hash

## Endpoints

- `GET /health`
- `POST /api/v1/line-documents`
- `GET /api/v1/line-documents`
- `GET /api/v1/line-documents/{id}`
- `PUT /api/v1/line-documents/{id}`
- `DELETE /api/v1/line-documents/{id}`

## Test

```bash
cd backend
python -m pytest
```



## How to use the application

### Navigation

- **`/`** — Home (“Welcome to Trace”) with **Get Started**.
- **`/canvas`** — Main drawing and plotting workspace.

Use **Get Started** on the home page or go directly to `/canvas`.

### Canvas (drawing area)

- **Click** on the white canvas to add points. Points are connected as a **polyline** in order (line strip).
- Coordinates use the same **normalized** range as WebGL clip space: roughly **x** and **y** from **−1 to 1** (with **y** increasing upward in math space).
- A **light grid** is drawn in the background for reference.

### Line Management

- **Clear** — Removes all drawn vertices.
- **Add Point** — Inserts a sample point (for testing).
- **Add Line** — Inserts a short sample segment (for testing).

### Equation plot

- Enter a function of **`x`** in the text area (e.g. `x^2`, `sin(x)`, `2*x + 1`). Syntax follows **mathjs** (powers with `^`, `sqrt(x)`, `log(x)`, `exp(x)`, constants like `pi` and `e`).
- Click **Plot on canvas** to draw **f(x)** in blue over **x** from **−1** to **1**.
- Optional: enable **Plot derivative f′(x)** to plot the derivative in purple (symbolic derivative via mathjs where supported).
- **Clear plots** removes equation/derivative curves from the canvas (your hand-drawn line is unchanged unless you clear it separately).

If the expression is invalid or undefined over most of the range, an error message appears under the controls.

### Curves (hand-drawn line)

- **Toggle Smooth Curves** — Interpolates extra points between your clicks for a smoother hand-drawn path.
- **Undo** — Removes the last clicked point (two numbers from the vertex list).
- **Clear** — Clears the hand-drawn line (same as Line Management clear).

### Export

- **Export as PNG** — Downloads a snapshot of the canvas (grid, equation curves, and your line) as `canvas.png`.

### Other

- **Back Home** — Returns to `/`.

---

## Project layout (high level)

```
src/
  App.jsx          # Routes: / and /canvas
  App.css          # Global and dashboard styles
  main.jsx         # React entry
  pages/
    Home.jsx       # Landing page
    Canvas.jsx     # WebGL canvas, state, UI
  utils/
    equationPlot.js # Sampling and segment building for y = f(x)
```

---

## Browser support

Requires **WebGL**. Use a current Chrome, Firefox, Edge, or Safari. If WebGL is disabled or unavailable, the app logs an error and the canvas will not render correctly.

---
