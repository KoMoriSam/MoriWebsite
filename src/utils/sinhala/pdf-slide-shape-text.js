function lineBounds(line) {
  if (!line.bounds) return null;
  const spans = line.spans.filter((span) => span.text.trim() && span.bounds);
  if (!spans.length) return null;
  const x = Math.min(...spans.map((span) => span.bounds.x));
  const y = Math.min(...spans.map((span) => span.bounds.y));
  return {
    x,
    y,
    width:
      Math.max(...spans.map((span) => span.bounds.x + span.bounds.width)) - x,
    height:
      Math.max(...spans.map((span) => span.bounds.y + span.bounds.height)) - y,
  };
}

function closedShape(shape) {
  if (shape.preset) return true;
  if (shape.commands.filter((command) => command.type === "move").length !== 1)
    return false;
  const last = shape.commands.at(-1);
  return (
    last.type === "close" ||
    last.points
      .slice(-2)
      .every((value, i) => Math.abs(value - shape.commands[0].points[i]) < 0.01)
  );
}

function pathContains(shape, x, y, tolerance) {
  if (shape.preset === "rect") return true;
  if (shape.preset === "ellipse")
    return (
      ((x - shape.x - shape.width / 2) / (shape.width / 2 + tolerance)) ** 2 +
        ((y - shape.y - shape.height / 2) / (shape.height / 2 + tolerance)) **
          2 <=
      1
    );
  const polygon = [];
  for (const command of shape.commands) {
    const p = command.points;
    if (command.type === "move" || command.type === "line") polygon.push(p);
    else if (command.type === "cubic" || command.type === "quadratic") {
      const start = polygon.at(-1);
      for (let step = 1; step <= 16; step++) {
        const t = step / 16,
          u = 1 - t;
        polygon.push(
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
  }
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[j],
      b = polygon[i];
    const dx = b[0] - a[0],
      dy = b[1] - a[1];
    const t = Math.max(
      0,
      Math.min(
        1,
        ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1),
      ),
    );
    if (Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy) <= tolerance)
      return true;
    if (
      a[1] > y !== b[1] > y &&
      x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside;
}

// Associate text with the smallest enclosing foreground shape. Page backgrounds,
// open connectors and artwork that would change text occlusion are not owners.
export function pdfSlideTextShape(line, page) {
  const bounds = lineBounds(line);
  if (!bounds || !Number.isFinite(line.paintOrder)) return undefined;
  const size = Math.max(
    ...line.spans
      .filter((span) => span.text.trim())
      .map((span) => span.sizePoints ?? span.sizeHalfPoints / 2),
    1,
  );
  const cx = bounds.x + bounds.width / 2,
    cy = bounds.y + bounds.height / 2;
  const layers = page.artworkLayers || [];
  const overlaps = (layer) =>
    layer.x < bounds.x + bounds.width &&
    layer.x + layer.width > bounds.x &&
    layer.y < bounds.y + bounds.height &&
    layer.y + layer.height > bounds.y;
  const candidates = layers.flatMap((shape, index) => {
    if (
      shape.kind !== "shape" ||
      shape.paintOrder >= line.paintOrder ||
      !closedShape(shape) ||
      (shape.x <= 1 &&
        shape.y <= 1 &&
        shape.x + shape.width >= page.width - 1 &&
        shape.y + shape.height >= page.height - 1)
    )
      return [];
    const tolerance = Math.min(size * 0.22, shape.height * 0.2);
    if (
      cx < shape.x ||
      cx > shape.x + shape.width ||
      cy < shape.y ||
      cy > shape.y + shape.height ||
      bounds.x < shape.x - tolerance ||
      bounds.x + bounds.width > shape.x + shape.width + tolerance ||
      bounds.y < shape.y - tolerance ||
      bounds.y + bounds.height > shape.y + shape.height + tolerance
    )
      return [];
    const points = [
      [cx, cy],
      [bounds.x, bounds.y],
      [bounds.x + bounds.width, bounds.y],
      [bounds.x, bounds.y + bounds.height],
      [bounds.x + bounds.width, bounds.y + bounds.height],
    ];
    if (!points.every(([x, y]) => pathContains(shape, x, y, tolerance)))
      return [];
    if (
      layers.some(
        (layer) =>
          layer !== shape &&
          layer.paintOrder > shape.paintOrder &&
          layer.paintOrder < line.paintOrder &&
          overlaps(layer),
      )
    )
      return [];
    return [{ index, area: shape.width * shape.height }];
  });
  return candidates.sort(
    (a, b) =>
      a.area - b.area ||
      layers[b.index].paintOrder - layers[a.index].paintOrder,
  )[0]?.index;
}
