import {
  BOARD_ROADS,
  MAP_SIZE,
  MAP_ART_SIZE,
  MAP_PIXEL_POINTS,
} from "../../../shared/games/fogport/board-data.js";
export { MAP_SIZE, MAP_ART_SIZE, MAP_PIXEL_POINTS };
const unit = (n) => (n * MAP_SIZE) / MAP_ART_SIZE;
export const MAP_POINTS = Object.fromEntries(
  Object.entries(MAP_PIXEL_POINTS).map(([id, p]) => [id, p.map(unit)]),
);
const point = (id) => MAP_PIXEL_POINTS[id];
// Future rail corridors may be shown as previews without entering legal targets.
export const displayedLinks = (links, era) =>
  links.filter(link => link[era] || (era === 'canal' && link.rail));
export const displayEra = (link, era) => link[era] ? era : 'rail';
function sample(a, b, curves) {
  let from = typeof a === 'string' ? point(a) : a;
  const points = [from];
  for (const [x1, y1, x2, y2, x, y] of curves) {
    for (let i = 1; i <= 16; i++) {
      const t = i / 16,
        u = 1 - t;
      points.push([
        u * u * u * from[0] +
          3 * u * u * t * x1 +
          3 * u * t * t * x2 +
          t * t * t * x,
        u * u * u * from[1] +
          3 * u * u * t * y1 +
          3 * u * t * t * y2 +
          t * t * t * y,
      ]);
    }
    from = [x, y];
  }
  points[points.length - 1] = typeof b === 'string' ? point(b) : b;
  return points;
}

// A corridor's rule ID, geometry, hover stroke and hit area share the same paths.
const geometry = new Map(
  BOARD_ROADS.map((road) => [
    road.id,
    Object.fromEntries(
      ["canal", "rail"]
        .filter((era) => road[era])
        .map((era) => [
          era,
          [
            sample(
              road.nodes[0], road.nodes[1],
              era === "rail" ? (road.railCurves ?? road.curves) : road.curves,
            ).map(([x, y]) => ({ x: unit(x), y: unit(y) })),
            ...(road.branches ?? []).map(branch =>
              sample(branch.from, branch.to, branch.curves).map(([x,y])=>({x:unit(x),y:unit(y)}))),
          ],
        ]),
    ),
  ]),
);
export function routeBranches(link, era = "canal") {
  const branches = geometry.get(link.id)?.[era];
  if (!branches) throw new Error("Unknown map edge " + link.id + " in " + era);
  return branches;
}
export function routePath(link, era = "canal") {
  return routeBranches(link, era)
    .map((points) => "M " + points.map((p) => p.x + " " + p.y).join(" L "))
    .join(" ");
}
export function routeSegments(link, era = "canal") {
  return routeBranches(link, era).flatMap((points) =>
    points.slice(1).map((b, i) => {
      const a = points[i];
      return {
        x: a.x,
        y: a.y,
        length: Math.hypot(b.x - a.x, b.y - a.y),
        angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
      };
    }),
  );
}
export function routeHitIds(links, era, position, tolerance = 12) {
  const distance = (link) =>
    Math.min(
      ...routeBranches(link, era).flatMap((points) =>
        points.slice(1).map((b, i) => {
          const a = points[i],
            dx = b.x - a.x,
            dy = b.y - a.y,
            length = dx * dx + dy * dy;
          if (!length) return Math.hypot(position.x - a.x, position.y - a.y);
          const t = Math.max(
            0,
            Math.min(
              1,
              ((position.x - a.x) * dx + (position.y - a.y) * dy) / length,
            ),
          );
          return Math.hypot(
            position.x - a.x - t * dx,
            position.y - a.y - t * dy,
          );
        }),
      ),
    );
  return links
    .filter((link) => link[era])
    .map((link) => ({ id: link.id, distance: distance(link) }))
    .filter((hit) => hit.distance <= tolerance)
    .sort((a, b) => a.distance - b.distance)
    .map((hit) => hit.id);
}
export function routeMark(link, era = "canal") {
  const points = routeBranches(link, era)[0],
    lengths = points
      .slice(1)
      .map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
  let remaining = lengths.reduce((a, b) => a + b, 0) / 2;
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i]) {
      const ratio = remaining / lengths[i];
      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * ratio,
        y: points[i].y + (points[i + 1].y - points[i].y) * ratio,
      };
    }
    remaining -= lengths[i];
  }
  return points[0];
}
