const encodeProps = (value) => encodeURIComponent(JSON.stringify(value));

export const renderMermaidSource = async (
  id,
  source,
  { fontFamily, fontSize, maxWidth, autoDirection = false, directionBreakpoint } = {},
) => {
  const { renderAsync } = await import("pele/lazy");
  return renderAsync(source, {
    idPrefix: id,
    fontFamily,
    fontFamilyMono: fontFamily,
    fontSize,
    maxWidth,
    autoDirection,
    directionBreakpoint,
    links: false,
    images: false,
  });
};

const applyMermaidCorners = (svg, viewerStyle) => {
  const cornerShape = viewerStyle.getPropertyValue("--corner-shape").trim();
  const shape = /^superellipse\((\d+(?:\.\d+)?)\)$/u.exec(cornerShape);
  if (!shape) return;

  const rectangles = [...svg.querySelectorAll("rect[style]")].filter(
    (rect) => rect.style.getPropertyValue("rx") === "var(--_r)",
  );
  if (!rectangles.length) return;
  const radius = Number.parseFloat(getComputedStyle(rectangles[0]).getPropertyValue("rx"));
  if (!(radius > 0)) return;

  // 以相同的对角中点和端点切线拟合 CSS superellipse。
  const midpoint = 0.5 ** (1 / 2 ** Number(shape[1]));
  const controlRatio = (8 * midpoint - 4) / 3;

  for (const rect of rectangles) {
    const left = Number(rect.getAttribute("x"));
    const top = Number(rect.getAttribute("y"));
    const width = Number(rect.getAttribute("width"));
    const height = Number(rect.getAttribute("height"));
    const right = left + width;
    const bottom = top + height;
    const r = Math.min(radius, width / 2, height / 2);
    const control = r * controlRatio;
    const offset = r - control;
    const path = svg.ownerDocument.createElementNS(svg.namespaceURI, "path");
    for (const { name, value } of rect.attributes) {
      if (!["x", "y", "width", "height"].includes(name)) path.setAttribute(name, value);
    }
    path.style.removeProperty("rx");
    path.setAttribute("d", [
      `M ${left + r} ${top} H ${right - r}`,
      `c ${control} 0 ${r} ${offset} ${r} ${r} V ${bottom - r}`,
      `c 0 ${control} ${-offset} ${r} ${-r} ${r} H ${left + r}`,
      `c ${-control} 0 ${-r} ${-offset} ${-r} ${-r} V ${top + r}`,
      `c 0 ${-control} ${offset} ${-r} ${r} ${-r} Z`,
    ].join(" "));
    rect.replaceWith(path);
  }
};

export const styleMermaidSvg = (svg, viewerStyle) => {
  applyMermaidCorners(svg, viewerStyle);
  for (const label of svg.querySelectorAll(".pele-slice-labels > text")) {
    label.style.setProperty("stroke", "var(--pele-fg)");
    label.style.setProperty("stroke-width", "2px");
    label.style.setProperty("stroke-linejoin", "round");
    label.style.setProperty("paint-order", "stroke");
  }
};

export function mermaidPlugin(md) {
  const defaultFenceRenderer = md.renderer.rules.fence;

  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    if (token.info.trim() !== "mermaid") {
      return defaultFenceRenderer(tokens, idx, options, env, self);
    }

    const props = encodeProps({ source: token.content.trim() });
    return `<markdown-mermaid data-markdown-props="${props}"></markdown-mermaid>\n`;
  };
}
