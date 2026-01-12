import React, { useRef, useEffect, useState } from "react";
import "../App.css";

export default function Draw() {
  // canvas and state refs
  const canvasRef = useRef(null);
  const [lineVertices, setLineVertices] = useState([]);
  const [lineColor, setLineColor] = useState("#ff0000");
  const [lineWidth, setLineWidth] = useState(2);
  const [smoothMode, setSmoothMode] = useState(false);
  // useEffect to initialize WebGL context and shaders
  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });

    // -------------------------------
    // Shader sources
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

    // Compile shaders
    // -------------------------------
    // compiles a shader of given type from source code
    function compileShader(gl, source, type) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compilation failed:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);

    // Link program
    // -------------------------------
    // links the vertex and fragment shaders to create a WebGL program
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program linking failed:", gl.getProgramInfoLog(program));
    }
    gl.useProgram(program);

    // Attribute & uniform locations
    const positionLocation = gl.getAttribLocation(program, "a_position");
    const pointSizeLocation = gl.getUniformLocation(program, "u_pointSize");
    const colorLocation = gl.getUniformLocation(program, "u_color");

    // Buffer
    const lineBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);

    // Viewport and clear
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Draw function
    const drawLine = (vertices) => {
      gl.clear(gl.COLOR_BUFFER_BIT);

      const verticesToDraw = smoothMode ? calculateBezier(vertices) : vertices;

      gl.uniform1f(pointSizeLocation, lineWidth);

      gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verticesToDraw), gl.DYNAMIC_DRAW);

      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      gl.drawArrays(gl.LINE_STRIP, 0, verticesToDraw.length / 2);
    };

    // Bézier interpolation
    const calculateBezier = (vertices) => {
      if (vertices.length < 4) return vertices;
      const smoothed = [];
      for (let i = 0; i < vertices.length - 2; i += 2) {
        const x1 = vertices[i], y1 = vertices[i + 1];
        const x2 = vertices[i + 2], y2 = vertices[i + 3];
        for (let t = 0; t <= 1; t += 0.1) {
          smoothed.push(lerp(x1, x2, t), lerp(y1, y2, t));
        }
      }
      smoothed.push(vertices[vertices.length - 2], vertices[vertices.length - 1]);
      return smoothed;
    };

    const lerp = (start, end, t) => start + (end - start) * t;

    // Initial draw
    drawLine(lineVertices);

    // Store draw function in ref to access in event handlers
    canvasRef.current.drawLine = drawLine;
    canvasRef.current.gl = gl;

  }, [lineVertices, smoothMode, lineWidth]);

  // -------------------------------
  // Canvas click handler
  const handleCanvasClick = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / canvas.width) * 2 - 1;
    const y = ((rect.height - (event.clientY - rect.top)) / canvas.height) * 2 - 1;
    setLineVertices((prev) => [...prev, x, y]);
  };

  // Undo last point
  const handleUndo = () => {
    setLineVertices((prev) => prev.slice(0, -2));
  };

  // Line color change
  const handleColorChange = (e) => {
    const hex = e.target.value;
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const gl = canvasRef.current.gl;
    gl.uniform4f(gl.getUniformLocation(gl.program, "u_color"), r, g, b, 1.0);
    canvasRef.current.drawLine(lineVertices);
  };

  return (
    <div className="dashboard-container">
    <div className="Canvas">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        onClick={handleCanvasClick}
        style={{ 
            border: "1px solid #ccc", 
            borderRadius: "35px",
        }}
 
      />
      <div className="dashboard-toggles">
      <div className="export-image">
        <div className="image-export">
            <h3>Image Export</h3>
            <p>Export your lines as an image.</p>
            <button className="export-btn">
                Export Image
            </button>
        </div>
      </div>
      <div className="line-management">
        <h3>Line Management</h3>
        <p>Select whether you'd like to save your generated lines or save whats created.</p>
      <button className="save-btn">
                Save lines
            </button>
        <button className="load-btn">
            Load lines
        </button>
        </div>
        <div className="curve-toggling">
            <h3>Toggle Curves</h3>
            <p>Adjust your lines to view smooth curves.</p>
            <button className="curve-btn">
                Toggle smooth curves
            </button>
        </div>
        <div style={{ 
          marginTop: 10, 
        }}>
        <h3>Line Settings</h3>
        <input type="color" value={lineColor} onChange={(e) => setLineColor(e.target.value)} />
        <button className="undo-btn" onClick={handleUndo}>Undo</button>
        <button onClick={() => setSmoothMode(!smoothMode)}>
          {smoothMode ? "Smooth Off" : "Smooth On"}
        </button>
        <input
          type="range"
          min="1"
          max="10"
          value={lineWidth}
          onChange={(e) => setLineWidth(parseFloat(e.target.value))}
        />
      </div>
        </div>
    </div>
    </div>
  );
}
