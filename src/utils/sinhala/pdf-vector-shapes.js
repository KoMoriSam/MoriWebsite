// PDF.js replaces packed drawing commands with Path2D during rendering. Keep
// the original commands weakly associated with that path for editable export.
const packedPaths = new WeakMap();

export function rememberPdfPath(operators, index, OPS) {
  if (operators.fnArray[index] !== OPS.constructPath) return;
  const data = operators.argsArray[index][1];
  if (Array.isArray(data?.[0]) || ArrayBuffer.isView(data?.[0])) {
    packedPaths.set(data, Array.from(data[0]));
  }
}

function commandsFrom(data, matrix) {
  const packed = packedPaths.get(data);
  if (!packed?.length) return null;
  const commands = [];
  for (let index = 0; index < packed.length; ) {
    const operation = packed[index++];
    const count = [2, 2, 6, 4, 0][operation];
    if (count === undefined || index + count > packed.length) return null;
    const points = [];
    for (let offset = 0; offset < count; offset += 2) {
      const x = packed[index++],
        y = packed[index++];
      points.push(
        matrix[0] * x + matrix[2] * y + matrix[4],
        matrix[1] * x + matrix[3] * y + matrix[5],
      );
    }
    commands.push({
      type: ["move", "line", "cubic", "quadratic", "close"][operation],
      points,
    });
  }
  return commands.every((command) => command.points.every(Number.isFinite))
    ? commands
    : null;
}

function boundsOf(commands) {
  const points = commands.flatMap((command) => command.points);
  const xs = points.filter((_, index) => index % 2 === 0);
  const ys = points.filter((_, index) => index % 2 === 1);
  const x = Math.min(...xs),
    y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

function rectangle(commands) {
  const segments = commands.filter((command) => command.type !== "close");
  if (
    segments.length === 5 &&
    segments.at(-1).type === "line" &&
    segments
      .at(-1)
      .points.every(
        (value, i) => Math.abs(value - segments[0].points[i]) < 0.01,
      )
  )
    segments.pop();
  if (
    segments.length !== 4 ||
    segments[0].type !== "move" ||
    segments.slice(1).some((command) => command.type !== "line")
  )
    return false;
  return segments.every(({ points: a }, index) => {
    const b = segments[(index + 1) % 4].points;
    return Math.abs(a[0] - b[0]) < 0.01 !== Math.abs(a[1] - b[1]) < 0.01;
  });
}

function preset(commands, bounds) {
  const last = commands.at(-1);
  const closed =
    last.type === "close" ||
    last.points
      .slice(-2)
      .every((value, i) => Math.abs(value - commands[0].points[i]) < 0.01);
  if (rectangle(commands) && closed) return "rect";
  const curves = commands.filter((command) => command.type === "cubic");
  if (
    curves.length !== 4 ||
    commands.some((command) => ["line", "quadratic"].includes(command.type))
  )
    return null;
  const ends = [
    commands[0].points,
    ...curves.map((command) => command.points.slice(-2)),
  ];
  const cx = bounds.x + bounds.width / 2,
    cy = bounds.y + bounds.height / 2;
  const anchors = [
    [bounds.x, cy],
    [cx, bounds.y],
    [bounds.x + bounds.width, cy],
    [cx, bounds.y + bounds.height],
  ];
  const rx = bounds.width / 2,
    ry = bounds.height / 2;
  if (
    !closed ||
    !rx ||
    !ry ||
    !ends.every(([x, y]) =>
      anchors.some(([a, b]) => Math.hypot(x - a, y - b) < 0.02),
    ) ||
    new Set(
      ends
        .slice(0, 4)
        .map(([x, y]) =>
          anchors.findIndex(([a, b]) => Math.hypot(x - a, y - b) < 0.02),
        ),
    ).size !== 4
  )
    return null;
  const ellipse = curves.every(({ points }, i) => {
    const start = [(ends[i][0] - cx) / rx, (ends[i][1] - cy) / ry];
    const end = [(ends[i + 1][0] - cx) / rx, (ends[i + 1][1] - cy) / ry];
    const direction = Math.sign(start[0] * end[1] - start[1] * end[0]);
    const k = 0.55228475 * direction;
    const expected = [
      ends[i][0] - start[1] * rx * k,
      ends[i][1] + start[0] * ry * k,
      ends[i + 1][0] + end[1] * rx * k,
      ends[i + 1][1] - end[0] * ry * k,
    ];
    return (
      direction &&
      expected.every(
        (value, j) =>
          Math.abs(value - points[j]) <
          Math.max(0.03, Math.max(rx, ry) * 0.002),
      )
    );
  });
  return ellipse ? "ellipse" : null;
}

function intersect(a, b) {
  const x = Math.max(a.x, b.x),
    y = Math.max(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(0, Math.min(a.x + a.width, b.x + b.width) - x),
    height: Math.max(0, Math.min(a.y + a.height, b.y + b.height) - y),
  };
}

function contains(outer, inner) {
  return (
    inner.x >= outer.x - 0.02 &&
    inner.y >= outer.y - 0.02 &&
    inner.x + inner.width <= outer.x + outer.width + 0.02 &&
    inner.y + inner.height <= outer.y + outer.height + 0.02
  );
}

function evenOddCommands(commands, stroke) {
  const paths = [];
  for (const command of commands) {
    if (command.type === "move") paths.push([]);
    if (!paths.length) return null;
    paths.at(-1).push(command);
  }
  if (paths.length <= 1) return commands;
  if (stroke && paths.some((path) => path.at(-1).type !== "close")) return null;
  const polygons = paths.map((path) => {
    const points = [path[0].points];
    for (const command of path.slice(1)) {
      if (command.type === "close") continue;
      const start = points.at(-1),
        p = command.points;
      if (command.type === "line") points.push(p);
      else
        for (let step = 1; step <= 16; step++) {
          const t = step / 16,
            u = 1 - t;
          points.push(
            [0, 1].map((i) =>
              command.type === "cubic"
                ? u ** 3 * start[i] +
                  3 * u ** 2 * t * p[i] +
                  3 * u * t ** 2 * p[i + 2] +
                  t ** 3 * p[i + 4]
                : u ** 2 * start[i] + 2 * u * t * p[i] + t ** 2 * p[i + 2],
            ),
          );
        }
    }
    return points;
  });
  const area = (points) =>
    points.reduce((sum, [x, y], i) => {
      const next = points[(i + 1) % points.length];
      return sum + x * next[1] - next[0] * y;
    }, 0);
  const inside = ([x, y], polygon) => {
    let result = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i],
        b = polygon[j];
      if (
        a[1] > y !== b[1] > y &&
        x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
      )
        result = !result;
    }
    return result;
  };
  const cross = (a, b, c) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  // Contained contours describe holes. Crossing contours need a boolean path
  // operation instead, so retain their original rendering rather than fill it.
  for (let i = 0; i < polygons.length; i++)
    for (let j = i + 1; j < polygons.length; j++) {
      const a = polygons[i],
        b = polygons[j];
      for (let k = 0; k < a.length; k++)
        for (let l = 0; l < b.length; l++) {
          const c = a[(k + 1) % a.length],
            d = b[(l + 1) % b.length];
          if (
            cross(a[k], c, b[l]) * cross(a[k], c, d) < -1e-10 &&
            cross(b[l], d, a[k]) * cross(b[l], d, c) < -1e-10
          )
            return null;
        }
    }
  return paths.flatMap((path, i) => {
    const depth = polygons.filter(
      (polygon, j) => j !== i && inside(polygons[i][0], polygon),
    ).length;
    if (area(polygons[i]) > 0 === (depth % 2 === 0)) return path;
    let start = path[0].points;
    const segments = path
      .slice(1)
      .filter((command) => command.type !== "close")
      .map((command) => {
        const segment = { ...command, start };
        start = command.points.slice(-2);
        return segment;
      });
    return [
      { type: "move", points: start },
      ...segments.reverse().map((segment) => ({
        type: segment.type,
        points:
          segment.type === "cubic"
            ? [
                ...segment.points.slice(2, 4),
                ...segment.points.slice(0, 2),
                ...segment.start,
              ]
            : segment.type === "quadratic"
              ? [...segment.points.slice(0, 2), ...segment.start]
              : segment.start,
      })),
      { type: "close", points: [] },
    ];
  });
}

// Return a shape for each representable paint operation. A null value means
// that operation was merged into the preceding fill/stroke of the same shape.
export function pdfVectorShapes(operators, viewport, { OPS, Util }) {
  const shapes = new Map(),
    stack = [];
  const fillOps = new Set([
    OPS.fill,
    OPS.eoFill,
    OPS.fillStroke,
    OPS.eoFillStroke,
    OPS.closeFillStroke,
    OPS.closeEOFillStroke,
  ]);
  const strokeOps = new Set([
    OPS.stroke,
    OPS.closeStroke,
    OPS.fillStroke,
    OPS.eoFillStroke,
    OPS.closeFillStroke,
    OPS.closeEOFillStroke,
  ]);
  const interrupts = new Set([
    OPS.showText,
    OPS.showSpacedText,
    OPS.nextLineShowText,
    OPS.nextLineSetSpacingShowText,
    ...Object.entries(OPS)
      .filter(([name]) => name.startsWith("paint"))
      .map(([, value]) => value),
  ]);
  let state = {
    matrix: viewport.transform,
    fill: "000000",
    stroke: "000000",
    fillAlpha: 1,
    strokeAlpha: 1,
    lineWidth: 1,
    cap: 0,
    join: 0,
    miter: 10,
    dash: [],
    dashPhase: 0,
    blend: "source-over",
    clip: { x: 0, y: 0, width: viewport.width, height: viewport.height },
    complexClip: false,
  };
  let pendingClip = false,
    previous;
  const save = () => {
    stack.push({ ...state });
  };
  const restore = () => {
    state = stack.pop() || state;
    pendingClip = false;
  };
  for (let index = 0; index < operators.fnArray.length; index++) {
    const operation = operators.fnArray[index],
      args = operators.argsArray[index];
    if (operation === OPS.save) save();
    else if (operation === OPS.restore) restore();
    else if (operation === OPS.transform)
      state.matrix = Util.transform(state.matrix, args);
    else if (operation === OPS.setFillRGBColor) {
      state.fill = /^#[\da-f]{6}$/iu.test(args[0])
        ? args[0].slice(1).toUpperCase()
        : null;
      state.fillTransparent = false;
    } else if (operation === OPS.setStrokeRGBColor) {
      state.stroke = /^#[\da-f]{6}$/iu.test(args[0])
        ? args[0].slice(1).toUpperCase()
        : null;
      state.strokeTransparent = false;
    } else if (operation === OPS.setFillTransparent) {
      state.fill = "000000";
      state.fillTransparent = true;
    } else if (operation === OPS.setStrokeTransparent) {
      state.stroke = "000000";
      state.strokeTransparent = true;
    } else if (operation === OPS.setFillColorN) state.fill = null;
    else if (operation === OPS.setStrokeColorN) state.stroke = null;
    else if (operation === OPS.setLineWidth) state.lineWidth = args[0];
    else if (operation === OPS.setLineCap) state.cap = args[0];
    else if (operation === OPS.setLineJoin) state.join = args[0];
    else if (operation === OPS.setMiterLimit) state.miter = args[0];
    else if (operation === OPS.setDash) [state.dash, state.dashPhase] = args;
    else if (operation === OPS.setGState) {
      for (const [key, value] of args[0]) {
        const property = {
          LW: "lineWidth",
          LC: "cap",
          LJ: "join",
          ML: "miter",
          ca: "fillAlpha",
          CA: "strokeAlpha",
          BM: "blend",
          SMask: "mask",
          TR: "transfer",
        }[key];
        if (property) state[property] = value;
        else if (key === "D") [state.dash, state.dashPhase] = value;
      }
    } else if (operation === OPS.clip || operation === OPS.eoClip)
      pendingClip = true;
    else if (
      operation === OPS.paintFormXObjectBegin ||
      operation === OPS.beginGroup
    ) {
      save();
      const group =
        operation === OPS.beginGroup
          ? args[0]
          : { matrix: args[0], bbox: args[1] };
      if (group.matrix)
        state.matrix = Util.transform(state.matrix, group.matrix);
      if (group.bbox) {
        const [x0, y0, x1, y1] = group.bbox;
        const points = [
          [x0, y0],
          [x1, y0],
          [x1, y1],
          [x0, y1],
        ].map(([x, y]) => ({
          type: "line",
          points: [
            state.matrix[0] * x + state.matrix[2] * y + state.matrix[4],
            state.matrix[1] * x + state.matrix[3] * y + state.matrix[5],
          ],
        }));
        state.clip = intersect(state.clip, boundsOf(points));
        state.complexClip ||=
          Math.abs(state.matrix[1] * state.matrix[0]) > 0.001 ||
          Math.abs(state.matrix[2] * state.matrix[3]) > 0.001;
      }
      state.mask ||= Boolean(
        group.smask || group.knockout || group.hasSoftMask,
      );
    } else if (
      operation === OPS.paintFormXObjectEnd ||
      operation === OPS.endGroup
    )
      restore();
    else if (operation === OPS.constructPath) {
      let commands = commandsFrom(args[1], state.matrix);
      const paint = args[0],
        fill = fillOps.has(paint),
        stroke = strokeOps.has(paint);
      const bounds = commands?.length ? boundsOf(commands) : null;
      const sx = Math.hypot(state.matrix[0], state.matrix[1]);
      const sy = Math.hypot(state.matrix[2], state.matrix[3]);
      const similarity =
        Math.abs(sx - sy) < 0.001 &&
        Math.abs(
          state.matrix[0] * state.matrix[2] + state.matrix[1] * state.matrix[3],
        ) < 0.001;
      const halfStroke = stroke
        ? ((state.lineWidth || 0.5 / (sx || 1)) * sx) / 2
        : 0;
      const paintedBounds = bounds && {
        x: bounds.x - halfStroke,
        y: bounds.y - halfStroke,
        width: bounds.width + halfStroke * 2,
        height: bounds.height + halfStroke * 2,
      };
      const evenOdd = [
        OPS.eoFill,
        OPS.eoFillStroke,
        OPS.closeEOFillStroke,
      ].includes(paint);
      if (evenOdd && commands) commands = evenOddCommands(commands, stroke);
      if (
        (fill || stroke) &&
        bounds &&
        contains(state.clip, paintedBounds) &&
        !state.complexClip &&
        !state.mask &&
        !state.transfer &&
        state.blend === "source-over" &&
        (!fill || state.fill) &&
        (!stroke ||
          (state.stroke && sx > 1e-6 && similarity && !state.dashPhase)) &&
        commands
      ) {
        const shape = {
          kind: "shape",
          paintOrder: index,
          ...bounds,
          commands,
          preset: preset(commands, bounds),
          fill: fill ? state.fill : null,
          fillAlpha: state.fillTransparent ? 0 : state.fillAlpha,
          stroke: stroke ? state.stroke : null,
          strokeAlpha: state.strokeTransparent ? 0 : state.strokeAlpha,
          lineWidth: (state.lineWidth || 0.5 / (sx || 1)) * sx,
          cap: state.cap,
          join: state.join,
          miter: state.miter,
          dash: state.dash.map((value) => value * sx),
        };
        if (
          [
            OPS.closeStroke,
            OPS.closeFillStroke,
            OPS.closeEOFillStroke,
          ].includes(paint) &&
          commands.at(-1).type !== "close"
        ) {
          commands.push({ type: "close", points: [] });
        }
        // Office frequently paints a translucent fill and opaque border as
        // two adjacent operations. Export one editable shape with both styles.
        if (
          previous &&
          previous.fill &&
          !previous.stroke &&
          !shape.fill &&
          shape.stroke &&
          JSON.stringify(previous.commands) === JSON.stringify(shape.commands)
        ) {
          Object.assign(previous, {
            stroke: shape.stroke,
            strokeAlpha: shape.strokeAlpha,
            lineWidth: shape.lineWidth,
            cap: shape.cap,
            join: shape.join,
            miter: shape.miter,
            dash: shape.dash,
          });
          shapes.set(index, null);
        } else {
          shapes.set(index, shape);
          previous = shape;
        }
      } else if (fill || stroke) previous = null;
      if (pendingClip) {
        if (bounds) state.clip = intersect(state.clip, bounds);
        state.complexClip ||= !commands || !rectangle(commands);
        pendingClip = false;
      }
    } else if (interrupts.has(operation)) previous = null;
  }
  return shapes;
}
