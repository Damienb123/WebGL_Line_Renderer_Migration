import { useRef, useEffect, useState, useCallback } from "react";
import "../App.css";
import { Link } from "react-router-dom";
import { buildPlotsFromExpression } from "../utils/equationPlot.js";

/** NDC grid from -1..1 for gl.LINES (pairs of vec2). */
function buildGridVertices(divisions) {
  const verts = [];
  const n = Math.max(1, divisions);
  const step = 2 / n;
  for (let i = 0; i <= n; i++) {
    const x = -1 + i * step;
    verts.push(x, -1, x, 1);
  }
  for (let j = 0; j <= n; j++) {
    const y = -1 + j * step;
    verts.push(-1, y, 1, y);
  }
  return new Float32Array(verts);
}

const GRID_LINE_VERTICES = buildGridVertices(12);
const GRID_COLOR = { r: 0.82, g: 0.84, b: 0.88, a: 1 };
const EQUATION_CURVE_COLOR = { r: 0.1, g: 0.45, b: 0.95 };
const DERIVATIVE_CURVE_COLOR = { r: 0.65, g: 0.25, b: 0.85 };

export default function Draw() {
  // DOM + WebGL refs
  const canvasRef = useRef(null);
  const canvasWrapRef = useRef(null);
  const glRef = useRef(null);
  const programRef = useRef(null);

  // State
  const [lineVertices, setLineVertices] = useState([]);
  const [canvasSizeTick, setCanvasSizeTick] = useState(0);
  const [lineColor, setLineColor] = useState("#ff0000");
  const [lineWidth, setLineWidth] = useState(2);
  const [smoothMode, setSmoothMode] = useState(false);

  const [equationInput, setEquationInput] = useState("x^2");
  const [showDerivative, setShowDerivative] = useState(false);
  const [equationSegments, setEquationSegments] = useState(/** @type {Float32Array[]} */ ([]));
  const [derivativeSegments, setDerivativeSegments] = useState(/** @type {Float32Array[]} */ ([]));
  const [equationError, setEquationError] = useState(/** @type {string | null} */ (null));

  // -------------------------------
  // Initialize WebGL (ONCE)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
    if (!gl) {
      console.error("WebGL not supported");
      return;
    }

    glRef.current = gl;

    // Shaders
    const vertexShaderSource = `
      attribute vec2 a_position;
      uniform float u_pointSize;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        gl_PointSize = u_pointSize;
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      uniform vec4 u_color;
      void main() {
        gl_FragColor = u_color;
      }
    `;

    const compileShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        return null;
      }
      return shader;
    };

    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    programRef.current = program;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = canvasWrapRef.current;
    if (!canvas || !wrap) return;

    const gl = glRef.current;
    const resize = () => {
      const cssW = wrap.clientWidth;
      const cssH = wrap.clientHeight;
      if (cssW < 2 || cssH < 2) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(cssW * dpr));
      const h = Math.max(1, Math.floor(cssH * dpr));
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
      if (gl) {
        gl.viewport(0, 0, w, h);
      }
      setCanvasSizeTick((t) => t + 1);
    };

    const ro = new ResizeObserver(() => resize());
    ro.observe(wrap);
    resize();
    window.addEventListener("resize", resize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);

  // -------------------------------
  // Draw whenever data changes
  useEffect(() => {
    const gl = glRef.current;
    const program = programRef.current;
    if (!gl || !program) return;

    const positionLocation = gl.getAttribLocation(program, "a_position");
    const pointSizeLocation = gl.getUniformLocation(program, "u_pointSize");
    const colorLocation = gl.getUniformLocation(program, "u_color");

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    const vertices = smoothMode ? smoothVertices(lineVertices) : lineVertices;

    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bufferData(gl.ARRAY_BUFFER, GRID_LINE_VERTICES, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.uniform4f(colorLocation, GRID_COLOR.r, GRID_COLOR.g, GRID_COLOR.b, GRID_COLOR.a);
    gl.uniform1f(pointSizeLocation, 1);
    gl.drawArrays(gl.LINES, 0, GRID_LINE_VERTICES.length / 2);

    const drawStrips = (segments, color, widthPx) => {
      for (const seg of segments) {
        const n = seg.length / 2;
        if (n < 2) continue;
        gl.bufferData(gl.ARRAY_BUFFER, seg, gl.STATIC_DRAW);
        gl.uniform4f(colorLocation, color.r, color.g, color.b, 1);
        gl.uniform1f(pointSizeLocation, widthPx);
        gl.drawArrays(gl.LINE_STRIP, 0, n);
      }
    };

    drawStrips(equationSegments, EQUATION_CURVE_COLOR, 2);
    drawStrips(derivativeSegments, DERIVATIVE_CURVE_COLOR, 2);

    const vertCount = vertices.length / 2;
    if (vertCount >= 2) {
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
      const { r, g, b } = hexToRgb(lineColor);
      gl.uniform4f(colorLocation, r, g, b, 1);
      gl.uniform1f(pointSizeLocation, lineWidth);
      gl.drawArrays(gl.LINE_STRIP, 0, vertCount);
    }

  }, [
    lineVertices,
    lineColor,
    lineWidth,
    smoothMode,
    canvasSizeTick,
    equationSegments,
    derivativeSegments,
  ]);

  // -------------------------------
  // Helpers
  const smoothVertices = (verts) => {
    if (verts.length < 4) return verts;
    const out = [];
    for (let i = 0; i < verts.length - 2; i += 2) {
      for (let t = 0; t <= 1; t += 0.1) {
        out.push(
          lerp(verts[i], verts[i + 2], t),
          lerp(verts[i + 1], verts[i + 3], t)
        );
      }
    }
    return out;
  };

  const lerp = (a, b, t) => a + (b - a) * t;

  const hexToRgb = (hex) => ({
    r: parseInt(hex.slice(1, 3), 16) / 255,
    g: parseInt(hex.slice(3, 5), 16) / 255,
    b: parseInt(hex.slice(5, 7), 16) / 255,
  });

  // -------------------------------
  // Events
  const handleCanvasClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    setLineVertices((prev) => [...prev, x, y]);
  };

  const handleUndo = () => {
    setLineVertices((prev) => prev.slice(0, -2));
  };

  const applyEquationPlot = useCallback((includeDerivativeFlag) => {
    setEquationError(null);
    const result = buildPlotsFromExpression(equationInput, {
      includeDerivative: includeDerivativeFlag,
    });
    if (!result.ok) {
      setEquationError(result.error);
      setEquationSegments([]);
      setDerivativeSegments([]);
      return;
    }
    setEquationSegments(result.segments);
    setDerivativeSegments(result.derivativeSegments);
  }, [equationInput]);

  const handlePlotEquation = useCallback(() => {
    applyEquationPlot(showDerivative);
  }, [applyEquationPlot, showDerivative]);

  const handleClearEquationPlots = useCallback(() => {
    setEquationSegments([]);
    setDerivativeSegments([]);
    setEquationError(null);
  }, []);

  // -------------------------------
  // application UI for line management, curve toggling, and image export
  // separate divs are used for dedicating types of capabilities within the application for the user
  // Line clearing is implemented with both use cases, for clearing all segment creations and to clear lineVertices and curves line by line using prev state
  // 
  return (
    <div className="dashboard-container">
      <div className="dashboard-canvas-wrap" ref={canvasWrapRef}>
        <canvas
          ref={canvasRef}
          width={1000}
          height={1000}
          onClick={handleCanvasClick}
        />
      </div>

      <div className="dashboard-toggles">
        <div className="line-management">
            <h2 className="parent-toggle-header">Line Management</h2>
            <p className="parent-description">Have the ability to manage your lines from <br/> adding individual points to complete lines.</p>
            <button onClick={() => setLineVertices([])}>Clear</button>
            <button onClick={() => setLineVertices((prev) => [...prev, ...[0, 0, 0, 0]])}>Add Point</button>
            <button onClick={() => setLineVertices((prev) => [...prev, ...[-0.5, -0.5, 0.5, 0.5]])}>Add Line</button>
          </div> 
        <div className="equation-plot">
          <h2 className="parent-toggle-header">Equation plot</h2>
          <p className="parent-description">
            Enter <code className="equation-hint">y = f(x)</code> using x as the variable (e.g.{" "}
            <code className="equation-hint">x^2</code>, <code className="equation-hint">sin(x)</code>,{" "}
            <code className="equation-hint">2*x + 1</code>
            ). Math.js syntax: <code className="equation-hint">^</code> power,{" "}
            <code className="equation-hint">sqrt(x)</code>, <code className="equation-hint">log(x)</code>,{" "}
            <code className="equation-hint">exp(x)</code>, <code className="equation-hint">pi</code>,{" "}
            <code className="equation-hint">e</code>.
          </p>
          <label className="equation-field-label" htmlFor="equation-input">
            f(x) =
          </label>
          <textarea
            id="equation-input"
            className="equation-input"
            rows={3}
            spellCheck={false}
            value={equationInput}
            onChange={(e) => setEquationInput(e.target.value)}
            placeholder="x^2 - 0.5"
          />
          <label className="equation-checkbox">
            <input
              type="checkbox"
              checked={showDerivative}
              onChange={(e) => {
                const next = e.target.checked;
                setShowDerivative(next);
                if (equationSegments.length > 0 || derivativeSegments.length > 0) {
                  applyEquationPlot(next);
                }
              }}
            />
            Plot derivative f′(x)
          </label>
          <div className="equation-actions">
            <button type="button" onClick={handlePlotEquation}>
              Plot on canvas
            </button>
            <button type="button" onClick={handleClearEquationPlots}>
              Clear plots
            </button>
          </div>
          {equationError ? (
            <p className="equation-error" role="alert">
              {equationError}
            </p>
          ) : null}
          <p className="equation-legend">
            <span className="equation-legend-swatch equation-legend-fn" /> f(x)
            {showDerivative ? (
              <>
                {" "}
                <span className="equation-legend-swatch equation-legend-df" /> f′(x)
              </>
            ) : null}
          </p>
        </div>
        <div className="Curves">
          <h2 className="parent-toggle-header">Curves</h2>
          <p className="parent-description">Toggle smooth curves on or off.</p>
          <label>
            <input
              type="checkbox"
              checked={smoothMode}
              onChange={(e) => setSmoothMode(e.target.checked)}
            />
            Toggle Smooth Curves
          </label>
          <button onClick={handleUndo}>Undo</button>
          <button onClick={() => setLineVertices([])}>Clear</button>
        </div>
        <div className="image-export">
          <h2 className="parent-toggle-header">Export</h2>
          <p className="parent-description">Export your canvas as an image file.</p>
          <button onClick={() => {
            const dataURL = canvasRef.current.toDataURL("image/png");
            const link = document.createElement("a");
            link.download = "canvas.png";
            link.href = dataURL;
            link.click();
          }}>
            Export as PNG
          </button>
        </div>
        <Link to="/">Back Home</Link>
      </div>
    </div>
  );
}
