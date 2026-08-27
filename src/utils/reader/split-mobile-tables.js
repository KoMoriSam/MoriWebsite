const originalTableMarkup = new WeakMap();
let tableSequence = 0;

const getRect = (element) => element?.getBoundingClientRect();
const getFirstRect = (element) =>
  element?.getClientRects()?.[0] || getRect(element);
const getVisibleFragmentRect = (element) =>
  Array.from(element?.getClientRects?.() || []).find(
    (rect) => rect.width > 0 && rect.height > 0,
  ) || getRect(element);
const getVisibleFragmentHeight = (element) => {
  const rect = getVisibleFragmentRect(element);
  return rect?.width > 0 && rect?.height > 0 ? rect.height : 0;
};

const getGridAdjustment = (height, lineHeight) => {
  const remainder = ((height % lineHeight) + lineHeight) % lineHeight;
  return remainder < 0.5 || lineHeight - remainder < 0.5
    ? 0
    : lineHeight - remainder;
};

const createColumnWidths = (table) => {
  const rows = Array.from(table.rows || []);
  const columnCount = rows.reduce(
    (maximum, row) =>
      Math.max(
        maximum,
        Array.from(row.cells).reduce(
          (count, cell) => count + Math.max(1, cell.colSpan || 1),
          0,
        ),
      ),
    0,
  );
  const widths = Array(columnCount).fill(0);
  rows.forEach((row) => {
    let column = 0;
    Array.from(row.cells).forEach((cell) => {
      const span = Math.max(1, cell.colSpan || 1);
      // 表头在多栏中可能被浏览器重复渲染；bounding rect 会覆盖多个栏位，
      // 这里只读取一个可见分片，避免列宽被重复表头的联合包围盒放大。
      const width = (getVisibleFragmentRect(cell)?.width || 0) / span;
      for (let index = 0; index < span; index += 1) {
        widths[column + index] = Math.max(widths[column + index] || 0, width);
      }
      column += span;
    });
  });
  return widths;
};

const applyColumnWidths = (table, widths) => {
  if (!widths.length || table.querySelector(":scope > colgroup")) return;
  const colgroup = document.createElement("colgroup");
  colgroup.dataset.mobileTableColumns = "";
  widths.forEach((width) => {
    const column = document.createElement("col");
    if (width > 0) column.style.width = `${width}px`;
    colgroup.appendChild(column);
  });
  table.insertBefore(
    colgroup,
    table.querySelector(":scope > thead, :scope > tbody"),
  );
};

const createTableFragment = ({
  sourceWrapper,
  sourceTable,
  entries,
  columnWidths,
  sourceToken,
  continuation,
  final,
}) => {
  const wrapper = sourceWrapper.cloneNode(false);
  delete wrapper.dataset.mobileTableSource;
  wrapper.classList.remove("mobile-table-measuring");
  wrapper.classList.add("mobile-table-fragment");
  wrapper.classList.toggle("mobile-table-continuation", continuation);
  wrapper.dataset.mobileTableFragment = sourceToken;

  const table = sourceTable.cloneNode(false);
  Array.from(sourceTable.children).forEach((child) => {
    if (!child.matches("tbody, tfoot"))
      table.appendChild(child.cloneNode(true));
  });
  const groupedRows = new Map();
  entries.forEach(({ body, row }) => {
    if (!groupedRows.has(body)) groupedRows.set(body, []);
    groupedRows.get(body).push(row);
  });
  groupedRows.forEach((rows, body) => {
    const clonedBody = body.cloneNode(false);
    rows.forEach((row) => clonedBody.appendChild(row.cloneNode(true)));
    table.appendChild(clonedBody);
  });
  if (final) {
    sourceTable
      .querySelectorAll(":scope > tfoot")
      .forEach((footer) => table.appendChild(footer.cloneNode(true)));
  }
  applyColumnWidths(table, columnWidths);
  if (continuation) {
    table.removeAttribute("id");
    table
      .querySelectorAll("[id]")
      .forEach((element) => element.removeAttribute("id"));
  }
  wrapper.appendChild(table);
  return wrapper;
};

const groupRowsByAvailableHeight = ({
  entries,
  firstHeight,
  fullHeight,
  baseFixedHeight,
  footerHeight,
  safetyGap = 0,
}) => {
  const groups = [];
  let available = firstHeight;
  let current = [];
  let used = 0;

  entries.forEach((entry, index) => {
    const rowHeight = Math.max(1, entry.height);
    const isFinalRow = index === entries.length - 1;
    const nextHeight =
      baseFixedHeight + used + rowHeight + (isFinalRow ? footerHeight : 0);
    // 先按实际内容高度尽可能装行。基线补白若放不下，应舍弃补白，不能
    // 为了不足一行的 padding 把完整表格行赶到下一页。
    // 使用安全余量（safetyGap）使分组保守一点，避免由于边距或测量误差
    // 导致生成的首片不能放入页面而被浏览器整体移到下一页。
    if (current.length && nextHeight > available - safetyGap + 0.5) {
      groups.push(current);
      current = [];
      used = 0;
      available = fullHeight;
    }
    current.push(entry);
    used += rowHeight;
  });
  if (current.length) groups.push(current);
  return groups;
};

export const restoreMobileTables = (article) => {
  if (!article) return;
  article.querySelectorAll(".mobile-table-flow-marker").forEach((marker) => {
    marker.remove();
  });
  article
    .querySelectorAll(".markdown-table-wrapper[data-mobile-table-source]")
    .forEach((source) => {
      const sourceToken = source.dataset.mobileTableSource;
      article
        .querySelectorAll(
          `.mobile-table-fragment[data-mobile-table-fragment="${sourceToken}"]`,
        )
        .forEach((fragment) => {
          if (fragment !== source) fragment.remove();
        });
      const originalMarkup = originalTableMarkup.get(source);
      if (originalMarkup != null) source.innerHTML = originalMarkup;
      source.classList.remove(
        "mobile-table-fragment",
        "mobile-table-continuation",
        "mobile-table-force-next-page",
        "mobile-table-measuring",
      );
      source.style.removeProperty("--reader-table-grid-adjust");
      delete source.dataset.mobileTableSource;
      delete source.dataset.mobileTableFragment;
      originalTableMarkup.delete(source);
    });
};

export const prepareMobileTables = (article) => {
  restoreMobileTables(article);
  article
    ?.querySelectorAll(
      ":scope > .markdown-table-wrapper:not([aria-hidden='true'])",
    )
    .forEach((wrapper) => {
      const marker = document.createElement("span");
      marker.className = "mobile-table-flow-marker";
      marker.setAttribute("aria-hidden", "true");
      wrapper.before(marker);
      wrapper.classList.add("mobile-table-measuring");
    });
};

export const splitMobileTables = ({
  article,
  viewport,
  pageHeight,
  pageVerticalPadding,
  lineHeight,
  isCurrent,
}) => {
  const wrappers = Array.from(
    article.querySelectorAll(
      ":scope > .markdown-table-wrapper:not([aria-hidden='true'])",
    ),
  );
  if (!wrappers.length) return true;
  if (!isCurrent()) return false;

  const viewportTop = getRect(viewport).top;
  const fullBodyHeight = Math.max(1, pageHeight - pageVerticalPadding * 2);
  const plans = [];

  wrappers.forEach((sourceWrapper) => {
    const sourceTable = sourceWrapper.querySelector(":scope > table");
    if (!sourceTable) return;
    const entries = Array.from(sourceTable.tBodies).flatMap((body) =>
      Array.from(body.rows).map((row) => ({
        body,
        row,
        height: getVisibleFragmentHeight(row),
      })),
    );
    if (entries.length < 2 || entries.some((entry) => entry.height <= 0))
      return;

    const tableStyle = window.getComputedStyle(sourceTable);
    const wrapperStyle = window.getComputedStyle(sourceWrapper);
    const wrapperFlowGap =
      (Number.parseFloat(wrapperStyle.marginBlockStart) || 0) +
      (Number.parseFloat(wrapperStyle.marginBlockEnd) || 0);
    const baseFixedHeight = Math.max(
      0,
      getVisibleFragmentHeight(sourceTable.tHead) +
        Array.from(sourceTable.querySelectorAll(":scope > caption")).reduce(
          (total, caption) => total + getVisibleFragmentHeight(caption),
          0,
        ) +
        (Number.parseFloat(tableStyle.marginBlockStart) || 0) +
        (Number.parseFloat(tableStyle.marginBlockEnd) || 0) +
        (Number.parseFloat(tableStyle.borderBlockStartWidth) || 0) +
        (Number.parseFloat(tableStyle.borderBlockEndWidth) || 0),
    );
    const footerHeight = getVisibleFragmentHeight(sourceTable.tFoot);
    const flowMarker = sourceWrapper.previousElementSibling?.classList.contains(
      "mobile-table-flow-marker",
    )
      ? sourceWrapper.previousElementSibling
      : null;
    const wrapperTop = getFirstRect(flowMarker || sourceWrapper).top;
    const firstAvailableHeight = Math.max(
      0,
      viewportTop +
        pageHeight -
        pageVerticalPadding -
        wrapperTop -
        wrapperFlowGap,
    );
    const minimumHeight =
      baseFixedHeight +
      entries[0].height +
      (entries.length === 1 ? footerHeight : 0);
    // 放宽强制整表下一页的判定：仅在首条内容连同表头都无法放下时才强制。
    // 之前会因为基线补白或边距导致频繁把表格整体推到下一页，造成前页空白。
    const cannotFitFirstRowAlone =
      firstAvailableHeight + 0.5 < entries[0].height;
    const forceNextPage =
      cannotFitFirstRowAlone && firstAvailableHeight <= fullBodyHeight;
    if (forceNextPage) {
      // 调试日志，观察何时触发强制下一页
      console.debug("splitMobileTables: forceNextPage", {
        firstAvailableHeight,
        minimumHeight,
        firstRowHeight: entries[0].height,
        baseFixedHeight,
        footerHeight,
      });
    }
    const safetyGap = Math.min(6, Math.max(1, Math.round(lineHeight * 0.08)));
    const groups = groupRowsByAvailableHeight({
      entries,
      firstHeight: forceNextPage ? fullBodyHeight : firstAvailableHeight,
      fullHeight: fullBodyHeight,
      baseFixedHeight,
      footerHeight,
      safetyGap,
    });
    if (groups.length <= 1 && !forceNextPage) return;
    plans.push({
      sourceWrapper,
      sourceTable,
      entries,
      groups,
      baseFixedHeight,
      footerHeight,
      columnWidths: createColumnWidths(sourceTable),
      firstAvailableHeight,
      sourceToken: `mobile-table-${(tableSequence += 1)}`,
      forceNextPage,
    });
  });

  // 所有表格分片在同一次写入中完成，不再逐表等待浏览器重排。
  plans.forEach(
    ({
      sourceWrapper,
      sourceTable,
      groups,
      baseFixedHeight,
      footerHeight,
      columnWidths,
      firstAvailableHeight,
      sourceToken,
      forceNextPage,
    }) => {
      originalTableMarkup.set(sourceWrapper, sourceWrapper.innerHTML);
      const fragments = groups.map((group, index) =>
        createTableFragment({
          sourceWrapper,
          sourceTable,
          entries: group,
          columnWidths,
          sourceToken,
          continuation: index > 0,
          final: index === groups.length - 1,
        }),
      );
      fragments.forEach((fragment, index) => {
        const rowsHeight = groups[index].reduce(
          (total, entry) => total + entry.height,
          0,
        );
        const fragmentHeight =
          baseFixedHeight +
          rowsHeight +
          (index === groups.length - 1 ? footerHeight : 0);
        const availableHeight =
          index === 0 && !forceNextPage ? firstAvailableHeight : fullBodyHeight;
        const gridAdjustment = getGridAdjustment(fragmentHeight, lineHeight);
        if (fragmentHeight > availableHeight + 0.5) {
          console.debug(
            "splitMobileTables: fragment exceeds available height",
            {
              sourceToken,
              index,
              fragmentHeight,
              availableHeight,
              baseFixedHeight,
              footerHeight,
              rowsHeight,
            },
          );
        }
        fragment.style.setProperty(
          "--reader-table-grid-adjust",
          `${fragmentHeight + gridAdjustment <= availableHeight + 0.5 ? gridAdjustment : 0}px`,
        );
      });

      const firstFragment = fragments.shift();
      sourceWrapper.replaceChildren(...Array.from(firstFragment.childNodes));
      sourceWrapper.className = firstFragment.className;
      sourceWrapper.style.cssText = firstFragment.style.cssText;
      sourceWrapper.dataset.mobileTableSource = sourceToken;
      sourceWrapper.dataset.mobileTableFragment = sourceToken;
      sourceWrapper.classList.toggle(
        "mobile-table-force-next-page",
        forceNextPage,
      );
      let insertionPoint = sourceWrapper;
      fragments.forEach((fragment) => {
        insertionPoint.after(fragment);
        insertionPoint = fragment;
      });
    },
  );
  article.querySelectorAll(".mobile-table-flow-marker").forEach((marker) => {
    marker.remove();
  });
  wrappers.forEach((wrapper) =>
    wrapper.classList.remove("mobile-table-measuring"),
  );
  return isCurrent();
};
