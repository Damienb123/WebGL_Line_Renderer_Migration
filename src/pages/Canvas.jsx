import { useRef, useEffect, useState } from "react";
import "../App.css";
import { Link } from "react-router-dom";

export default function Draw() {
  // DOM + WebGL refs
  const canvasRef = useRef(null);
  const glRef = useRef(null);
  const programRef = useRef(null);

  // State
  const [lineVertices, setLineVertices] = useState([]);
  const [lineColor, setLineColor] = useState("#ff0000");
  const [lineWidth, setLineWidth] = useState(2);
  const [smoothMode, setSmoothMode] = useState(false);

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
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const { r, g, b } = hexToRgb(lineColor);
    gl.uniform4f(colorLocation, r, g, b, 1);
    gl.uniform1f(pointSizeLocation, lineWidth);

    gl.drawArrays(gl.LINE_STRIP, 0, vertices.length / 2);

  }, [lineVertices, lineColor, lineWidth, smoothMode]);

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

  // -------------------------------
  // application UI for line management, curve toggling, and image export
  // separate divs are used for dedicating types of capabilities within the application for the user
  // Line clearing is implemented with both use cases, for clearing all segment creations and to clear lineVertices and curves line by line using prev state
  // 
  return (
    <div className="dashboard-container">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        onClick={handleCanvasClick}
        style={{ border: "1px solid #ccc", borderRadius: "20px" }}
      />

      <div className="dashboard-toggles">
        <div className="line-management">
            <h2 className="parent-toggle-header">Line Management</h2>
            <button onClick={() => setLineVertices([])}>Clear</button>
            <button onClick={() => setLineVertices((prev) => [...prev, ...[0, 0, 0, 0]])}>Add Point</button>
            <button onClick={() => setLineVertices((prev) => [...prev, ...[-0.5, -0.5, 0.5, 0.5]])}>Add Line</button>
          </div> 
        <div className="Curves">
          <h2 className="parent-toggle-header">Curves</h2>
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
