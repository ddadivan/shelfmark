// Expands strokes to filled outlines for the 16px icon set (libs/ui/src/icons/16).
//
// The sprite optimiser forbids `stroke`, so icons are drawn here as stroked centre lines (lines and
// circular arcs, curves are flattened) and written as one filled `<path>` per icon: every piece
// is wound the same way, so the default `nonzero` fill makes overlaps a union and a closed ring a
// hole. Round caps and round joins. Zero dependencies, deterministic output.

const EPSILON = 1e-6;
/** Joins that turn less than this (radians) are drawn as a plain corner, not a round arc. */
const SMOOTH_TURN = (6 * Math.PI) / 180;
/** Flattening step for cubic and quadratic curves, in px. */
const FLATTEN_STEP = 0.35;

const round = (value) => {
  const text = (Math.round(value * 100) / 100).toFixed(2).replace(/\.?0+$/, '');
  return text === '-0' ? '0' : text;
};
const point = (x, y) => `${round(x)} ${round(y)}`;

/** Splits `d` into commands with numbers; supports M L H V C Q A Z and lowercase (relative). */
function tokenise(d) {
  const tokens = [];
  for (const m of d.matchAll(/([MLHVCQAZmlhvcqaz])|(-?\d*\.?\d+(?:e-?\d+)?)/g)) {
    tokens.push(m[1] ?? Number(m[2]));
  }
  return tokens;
}

const ARITY = { M: 2, L: 2, H: 1, V: 1, C: 6, Q: 4, A: 7, Z: 0 };

/** Arc given as endpoints (SVG arc, circular only) to centre form. */
function arcSegment(p0, r, large, sweep, p1) {
  const dx = (p0.x - p1.x) / 2;
  const dy = (p0.y - p1.y) / 2;
  const half = Math.hypot(dx, dy);
  if (half < EPSILON) {
    return null;
  }
  const radius = Math.max(r, half);
  const factor =
    (Math.sqrt(Math.max(0, radius * radius - half * half)) / half) * (large === sweep ? -1 : 1);
  const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
  const c = { x: mid.x + factor * dy, y: mid.y - factor * dx };
  const a0 = Math.atan2(p0.y - c.y, p0.x - c.x);
  let delta = Math.atan2(p1.y - c.y, p1.x - c.x) - a0;
  if (sweep && delta < 0) {
    delta += 2 * Math.PI;
  } else if (!sweep && delta > 0) {
    delta -= 2 * Math.PI;
  }
  return { type: 'A', c, r: radius, a0, a1: a0 + delta };
}

/** Path string -> list of sub-paths, each `{ segments, closed }`. */
export function parsePath(d) {
  const tokens = tokenise(d);
  const subpaths = [];
  let current = null;
  let pen = { x: 0, y: 0 };
  let start = pen;
  let i = 0;
  let command = '';

  const finish = () => {
    if (current && current.segments.length > 0) {
      subpaths.push(current);
    }
    current = null;
  };
  const line = (to) => {
    if (Math.hypot(to.x - pen.x, to.y - pen.y) > EPSILON) {
      current.segments.push({ type: 'L', p0: pen, p1: to });
    }
    pen = to;
  };
  const flatten = (points) => {
    const length = points.reduce(
      (sum, p, k) => (k === 0 ? 0 : sum + Math.hypot(p.x - points[k - 1].x, p.y - points[k - 1].y)),
      0,
    );
    const steps = Math.max(4, Math.ceil(length / FLATTEN_STEP / 2) * 2);
    const at = (t) => {
      let pts = points;
      while (pts.length > 1) {
        pts = pts.slice(1).map((p, k) => ({
          x: pts[k].x + (p.x - pts[k].x) * t,
          y: pts[k].y + (p.y - pts[k].y) * t,
        }));
      }
      return pts[0];
    };
    for (let s = 1; s <= steps; s += 1) {
      line(at(s / steps));
    }
  };

  while (i < tokens.length) {
    if (typeof tokens[i] === 'string') {
      command = tokens[i];
      i += 1;
      if (command === 'Z' || command === 'z') {
        if (current) {
          line(start);
          current.closed = true;
          finish();
          pen = start;
        }
        continue;
      }
    }
    const upper = command.toUpperCase();
    const relative = command !== upper;
    const args = tokens.slice(i, i + ARITY[upper]);
    i += ARITY[upper];
    const ox = relative ? pen.x : 0;
    const oy = relative ? pen.y : 0;
    if (upper === 'M') {
      finish();
      pen = { x: args[0] + ox, y: args[1] + oy };
      start = pen;
      current = { segments: [], closed: false };
      command = relative ? 'l' : 'L';
    } else if (upper === 'L') {
      line({ x: args[0] + ox, y: args[1] + oy });
    } else if (upper === 'H') {
      line({ x: args[0] + ox, y: pen.y });
    } else if (upper === 'V') {
      line({ x: pen.x, y: args[0] + oy });
    } else if (upper === 'C') {
      flatten([
        pen,
        { x: args[0] + ox, y: args[1] + oy },
        { x: args[2] + ox, y: args[3] + oy },
        { x: args[4] + ox, y: args[5] + oy },
      ]);
    } else if (upper === 'Q') {
      flatten([pen, { x: args[0] + ox, y: args[1] + oy }, { x: args[2] + ox, y: args[3] + oy }]);
    } else if (upper === 'A') {
      const to = { x: args[5] + ox, y: args[6] + oy };
      const arc = arcSegment(pen, args[0], args[3], args[4], to);
      if (arc) {
        current.segments.push(arc);
      }
      pen = to;
    } else {
      throw new Error(`unsupported path command ${command}`);
    }
  }
  finish();
  return subpaths;
}

const startOf = (s) =>
  s.type === 'L' ? s.p0 : { x: s.c.x + s.r * Math.cos(s.a0), y: s.c.y + s.r * Math.sin(s.a0) };
const endOf = (s) =>
  s.type === 'L' ? s.p1 : { x: s.c.x + s.r * Math.cos(s.a1), y: s.c.y + s.r * Math.sin(s.a1) };

function tangentAt(s, atEnd) {
  if (s.type === 'L') {
    const len = Math.hypot(s.p1.x - s.p0.x, s.p1.y - s.p0.y);
    return { x: (s.p1.x - s.p0.x) / len, y: (s.p1.y - s.p0.y) / len };
  }
  const angle = atEnd ? s.a1 : s.a0;
  const dir = s.a1 > s.a0 ? 1 : -1;
  return { x: -Math.sin(angle) * dir, y: Math.cos(angle) * dir };
}

const reverseSegment = (s) =>
  s.type === 'L' ? { type: 'L', p0: s.p1, p1: s.p0 } : { ...s, a0: s.a1, a1: s.a0 };
const reverseSegments = (segments) => segments.map(reverseSegment).reverse();

/** The side-A normal (left of the travel direction on screen). */
const normal = (t) => ({ x: t.y, y: -t.x });
const offset = (p, n, h) => ({ x: p.x + n.x * h, y: p.y + n.y * h });

/** Path commands (no leading M) for the A-side of a chain of segments; returns end offset point. */
function sideA(segments, h, closed) {
  const first = segments[0];
  const startPoint = offset(startOf(first), normal(tangentAt(first, false)), h);
  let out = `M${point(startPoint.x, startPoint.y)}`;
  const count = segments.length;
  for (let k = 0; k < count; k += 1) {
    const s = segments[k];
    const end = endOf(s);
    const t1 = tangentAt(s, true);
    const endOffset = offset(end, normal(t1), h);
    if (s.type === 'L') {
      out += `L${point(endOffset.x, endOffset.y)}`;
    } else {
      const increasing = s.a1 > s.a0;
      const radius = increasing ? s.r + h : s.r - h;
      if (radius < 0.05) {
        out += `L${point(endOffset.x, endOffset.y)}`;
      } else {
        const large = Math.abs(s.a1 - s.a0) > Math.PI + EPSILON ? 1 : 0;
        out += `A${round(radius)} ${round(radius)} 0 ${large} ${increasing ? 1 : 0} ${point(endOffset.x, endOffset.y)}`;
      }
    }
    const next = k + 1 < count ? segments[k + 1] : closed ? segments[0] : null;
    if (next) {
      const t2 = tangentAt(next, false);
      const nextOffset = offset(endOf(s), normal(t2), h);
      const cross = t1.x * t2.y - t1.y * t2.x;
      const turn = Math.atan2(cross, t1.x * t2.x + t1.y * t2.y);
      if (Math.abs(turn) > SMOOTH_TURN && cross > 0) {
        out += `A${round(h)} ${round(h)} 0 0 1 ${point(nextOffset.x, nextOffset.y)}`;
      } else if (Math.abs(turn) > SMOOTH_TURN) {
        out += `L${point(end.x, end.y)}L${point(nextOffset.x, nextOffset.y)}`;
      } else if (Math.abs(turn) > EPSILON && (k + 1 < count || closed)) {
        out += `L${point(nextOffset.x, nextOffset.y)}`;
      }
    }
  }
  return out;
}

function signedArea(segments) {
  const pts = [];
  for (const s of segments) {
    if (s.type === 'L') {
      pts.push(s.p0);
    } else {
      const n = 24;
      for (let k = 0; k < n; k += 1) {
        const a = s.a0 + ((s.a1 - s.a0) * k) / n;
        pts.push({ x: s.c.x + s.r * Math.cos(a), y: s.c.y + s.r * Math.sin(a) });
      }
    }
  }
  let sum = 0;
  pts.forEach((p, k) => {
    const q = pts[(k + 1) % pts.length];
    sum += p.x * q.y - q.x * p.y;
  });
  return sum / 2;
}

/** Outline of one stroked sub-path as filled sub-path(s), wound clockwise (holes the other way). */
function strokeSubpath(sub, width) {
  const h = width / 2;
  let segments = sub.segments;
  if (sub.closed) {
    if (signedArea(segments) < 0) {
      segments = reverseSegments(segments);
    }
    return `${sideA(segments, h, true)}Z${sideA(reverseSegments(segments), h, true)}Z`;
  }
  const last = segments[segments.length - 1];
  const first = segments[0];
  const endNormal = normal(tangentAt(last, true));
  const capEnd = offset(endOf(last), endNormal, -h);
  const startNormal = normal(tangentAt(first, false));
  const capStart = offset(startOf(first), startNormal, h);
  return (
    `${sideA(segments, h, false)}A${round(h)} ${round(h)} 0 0 1 ${point(capEnd.x, capEnd.y)}` +
    `${sideA(reverseSegments(segments), h, false).replace(/^M[^LA]*/, '')}` +
    `A${round(h)} ${round(h)} 0 0 1 ${point(capStart.x, capStart.y)}Z`
  );
}

/** Stroked outline of a path string, `width` wide, as a path `d`. */
export function stroke(d, width = 1.5) {
  return parsePath(d)
    .map((sub) => strokeSubpath(sub, width))
    .join('');
}

/** A filled shape: returns `d` unchanged after checking the first sub-path winds clockwise. */
export function fill(d) {
  const [first] = parsePath(d.includes('Z') || d.includes('z') ? d : `${d}Z`);
  if (first && signedArea(first.segments) < 0) {
    throw new Error(`filled shape winds counter-clockwise: ${d}`);
  }
  return d;
}

/** Filled disc as a path. */
export function dot(cx, cy, r) {
  return `M${point(cx - r, cy)}A${round(r)} ${round(r)} 0 0 1 ${point(cx + r, cy)}A${round(r)} ${round(r)} 0 0 1 ${point(cx - r, cy)}Z`;
}

/** Centre line of a polygon / polyline with rounded corners (radius `r`) as a path string. */
export function rounded(points, r, closed = false) {
  const n = points.length;
  const parts = [];
  const corner = (k) => {
    const prev = points[(k - 1 + n) % n];
    const cur = points[k];
    const next = points[(k + 1) % n];
    const v1 = { x: prev[0] - cur[0], y: prev[1] - cur[1] };
    const v2 = { x: next[0] - cur[0], y: next[1] - cur[1] };
    const l1 = Math.hypot(v1.x, v1.y);
    const l2 = Math.hypot(v2.x, v2.y);
    const angle = Math.acos((v1.x * v2.x + v1.y * v2.y) / (l1 * l2));
    const radius = Array.isArray(r) ? r[k] : r;
    if (radius === 0 || Math.abs(Math.sin(angle)) < EPSILON) {
      return { a: cur, b: cur, radius: 0, sweep: 0 };
    }
    const tangent = radius / Math.tan(angle / 2);
    const cross = v1.x * v2.y - v1.y * v2.x;
    return {
      a: [cur[0] + (v1.x / l1) * tangent, cur[1] + (v1.y / l1) * tangent],
      b: [cur[0] + (v2.x / l2) * tangent, cur[1] + (v2.y / l2) * tangent],
      radius,
      // Travelling prev -> cur -> next turns clockwise on screen when cross < 0.
      sweep: cross < 0 ? 1 : 0,
    };
  };
  const corners = points.map((_, k) => (!closed && (k === 0 || k === n - 1) ? null : corner(k)));
  points.forEach((p, k) => {
    const c = corners[k];
    if (c === null) {
      parts.push(`${parts.length === 0 ? 'M' : 'L'}${point(p[0], p[1])}`);
    } else {
      parts.push(`${parts.length === 0 ? 'M' : 'L'}${point(c.a[0], c.a[1])}`);
      if (c.radius > 0) {
        parts.push(
          `A${round(c.radius)} ${round(c.radius)} 0 0 ${c.sweep} ${point(c.b[0], c.b[1])}`,
        );
      }
    }
  });
  return parts.join('') + (closed ? 'Z' : '');
}

/** Rounded rectangle centre line (x, y = top-left of the centre line). */
export function rect(x, y, w, h, r) {
  return rounded(
    [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ],
    r,
    true,
  );
}

/** Circle centre line as a path string (two half arcs). */
export function circle(cx, cy, r) {
  return `M${point(cx - r, cy)}A${round(r)} ${round(r)} 0 0 1 ${point(cx + r, cy)}A${round(r)} ${round(r)} 0 0 1 ${point(cx - r, cy)}Z`;
}
