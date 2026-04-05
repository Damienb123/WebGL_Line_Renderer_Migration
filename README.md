# Trace — WebGL Line Renderer

## Overview

**Trace** is a browser-based drawing app that renders lines in real time with **WebGL**. You can sketch freehand by clicking on the canvas, optionally smooth segments, plot **algebraic functions** (y = f(x)) and their **derivatives** using math expressions, and **export** the result as a PNG. The UI is built with **React** and is laid out for desktop and smaller screens, with a grid background on the canvas to help read coordinates.

---

## Tech stack

| Area | Technology |
|------|------------|
| UI | [React](https://react.dev/) 19 |
| Routing | [React Router](https://reactrouter.com/) 7 |
| Build / dev server | [Vite](https://vite.dev/) 7 |
| Graphics | WebGL 1 (`canvas.getContext('webgl')`) |
| Math expressions | [mathjs](https://mathjs.org/) (parse, evaluate, symbolic derivative) |
| Linting | ESLint 9 |

---

## Prerequisites

- **Node.js** (current LTS recommended, e.g. 20+)
- **npm** (comes with Node)

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

## License

This project is private (`"private": true` in `package.json`). Add a license file if you plan to open-source it.
