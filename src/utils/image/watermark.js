const DEFAULT_WATERMARK_SCALE = 0.05;
const MAX_GRAPHIC_ASPECT_RATIO = 3;

export function calculateWatermarkBaseSize(size, scale) {
  const normalizedScale = Number(scale);
  return Math.max(
    12,
    Math.max(1, Number(size?.width) || 1) *
      (normalizedScale > 0 ? normalizedScale : DEFAULT_WATERMARK_SCALE),
  );
}

export function calculateWatermarkGraphicSize(
  size,
  scale,
  sourceWidth,
  sourceHeight,
) {
  const baseHeight = calculateWatermarkBaseSize(size, scale);
  const width = Math.max(1, Number(sourceWidth) || 1);
  const height = Math.max(1, Number(sourceHeight) || 1);
  const aspectRatio = width / height;
  const graphicWidth =
    baseHeight * Math.min(MAX_GRAPHIC_ASPECT_RATIO, aspectRatio);
  return {
    width: graphicWidth,
    height:
      aspectRatio > MAX_GRAPHIC_ASPECT_RATIO
        ? graphicWidth / aspectRatio
        : baseHeight,
  };
}

export function drawImageWatermark(context, size, watermark, bitmap = null) {
  if (!watermark?.enabled) return;
  const isImage = watermark.kind === "image";
  const isImageText = watermark.kind === "image-text";
  const isPreRenderedText = Boolean(watermark.preRenderedText);
  if (isPreRenderedText && !bitmap) return;
  if ((isImage || isImageText) && !bitmap) return;

  context.save();
  context.globalAlpha = Math.max(
    0.05,
    Math.min(1, Number(watermark.opacity) || 0.45),
  );
  const shadowEnabled = Boolean(watermark.shadow);
  context.shadowColor = shadowEnabled ? "rgba(0,0,0,.45)" : "transparent";
  context.shadowBlur = shadowEnabled
    ? Math.max(1, calculateWatermarkBaseSize(size, watermark.scale) * 0.08)
    : 0;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
  let stampWidth;
  let stampHeight;
  let graphicWidth = 0;
  let graphicHeight = 0;
  let contentGap = 0;
  let fontSize = 0;
  let textOriginOffsetX = 0;
  let textOriginY = 0;
  if (isPreRenderedText) {
    stampWidth = Math.max(1, Number(watermark.stampWidth) || bitmap.width);
    stampHeight = Math.max(1, Number(watermark.stampHeight) || bitmap.height);
  } else if (isImage) {
    const graphicSize = calculateWatermarkGraphicSize(
      size,
      watermark.scale,
      bitmap.width,
      bitmap.height,
    );
    stampWidth = graphicSize.width;
    stampHeight = graphicSize.height;
  } else {
    fontSize = Math.round(calculateWatermarkBaseSize(size, watermark.scale));
    context.font = `600 ${fontSize}px sans-serif`;
    context.textBaseline = isImageText ? "alphabetic" : "top";
    context.fillStyle = watermark.color || "#ffffff";
    const metrics = context.measureText(watermark.text || "水印");
    stampWidth = Math.max(1, metrics.width);
    stampHeight = fontSize * 1.25;
    if (isImageText) {
      const textAscent = metrics.actualBoundingBoxAscent || fontSize * 0.8;
      const textDescent = metrics.actualBoundingBoxDescent || fontSize * 0.2;
      const textWidth = Math.max(
        1,
        (metrics.actualBoundingBoxLeft || 0) +
          (metrics.actualBoundingBoxRight || metrics.width),
      );
      stampHeight = textAscent + textDescent;
      const graphicSize = calculateWatermarkGraphicSize(
        size,
        watermark.scale,
        bitmap.width,
        bitmap.height,
      );
      graphicWidth = graphicSize.width;
      graphicHeight = graphicSize.height;
      stampHeight = Math.max(textHeight, graphicHeight);
      contentGap = Math.max(4, fontSize * 0.35);
      stampWidth = graphicWidth + contentGap + textWidth;
      textOriginOffsetX = metrics.actualBoundingBoxLeft || 0;
      textOriginY = (textAscent - textDescent) / 2;
    }
  }

  const drawStamp = (x, y) => {
    context.save();
    context.translate(x + stampWidth / 2, y + stampHeight / 2);
    context.rotate(((Number(watermark.rotation) || 0) * Math.PI) / 180);
    if (isPreRenderedText || isImage)
      context.drawImage(
        bitmap,
        -stampWidth / 2,
        -stampHeight / 2,
        stampWidth,
        stampHeight,
      );
    else {
      if (isImageText)
        context.drawImage(
          bitmap,
          -stampWidth / 2,
          -graphicHeight / 2,
          graphicWidth,
          graphicHeight,
        );
      context.fillText(
        watermark.text || "水印",
        -stampWidth / 2 +
          (isImageText ? graphicWidth + contentGap + textOriginOffsetX : 0),
        isImageText ? textOriginY : -stampHeight / 2,
      );
    }
    context.restore();
  };

  if (watermark.mode === "tile") {
    const gap = Math.max(8, Number(watermark.gap) || 48);
    const stepX = stampWidth + gap;
    const stepY = stampHeight + gap;
    const offsetX =
      (((Number(watermark.offsetX) || 0) % stepX) + stepX) % stepX;
    const offsetY =
      (((Number(watermark.offsetY) || 0) % stepY) + stepY) % stepY;
    for (
      let y = -stampHeight + offsetY;
      y < size.height + stampHeight;
      y += stepY
    ) {
      for (
        let x = -stampWidth + offsetX;
        x < size.width + stampWidth;
        x += stepX
      )
        drawStamp(x, y);
    }
  } else {
    const margin = Math.max(0, Number(watermark.margin) || 24);
    const [vertical, horizontal] = String(
      watermark.position || "bottom-right",
    ).split("-");
    const x =
      horizontal === "left"
        ? margin
        : horizontal === "center"
          ? (size.width - stampWidth) / 2
          : size.width - stampWidth - margin;
    const y =
      vertical === "top"
        ? margin
        : vertical === "center"
          ? (size.height - stampHeight) / 2
          : size.height - stampHeight - margin;
    drawStamp(
      x + (Number(watermark.offsetX) || 0),
      y + (Number(watermark.offsetY) || 0),
    );
  }
  context.restore();
}
