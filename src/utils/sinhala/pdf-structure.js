const BLOCK_ROLES = /^(?:P|H[1-6]?|LBody|Caption|TD|TH|BlockQuote|Note|Code)$/u;

// PDF structure identifies logical paragraphs, not their rendered line boxes.
// Untagged text keeps the geometry-based fallback used by the text grouper.
export function annotatePdfStructure(items, tree) {
  const contentIds = (node) =>
    node.type === "content"
      ? [node.id]
      : (node.children || []).flatMap(contentIds);
  const blocks = new Map();
  let containerIndex = 0;
  let tableIndex = 0;
  const tableRows = (node) =>
    (node.children || []).flatMap((child) =>
      child.role === "Table"
        ? []
        : child.role === "TR"
          ? [child]
          : tableRows(child),
    );
  const cells = (row) =>
    (row.children || []).filter((child) => /^(?:TD|TH)$/u.test(child.role));
  const visit = (
    node,
    block = null,
    textBoxId,
    figureId,
    table,
    row,
    tableCell,
  ) => {
    if (node.role === "Table") {
      const rows = tableRows(node);
      table = {
        id: `table:${tableIndex++}`,
        rows,
        columnCount: Math.max(0, ...rows.map((row) => cells(row).length)),
      };
      row = null;
      tableCell = null;
    }
    if (node.role === "TR" && table) row = node;
    if (/^(?:TD|TH)$/u.test(node.role) && table && row) {
      tableCell = {
        id: table.id,
        row: table.rows.indexOf(row),
        column: cells(row).indexOf(node),
        rowCount: table.rows.length,
        columnCount: table.columnCount,
        header: node.role === "TH",
      };
    }
    if (node.role === "Sect")
      textBoxId = `box:${contentIds(node)[0]}:${containerIndex++}`;
    if (node.role === "Figure") figureId = `figure:${contentIds(node)[0]}`;
    if (BLOCK_ROLES.test(node.role || "")) {
      const id = contentIds(node)[0];
      if (id)
        block = { paragraphId: `${node.role}:${id}`, structureRole: node.role };
    }
    if (node.type === "content" && block)
      blocks.set(node.id, { ...block, textBoxId, figureId, tableCell });
    for (const child of node.children || [])
      visit(child, block, textBoxId, figureId, table, row, tableCell);
  };
  if (tree) visit(tree);
  const stack = [];
  return items.map((item) => {
    if (
      item.type === "beginMarkedContent" ||
      item.type === "beginMarkedContentProps"
    ) {
      stack.push({
        ...stack.at(-1),
        ...blocks.get(item.id),
        artifact: item.tag === "Artifact" || Boolean(stack.at(-1)?.artifact),
      });
      return item;
    }
    if (item.type === "endMarkedContent") {
      stack.pop();
      return item;
    }
    return typeof item.str === "string" ? { ...item, ...stack.at(-1) } : item;
  });
}
