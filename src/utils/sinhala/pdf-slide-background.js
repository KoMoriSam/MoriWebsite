// Only the first full-page paint can become a slide background. Later artwork
// can cover earlier objects and must retain its foreground stacking order.
export function pdfSlideBackground(page) {
  const layer = page.artworkLayers?.[0];
  if (
    !layer ||
    ![layer.x, layer.y, layer.width, layer.height].every(Number.isFinite) ||
    layer.x > 0.5 ||
    layer.y > 0.5 ||
    layer.x + layer.width < page.width - 0.5 ||
    layer.y + layer.height < page.height - 0.5
  )
    return null;
  if (
    page.paragraphs.some((paragraph) =>
      paragraph.lines.some((line) => line.paintOrder < layer.paintOrder),
    )
  )
    return null;
  if (
    layer.kind === "shape" &&
    (layer.preset !== "rect" || !layer.fill || layer.stroke)
  )
    return null;
  if (layer.kind !== "shape" && !layer.data) return null;
  return { index: 0, layer };
}
