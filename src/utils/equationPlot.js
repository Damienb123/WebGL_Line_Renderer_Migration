import { create, all } from "mathjs";

const math = create(all, {});

/**
 * @param {unknown} val
 * @returns {number | null}
 */
function toFiniteReal(val) {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (val && typeof val === "object" && "re" in val) {
    const im = val.im ?? 0;
    if (Math.abs(im) > 1e-8) return null;
    const re = val.re;
    return typeof re === "number" && Number.isFinite(re) ? re : null;
  }
  return null;
}

/**
 * Samples y = f(x) into polylines; breaks on NaN, non-real, or large jumps (discontinuities).
 * Coordinates use the same NDC range as the canvas (−1…1 for both axes).
 *
 * @param {(x: number) => unknown} evaluateFn
 * @param {{ samples?: number, xMin?: number, xMax?: number, jumpThreshold?: number }} [opts]
 * @returns {Float32Array[]}
 */
export function sampleCurveSegments(evaluateFn, opts = {}) {
  const samples = opts.samples ?? 280;
  const xMin = opts.xMin ?? -1;
  const xMax = opts.xMax ?? 1;
  const jumpThreshold = opts.jumpThreshold ?? 12;

  /** @type {Float32Array[]} */
  const segments = [];
  /** @type {number[]} */
  let buf = [];
  let prevY = /** @type {number | null} */ (null);

  const flush = () => {
    if (buf.length >= 4) {
      segments.push(new Float32Array(buf));
    }
    buf = [];
  };

  for (let i = 0; i <= samples; i++) {
    const x = xMin + ((xMax - xMin) * i) / samples;
    let raw;
    try {
      raw = evaluateFn(x);
    } catch {
      flush();
      prevY = null;
      continue;
    }
    const y = toFiniteReal(raw);
    if (y === null) {
      flush();
      prevY = null;
      continue;
    }
    if (prevY !== null && Math.abs(y - prevY) > jumpThreshold) {
      flush();
    }
    buf.push(x, y);
    prevY = y;
  }
  flush();
  return segments;
}

/**
 * @param {string} expression
 * @param {{ samples?: number, includeDerivative?: boolean }} [opts]
 * @returns {{ ok: true, segments: Float32Array[], derivativeSegments: Float32Array[] } | { ok: false, error: string }}
 */
export function buildPlotsFromExpression(expression, opts = {}) {
  const trimmed = expression.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter an expression." };
  }

  try {
    const node = math.parse(trimmed);
    const f = node.compile();

    /** @param {number} x */
    const evalF = (x) => f.evaluate({ x });

    const segments = sampleCurveSegments(evalF, { samples: opts.samples });

    /** @type {Float32Array[]} */
    let derivativeSegments = [];
    if (opts.includeDerivative) {
      const dNode = math.derivative(node, "x");
      const df = dNode.compile();
      derivativeSegments = sampleCurveSegments((x) => df.evaluate({ x }), {
        samples: opts.samples,
      });
    }

    if (segments.length === 0 && derivativeSegments.length === 0) {
      return { ok: false, error: "No drawable points (undefined or non-real in range)." };
    }

    return { ok: true, segments, derivativeSegments };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
