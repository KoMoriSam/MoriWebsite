import { joinPdfText } from "./pdf-text.js";

function borders(page) {
  const lines = [];
  const add = (axis, at, start, end) => lines.push({ axis, at, start, end });
  for (const shape of page.artworkLayers || []) {
    if (shape.kind !== "shape" || shape.preset !== "rect") continue;
    const { x, y, width, height } = shape;
    if (width <= 2 && height > 2) add("x", x + width / 2, y, y + height);
    else if (height <= 2 && width > 2) add("y", y + height / 2, x, x + width);
    else if (shape.stroke && !shape.fill) {
      add("x", x, y, y + height);
      add("x", x + width, y, y + height);
      add("y", y, x, x + width);
      add("y", y + height, x, x + width);
    }
  }
  const merged = [];
  for (const line of lines.sort(
    (a, b) => a.axis.localeCompare(b.axis) || a.at - b.at || a.start - b.start,
  )) {
    const previous = merged.findLast(
      (other) =>
        other.axis === line.axis &&
        Math.abs(other.at - line.at) <= 1 &&
        line.start <= other.end + 2 &&
        line.end >= other.start - 2,
    );
    if (previous) {
      previous.start = Math.min(previous.start, line.start);
      previous.end = Math.max(previous.end, line.end);
    } else merged.push({ ...line });
  }
  return merged;
}

function textBounds(paragraphs) {
  const bounds = paragraphs.flatMap((paragraph) =>
    paragraph.lines.flatMap((line) =>
      line.spans
        .filter((span) => span.text.trim() && span.bounds)
        .map((span) => span.bounds),
    ),
  );
  if (!bounds.length) return null;
  const x = Math.min(...bounds.map((box) => box.x));
  const y = Math.min(...bounds.map((box) => box.y));
  return {
    x,
    y,
    right: Math.max(...bounds.map((box) => box.x + box.width)),
    bottom: Math.max(...bounds.map((box) => box.y + box.height)),
  };
}

function nativeTable(paragraphs, lines) {
  const content = textBounds(paragraphs);
  if (!content) return null;
  const meta = paragraphs[0].tableCell;
  if (!meta.columnCount) return null;
  const vertical = lines.filter(
    (line) =>
      line.axis === "x" &&
      line.end > content.y + 2 &&
      line.start < content.bottom - 2,
  );
  const columns = Array.from({ length: meta.columnCount }, (_, column) => {
    const cell = textBounds(
      paragraphs.filter((paragraph) => paragraph.tableCell.column === column),
    );
    if (!cell) return null;
    return (
      vertical
        .filter((line) => line.at <= cell.x + 1 && line.at >= cell.x - 32)
        .sort((a, b) => b.at - a.at)[0]?.at ?? cell.x - 5.4
    );
  });
  // A continued row may have an empty first cell on this PDF page.
  for (let column = 0; column < columns.length; column++) {
    if (columns[column] !== null) continue;
    const next = columns
      .slice(column + 1)
      .find((position) => position !== null);
    const candidates = vertical
      .filter((line) => next === undefined || line.at < next - 2)
      .sort((a, b) => a.at - b.at);
    columns[column] = candidates[column]?.at ?? content.x - 5.4;
  }
  const right =
    vertical
      .filter((line) => line.at >= content.right - 1)
      .sort((a, b) => a.at - b.at)[0]?.at ?? content.right + 5.4;
  if (
    columns.some(
      (position, index) => index && position <= columns[index - 1],
    ) ||
    right <= columns.at(-1)
  )
    return null;
  columns.push(right);
  const horizontal = lines.filter(
    (line) =>
      line.axis === "y" &&
      line.start <= columns[0] + 2 &&
      line.end >= right - 2,
  );
  const y =
    horizontal
      .filter((line) => line.at <= content.y + 2 && line.at >= content.y - 48)
      .sort((a, b) => b.at - a.at)[0]?.at ?? content.y - 2;
  const bottom =
    horizontal
      .filter(
        (line) =>
          line.at >= content.bottom - 2 && line.at <= content.bottom + 48,
      )
      .sort((a, b) => a.at - b.at)[0]?.at ?? content.bottom + 4;
  const visible = paragraphs.map((paragraph) => paragraph.tableCell.row);
  const first = Math.min(...visible);
  const indexes = Array.from(
    { length: Math.max(...visible) - first + 1 },
    (_, offset) => first + offset,
  );
  const boundaries = horizontal
    .filter((line) => line.at >= y - 1 && line.at <= bottom + 1)
    .map((line) => line.at)
    .sort((a, b) => a - b);
  const rows = indexes.map((index, offset) => ({
    index,
    y:
      boundaries.length === indexes.length + 1 ? boundaries[offset] : undefined,
    height:
      boundaries.length === indexes.length + 1
        ? boundaries[offset + 1] - boundaries[offset]
        : undefined,
    cells: Array.from({ length: meta.columnCount }, (_, column) => {
      const items = paragraphs
        .filter(
          (paragraph) =>
            paragraph.tableCell.row === index &&
            paragraph.tableCell.column === column,
        )
        .sort((a, b) => a.y - b.y || a.x - b.x);
      return {
        paragraphs: items,
        header: items.some((paragraph) => paragraph.tableCell.header),
      };
    }),
  }));
  return {
    id: meta.id,
    x: columns[0],
    y,
    width: right - columns[0],
    height: bottom - y,
    columns,
    rows,
    rowStart: indexes[0],
    rowEnd: indexes.at(-1),
    rowCount: meta.rowCount,
  };
}

const intersects = (a, b) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;

// Use native PDF table/cell ownership before attempting geometric grouping.
// Only visible rows are emitted; structure trees also contain empty stubs for
// rows whose content is on another page of a continued table.
export function pdfDocumentContent(page) {
  const groups = new Map();
  for (const paragraph of page.paragraphs) {
    if (!paragraph.tableCell) continue;
    const id = paragraph.tableCell.id;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(paragraph);
  }
  const lines = groups.size ? borders(page) : [];
  const tables = [...groups.values()]
    .map((paragraphs) => nativeTable(paragraphs, lines))
    .filter(Boolean);
  const accepted = new Set(tables.map((table) => table.id));
  const graphics = (page.graphics || []).filter(
    (graphic) =>
      !tables.some(
        (table) =>
          graphic.x >= table.x - 2 &&
          graphic.y >= table.y - 2 &&
          graphic.x + graphic.width <= table.x + table.width + 2 &&
          graphic.y + graphic.height <= table.y + table.height + 2 &&
          !(page.artworkLayers || []).some(
            (layer) => layer.kind === "image" && intersects(layer, graphic),
          ),
      ),
  );
  return {
    tables,
    graphics,
    paragraphs: page.paragraphs.filter(
      (paragraph) => !accepted.has(paragraph.tableCell?.id),
    ),
  };
}

export function continuesPdfTable(previous, current) {
  const last = previous.rows.at(-1);
  const first = current.rows[0];
  const sharedParagraph = last.cells.some((cell, column) =>
    cell.paragraphs.some(
      (paragraph) =>
        paragraph.structureId &&
        first.cells[column]?.paragraphs.some(
          (next) => next.structureId === paragraph.structureId,
        ),
    ),
  );
  const sameRow =
    previous.rowEnd === current.rowStart &&
    (previous.rowEnd > 0 ||
      previous.rowEnd < previous.rowCount - 1 ||
      sharedParagraph);
  return (
    (sameRow || previous.rowEnd + 1 === current.rowStart) &&
    previous.rowCount === current.rowCount &&
    previous.columns.length === current.columns.length &&
    previous.columns.every(
      (position, index) => Math.abs(position - current.columns[index]) < 3,
    )
  );
}

function continuesRow(previous, current) {
  if (previous.index === current.index) return true;
  const firstContent = current.cells.findIndex(
    (cell) => cell.paragraphs.length,
  );
  // Office PDFs sometimes tag a page fragment as another TR. A blank label
  // column followed by more description continues the preceding labelled row.
  return (
    firstContent > 0 &&
    previous.cells
      .slice(0, firstContent)
      .some((cell) => cell.paragraphs.length) &&
    current.cells.every(
      (cell, column) =>
        !cell.paragraphs.length || previous.cells[column].paragraphs.length,
    )
  );
}

export function mergePdfTables(previous, current) {
  const rows = previous.rows.slice();
  const last = rows.at(-1);
  const first = current.rows[0];
  const continued = continuesRow(last, first);
  if (continued) {
    const offset = (last.y ?? 0) + (last.height ?? 0) - (first.y ?? 0);
    const cells = last.cells.map((cell, column) => {
      const paragraphs = cell.paragraphs.slice();
      for (const [index, paragraph] of first.cells[
        column
      ].paragraphs.entries()) {
        const preceding = paragraphs.at(-1);
        if (
          preceding?.structureId &&
          preceding.structureId === paragraph.structureId
        ) {
          paragraphs[paragraphs.length - 1] = {
            ...preceding,
            lines: [...preceding.lines, ...paragraph.lines],
            text: joinPdfText(preceding.text, paragraph.text),
            leading: Math.max(preceding.leading, paragraph.leading),
            height: paragraph.y + offset + paragraph.height - preceding.y,
          };
        } else
          paragraphs.push({
            ...paragraph,
            y: paragraph.y + offset,
            keepLines: index === 0,
          });
      }
      return { ...cell, paragraphs };
    });
    rows[rows.length - 1] = {
      ...last,
      cells,
      crossesPage: true,
      height:
        last.height && first.height ? last.height + first.height : undefined,
    };
  }
  rows.push(
    ...current.rows
      .slice(continued ? 1 : 0)
      .map((row, index) => ({ ...row, startsPage: !continued && index === 0 })),
  );
  return { ...previous, rows, rowEnd: current.rowEnd };
}
