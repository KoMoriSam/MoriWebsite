import { extractPdfParagraphs, pdfTextSize } from "./pdf-text.js";
import { annotatePdfStructure } from "./pdf-structure.js";
import { rememberPdfPath, pdfVectorShapes } from "./pdf-vector-shapes.js";
import { repairPdfUnicodeText } from "./pdf-unicode-text.js";

const TEXT_OPERATIONS = [
  "showText",
  "showSpacedText",
  "nextLineShowText",
  "nextLineSetSpacingShowText",
];
const GRAPHIC_OPERATIONS = [
  "constructPath",
  "stroke",
  "closeStroke",
  "fill",
  "eoFill",
  "fillStroke",
  "eoFillStroke",
  "closeFillStroke",
  "closeEOFillStroke",
  "shadingFill",
];

function fontFamily(name) {
  const family = name.replace(/^[A-Z]{6}\+/u, "");
  if (/^(?:Times(?:-|NewRoman)|serif$)/iu.test(family))
    return "Times New Roman";
  if (/^(?:Helvetica|Arial|sans-serif$)/iu.test(family)) return "Arial";
  if (/^(?:Courier|monospace$)/iu.test(family)) return "Courier New";
  if (/^Wingdings[23]$/iu.test(family))
    return family.replace(/([23])$/u, " $1");
  return (
    family.replace(/[-,](?:Bold|Italic|Oblique|Regular).*$/iu, "") ||
    "Times New Roman"
  );
}

async function pageFonts(page, content, operators, OPS) {
  const dependencies = new Set(
    operators.fnArray.flatMap((operation, index) =>
      operation === OPS.dependency ? operators.argsArray[index] : [],
    ),
  );
  const fonts = {};
  for (const [id, style] of Object.entries(content.styles)) {
    let font;
    if (dependencies.has(id)) {
      font = await new Promise((resolve) => page.commonObjs.get(id, resolve));
    }
    const name = font?.name || style.fontFamily || "Times New Roman";
    fonts[id] = {
      family: fontFamily(name),
      bold: Boolean(font?.bold || /bold|black|fmababld/iu.test(name)),
      italic: Boolean(font?.italic || /italic|oblique/iu.test(name)),
      ascent: Number.isFinite(style.ascent) ? style.ascent : 0.8,
      descent: Number.isFinite(style.descent) ? style.descent : -0.2,
    };
  }
  return fonts;
}

function itemColors(items, operators, OPS) {
  const normalize = (text) => text.normalize("NFKC").replace(/\s/gu, "");
  const textOperations = new Set(TEXT_OPERATIONS.map((name) => OPS[name]));
  const stack = [];
  const colors = [];
  const orders = [];
  const weights = [];
  const advances = [];
  let text = "";
  let state = { fill: "000000", mode: 0, lineWidth: 1 };
  for (let index = 0; index < operators.fnArray.length; index++) {
    const operation = operators.fnArray[index];
    const args = operators.argsArray[index];
    if (operation === OPS.save) stack.push({ ...state });
    else if (operation === OPS.restore)
      state = stack.pop() || { fill: "000000", mode: 0, lineWidth: 1 };
    else if (operation === OPS.setTextRenderingMode) state.mode = args[0];
    else if (operation === OPS.setLineWidth) state.lineWidth = args[0];
    else if (
      operation === OPS.setFillRGBColor &&
      /^#[\da-f]{6}$/iu.test(args[0])
    ) {
      state.fill = args[0].slice(1).toUpperCase();
    } else if (textOperations.has(operation)) {
      const glyphs = args.find(Array.isArray) || [];
      for (const glyph of glyphs) {
        const length = normalize(glyph?.unicode || "").length;
        for (let character = 0; character < length; character++)
          advances.push((glyph.width || 500) / length);
      }
      const value = normalize(
        glyphs.map((glyph) => glyph?.unicode || "").join(""),
      );
      text += value;
      for (let character = 0; character < value.length; character++) {
        colors.push(state.fill);
        // Office can synthesize bold by stroking a regular font's glyphs.
        weights.push((state.mode & 3) === 2 && state.lineWidth > 0);
      }
      for (let character = 0; character < value.length; character++)
        orders.push(index);
    }
  }
  let cursor = 0;
  return items.map((item) => {
    if (!item.str?.trim()) return { color: "000000" };
    const value = normalize(item.str);
    const offset = text.indexOf(value, cursor);
    if (offset < 0) return { color: "000000" };
    cursor = offset + value.length;
    // PDF.js may combine several paint operations into one text item even
    // when Office changes synthetic bold or ink partway through the item.
    const inlineStyles = [];
    let position = offset;
    for (const character of item.str) {
      const length = normalize(character).length;
      const at = Math.min(position, cursor - 1);
      const color = colors[at] || "000000";
      const bold = weights[at];
      const advance = length
        ? advances
            .slice(position, position + length)
            .reduce((sum, width) => sum + width, 0)
        : 250;
      const previous = inlineStyles.at(-1);
      if (previous && previous.bold === bold && previous.color === color) {
        previous.text += character;
        previous.advance += advance;
      } else inlineStyles.push({ text: character, bold, color, advance });
      position += length;
    }
    return {
      color: colors[offset] || "000000",
      bold: weights[offset],
      inlineStyles,
      paintOrder: orders[offset],
    };
  });
}

async function textShadows(page, content, operators, pdfjs) {
  const { OPS, ImageKind, Util } = pdfjs;
  const colors = itemColors(content.items, operators, OPS);
  const textItems = content.items.flatMap((item, itemIndex) =>
    item.str?.trim()
      ? [
          {
            item,
            itemIndex,
            size: pdfTextSize(item.transform),
            order: colors[itemIndex].paintOrder ?? -1,
          },
        ]
      : [],
  );
  const shadows = new Map();
  const images = new Set();
  const refs = new Set();
  const stack = [];
  const pixels = new Map();
  let matrix = [1, 0, 0, 1, 0, 0];
  for (let index = 0; index < operators.fnArray.length; index++) {
    const operation = operators.fnArray[index];
    const args = operators.argsArray[index];
    if (operation === OPS.save) stack.push(matrix);
    else if (operation === OPS.restore)
      matrix = stack.pop() || [1, 0, 0, 1, 0, 0];
    else if (operation === OPS.transform) matrix = Util.transform(matrix, args);
    else if (operation === OPS.paintImageXObject) {
      const id = args[0];
      // Office exports text shadows as translucent black images immediately
      // before the editable glyphs. Require both matching geometry and pixels
      // so photographs, opaque banners and decorative shapes remain artwork.
      const [a, b, c, d, x, y] = matrix;
      if (Math.abs(b) > 0.01 || Math.abs(c) > 0.01 || a <= 0 || d <= 0)
        continue;
      const candidate = textItems
        .filter(
          ({ item, size, order }) =>
            Math.abs(order - index) < 100 &&
            x >= item.transform[4] - size * 1.3 &&
            x + a <= item.transform[4] + item.width + size * 1.3 &&
            x < item.transform[4] + item.width &&
            x + a > item.transform[4] &&
            item.transform[5] >= y &&
            item.transform[5] <= y + d &&
            d <= size * 3.5,
        )
        .sort(
          (left, right) =>
            Number(left.order <= index) - Number(right.order <= index) ||
            Math.abs(left.order - index) - Math.abs(right.order - index),
        )[0];
      if (!candidate) continue;
      const { itemIndex, size } = candidate;
      if (!pixels.has(id)) {
        const objects = id.startsWith("g_") ? page.commonObjs : page.objs;
        const image = await new Promise((resolve) => objects.get(id, resolve));
        let data = image?.kind === ImageKind.RGBA_32BPP ? image.data : null;
        if (!data && image?.bitmap) {
          const canvas = document.createElement("canvas");
          canvas.width = image.width;
          canvas.height = image.height;
          try {
            const context = canvas.getContext("2d");
            context.drawImage(image.bitmap, 0, 0);
            data = context.getImageData(0, 0, canvas.width, canvas.height).data;
          } finally {
            canvas.width = canvas.height = 0;
          }
        }
        let alpha = 0;
        let transparent = false;
        let valid = Boolean(data?.length);
        for (let offset = 0; valid && offset < data.length; offset += 4) {
          const opacity = data[offset + 3];
          transparent ||= opacity === 0;
          alpha = Math.max(alpha, opacity);
          valid =
            opacity <= 180 &&
            (!opacity ||
              Math.max(data[offset], data[offset + 1], data[offset + 2]) <= 4);
        }
        pixels.set(id, valid && transparent && alpha > 12 ? alpha / 255 : null);
        if (pixels.get(id) && image.ref) refs.add(image.ref);
      }
      const opacity = pixels.get(id);
      if (!opacity) continue;
      images.add(id);
      shadows.set(itemIndex, {
        opacity,
        blur: Math.min(6, size * 0.125),
        distance: Math.min(3, size * 0.08),
      });
    }
  }
  return { images, refs, shadows };
}

function imageInstances(operation, args, OPS) {
  // PDF.js may batch several placements of an image into one paint operation.
  // Split its placement list as well, without changing the shared image data.
  const position =
    operation === OPS.paintImageXObjectRepeat
      ? 3
      : operation === OPS.paintImageMaskXObjectRepeat
        ? 5
        : -1;
  if (position >= 0) {
    const placements = [];
    for (let index = 0; index < args[position].length; index += 2) {
      const instance = args.slice();
      instance[position] = args[position].slice(index, index + 2);
      placements.push(instance);
    }
    return placements;
  }
  if (operation === OPS.paintInlineImageXObjectGroup)
    return args[1].map((entry) => [args[0], [entry]]);
  if (operation === OPS.paintImageMaskXObjectGroup)
    return args[0].map((entry) => [[entry]]);
  return [null];
}

async function pageArtwork(page, operators, pdfjs, shadowImages, shadowRefs) {
  const { OPS } = pdfjs;
  const textOperations = new Set(
    TEXT_OPERATIONS.map((name) => OPS[name]).filter(Number.isFinite),
  );
  const graphicOperations = new Set(
    [
      ...GRAPHIC_OPERATIONS.map((name) => OPS[name]),
      ...Object.entries(OPS)
        .filter(([name]) => name.startsWith("paint"))
        .map(([, value]) => value),
    ].filter(Number.isFinite),
  );
  const imageOperations = new Set(
    Object.entries(OPS)
      .filter(([name]) => /^paint(?:Inline)?Image/u.test(name))
      .map(([, value]) => value),
  );
  const paints = (list, index) =>
    graphicOperations.has(list.fnArray[index]) &&
    !(
      list.fnArray[index] === OPS.constructPath &&
      list.argsArray[index][0] === OPS.endPath
    );
  const shadowOperation = (list, index) => {
    const id = list.argsArray[index]?.[0];
    if (typeof id !== "string") return false;
    if (shadowImages.has(id)) return true;
    const objects = id.startsWith("g_") ? page.commonObjs : page.objs;
    // Display and extraction intents can assign different IDs to the same
    // PDF image. Its resource reference remains stable across both lists.
    return (
      shadowRefs.size && objects.has(id) && shadowRefs.has(objects.get(id)?.ref)
    );
  };
  if (!operators.fnArray.some((operation) => graphicOperations.has(operation)))
    return { artwork: null, graphics: [], artworkLayers: [] };
  const original = page.getViewport({ scale: 1 });
  const scale = Math.min(
    2,
    Math.sqrt(8_000_000 / (original.width * original.height)),
  );
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  try {
    let renderTask;
    let renderList;
    renderTask = page.render({
      canvas: null,
      canvasContext: canvas.getContext("2d", { alpha: true }),
      viewport,
      background: "rgba(0, 0, 0, 0)",
      annotationMode: pdfjs.AnnotationMode.DISABLE,
      operationsFilter: (index, renderOperators) => {
        // PDF.js 6.3 passes only the index, and getOperatorList() is unoptimized.
        // Read the render task's list so image/text batching cannot shift the
        // filter to a different operation. Newer versions also pass the list.
        const list =
          renderOperators || renderTask?._internalRenderTask?.operatorList;
        if (!list) throw new Error("PDF 页面图像无法与文字分离");
        renderList = list;
        rememberPdfPath(list, index, OPS);
        return (
          !textOperations.has(list.fnArray[index]) &&
          !shadowOperation(list, index)
        );
      },
    });
    await renderTask.promise;
    const artwork = await canvasPng(canvas);
    const graphics = await graphicBlocks(canvas, scale, original);
    const vectors = pdfVectorShapes(renderList, original, pdfjs);
    const artworkLayers = [];
    const ranges = [];
    let range;
    for (let index = 0; index < renderList.fnArray.length; index++) {
      const operation = renderList.fnArray[index];
      if (textOperations.has(operation)) {
        range = null;
      } else if (vectors.has(index)) {
        range = null;
        if (vectors.get(index)) ranges.push({ shape: vectors.get(index) });
      } else if (
        paints(renderList, index) &&
        !shadowOperation(renderList, index)
      ) {
        // Every source image remains an independent slide object, including
        // adjacent photographs with no intervening text. Keep vector drawing
        // runs between them in their original stacking order.
        const image = imageOperations.has(operation);
        if (image) {
          for (const args of imageInstances(
            operation,
            renderList.argsArray[index],
            OPS,
          )) {
            ranges.push({ start: index, end: index, kind: "image", args });
          }
          range = null;
        } else if (!range) {
          range = { start: index, end: index, kind: "drawing" };
          ranges.push(range);
        }
        if (range) range.end = index;
      }
    }
    // Render through PDF.js so clipping, masks, rotation and opacity survive.
    // Crop each isolated layer rather than exporting page-sized transparent
    // pictures that are difficult to select and move independently.
    for (const part of ranges) {
      if (part.shape) {
        artworkLayers.push(part.shape);
        continue;
      }
      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
      let layerTask;
      let restoreArgs;
      layerTask = page.render({
        canvas: null,
        canvasContext: canvas.getContext("2d", { alpha: true }),
        viewport,
        background: "rgba(0, 0, 0, 0)",
        annotationMode: pdfjs.AnnotationMode.DISABLE,
        operationsFilter: (index, list) => {
          const operators =
            list || layerTask?._internalRenderTask?.operatorList;
          const operation = operators.fnArray[index];
          if (index === part.start && part.args) {
            const originalArgs = operators.argsArray[index];
            operators.argsArray[index] = part.args;
            restoreArgs = () => {
              operators.argsArray[index] = originalArgs;
            };
          }
          return (
            !textOperations.has(operation) &&
            !shadowOperation(operators, index) &&
            (!paints(operators, index) ||
              (index >= part.start && index <= part.end))
          );
        },
      });
      try {
        await layerTask.promise;
      } finally {
        restoreArgs?.();
      }
      const cropped = await croppedArtwork(canvas, scale, original);
      if (cropped)
        artworkLayers.push({
          paintOrder: part.start,
          kind: part.kind,
          ...cropped,
        });
    }
    return { artwork, graphics, artworkLayers, renderList };
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

async function croppedArtwork(canvas, scale, viewport) {
  const { width, height } = canvas;
  const pixels = canvas.getContext("2d").getImageData(0, 0, width, height).data;
  let left = width,
    top = height,
    right = -1,
    bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!pixels[(y * width + x) * 4 + 3]) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left) return null;
  const cropped = document.createElement("canvas");
  cropped.width = right - left + 1;
  cropped.height = bottom - top + 1;
  try {
    cropped
      .getContext("2d")
      .drawImage(
        canvas,
        left,
        top,
        cropped.width,
        cropped.height,
        0,
        0,
        cropped.width,
        cropped.height,
      );
    return {
      x: left / scale,
      y: top / scale,
      width: Math.min(cropped.width / scale, viewport.width - left / scale),
      height: Math.min(cropped.height / scale, viewport.height - top / scale),
      data: await canvasPng(cropped),
    };
  } finally {
    cropped.width = cropped.height = 0;
  }
}

async function canvasPng(canvas) {
  const blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (result) =>
        result ? resolve(result) : reject(new Error("PDF 图片无法读取")),
      "image/png",
    ),
  );
  return new Uint8Array(await blob.arrayBuffer());
}

async function graphicBlocks(canvas, scale, viewport) {
  const { width, height } = canvas;
  const pixels = canvas.getContext("2d").getImageData(0, 0, width, height).data;
  const corners = [
    0,
    (width - 1) * 4,
    (height - 1) * width * 4,
    (height * width - 1) * 4,
  ];
  const background =
    pixels[3] > 240 &&
    corners.every(
      (offset) =>
        pixels[offset + 3] > 240 &&
        [0, 1, 2].every(
          (channel) => Math.abs(pixels[offset + channel] - pixels[channel]) < 4,
        ),
    )
      ? [pixels[0], pixels[1], pixels[2]]
      : null;
  const bands = [];
  let band;
  // Crop text-free artwork into inline graphic groups. Transparent/white page
  // padding must not turn a small illustration into a page-sized flow object.
  for (let y = 0; y < height; y++) {
    let left = width;
    let right = -1;
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const foreground = background
        ? background.some(
            (value, channel) => Math.abs(value - pixels[offset + channel]) > 8,
          )
        : Math.min(pixels[offset], pixels[offset + 1], pixels[offset + 2]) <
          245;
      if (pixels[offset + 3] > 24 && foreground) {
        left = Math.min(left, x);
        right = x;
      }
    }
    if (right < 0) continue;
    if (!band || y - band.bottom > scale * 6) {
      band = { left, right, top: y, bottom: y };
      bands.push(band);
    } else {
      band.left = Math.min(band.left, left);
      band.right = Math.max(band.right, right);
      band.bottom = y;
    }
  }
  const graphics = [];
  for (const band of bands) {
    const x = Math.max(0, band.left - 1);
    const y = Math.max(0, band.top - 1);
    const w = Math.min(width - x, band.right - x + 2);
    const h = Math.min(height - y, band.bottom - y + 2);
    // A page background remains available to slide export; it has no useful
    // place as an inline image in a flowing document.
    if (w / width > 0.95 && h / height > 0.95) continue;
    const cropped = document.createElement("canvas");
    cropped.width = w;
    cropped.height = h;
    try {
      cropped.getContext("2d").drawImage(canvas, x, y, w, h, 0, 0, w, h);
      graphics.push({
        x: x / scale,
        y: y / scale,
        width: Math.min(w / scale, viewport.width),
        height: Math.min(h / scale, viewport.height),
        data: await canvasPng(cropped),
      });
    } finally {
      cropped.width = cropped.height = 0;
    }
  }
  return graphics;
}

function paragraphLayout(paragraph, allLines, viewport, fonts) {
  const { lines } = paragraph;
  const first = lines[0];
  const height = first.height;
  const cos = Math.cos(first.angle);
  const sin = Math.sin(first.angle);
  const corners = [
    [0, 0],
    [viewport.width, 0],
    [0, viewport.height],
    [viewport.width, viewport.height],
  ];
  const minLeft = Math.min(...corners.map(([x, y]) => x * cos + y * sin));
  const maxRight = Math.max(...corners.map(([x, y]) => x * cos + y * sin));
  const neighbors = allLines.filter(
    (line) => Math.abs(line.angle - first.angle) < 0.05,
  );
  const contentLeft = Math.max(
    minLeft,
    Math.min(...neighbors.map((line) => line.left)),
  );
  const contentRight = Math.min(
    maxRight,
    Math.max(...neighbors.map((line) => line.right)),
  );
  let left = Math.max(minLeft, Math.min(...lines.map((line) => line.left)));
  let right = Math.min(maxRight, Math.max(...lines.map((line) => line.right)));
  const continuationLeft =
    lines.length > 1
      ? Math.min(...lines.slice(1).map((line) => line.left))
      : left;
  let alignment = "left";
  const center = (first.left + first.right) / 2;
  const narrow = first.right - first.left < (contentRight - contentLeft) * 0.8;
  const centeredOnPage =
    narrow &&
    first.right - first.left < (maxRight - minLeft) * 0.8 &&
    Math.abs(center - (minLeft + maxRight) / 2) < height * 0.6;
  if (
    lines.length === 1 &&
    (centeredOnPage ||
      (narrow &&
        Math.abs(center - (contentLeft + contentRight) / 2) < height * 0.6))
  ) {
    alignment = "center";
    left = centeredOnPage ? minLeft : contentLeft;
    right = centeredOnPage ? maxRight : contentRight;
  } else if (
    lines.length === 1 &&
    narrow &&
    first.left > contentLeft + height * 2 &&
    Math.abs(first.right - contentRight) < height * 0.6
  ) {
    alignment = "right";
    left = contentLeft;
    right = contentRight;
  } else {
    // Retain the column width for short last lines and first-line indents.
    for (const line of neighbors) {
      if (
        Math.abs(line.left - continuationLeft) < height &&
        line.right > left &&
        Math.abs(line.height - height) < height * 0.2
      ) {
        right = Math.max(right, Math.min(maxRight, line.right));
      }
    }
    const fullLines = lines.slice(0, -1);
    if (
      fullLines.length >= 2 &&
      fullLines.every((line) => Math.abs(line.right - right) < height * 0.3)
    ) {
      alignment = "both";
    }
  }
  const gaps = lines
    .slice(1)
    .map((line, index) => lines[index].baseline - line.baseline)
    .filter((gap) => gap > height * 0.5)
    .sort((a, b) => a - b);
  const leading = gaps.length
    ? gaps[Math.floor(gaps.length / 2)]
    : height * 1.2;
  const ascent = Math.max(
    ...first.spans.map((span) => {
      const font = fonts[span.fontName];
      return pdfTextSize(span.transform) * (font?.ascent ?? 0.8);
    }),
  );
  // Small metric/rounding differences between PDF and Word fonts should not
  // turn an otherwise unchanged visual line into an extra wrapped line.
  if (alignment === "left" || alignment === "both")
    right = Math.min(maxRight, right + 1.5);
  const top = first.baseline + ascent;
  const bottom = lines.at(-1).baseline - height * 0.3;
  const bounds = [
    [left, top],
    [right, top],
    [left, bottom],
    [right, bottom],
  ].map(([x, y]) => [x * cos - y * sin, viewport.height - (x * sin + y * cos)]);
  const x = Math.max(0, Math.min(...bounds.map(([position]) => position)));
  const y = Math.max(0, Math.min(...bounds.map(([, position]) => position)));
  return {
    text: paragraph.text,
    structureId: first.paragraphId,
    structureRole: first.structureRole,
    tableCell: first.tableCell,
    textBoxId: first.textBoxId,
    figureId: first.figureId,
    artifact: Boolean(first.artifact),
    x,
    y,
    width: Math.max(
      height,
      Math.min(
        viewport.width,
        Math.max(...bounds.map(([position]) => position)),
      ) - x,
    ),
    height: Math.max(
      height,
      Math.min(
        viewport.height,
        Math.max(...bounds.map(([, position]) => position)),
      ) - y,
    ),
    textDirection:
      Math.abs(first.angle + Math.PI / 2) < 0.05
        ? "tbRl"
        : Math.abs(first.angle - Math.PI / 2) < 0.05
          ? "btLr"
          : "lrTb",
    firstLineIndent:
      alignment === "left" || alignment === "both"
        ? first.left - continuationLeft
        : 0,
    flowLeft: continuationLeft,
    textWidth:
      Math.max(...lines.map((line) => line.right)) -
      Math.min(...lines.map((line) => line.left)),
    leftIndent:
      alignment === "left" || alignment === "both"
        ? Math.max(0, continuationLeft - left)
        : 0,
    alignment,
    leading,
    lines: lines.map((line) => ({
      // Keep line geometry so a running header/footer merged with body text
      // by the paragraph grouper can still be separated without splitting the
      // remaining prose into one paragraph per visual line.
      text: line.text,
      paintOrder: Math.min(
        ...line.spans.map((span) => span.paintOrder ?? Infinity),
      ),
      leading:
        Math.max(
          ...line.spans.map((span) => {
            const font = fonts[span.fontName];
            return pdfTextSize(span.transform) * (font?.ascent ?? 0.8);
          }),
        ) -
        Math.min(
          ...line.spans.map((span) => {
            const font = fonts[span.fontName];
            return pdfTextSize(span.transform) * (font?.descent ?? -0.2);
          }),
        ),
      bounds:
        Math.abs(line.angle) < 0.05
          ? {
              x: line.left,
              y:
                viewport.height -
                line.baseline -
                Math.max(
                  ...line.spans.map(
                    (span) =>
                      pdfTextSize(span.transform) *
                      (fonts[span.fontName]?.ascent ?? 0.8),
                  ),
                ),
              width: line.right - line.left,
              height: line.height * 1.2,
            }
          : null,
      spans: line.spans.flatMap((span) => {
        const font = fonts[span.fontName];
        const base = {
          text: span.str,
          separator: span.separator,
          tabStop: span.tabStop,
          bounds:
            Math.abs(line.angle) < 0.05
              ? {
                  x: span.transform[4],
                  y:
                    viewport.height -
                    span.transform[5] -
                    pdfTextSize(span.transform) * (font?.ascent ?? 0.8),
                  width: span.width,
                  height:
                    pdfTextSize(span.transform) *
                    ((font?.ascent ?? 0.8) - (font?.descent ?? -0.2)),
                }
              : null,
          fontFamily: font?.family || "Times New Roman",
          sizePoints: pdfTextSize(span.transform),
          sizeHalfPoints: Math.max(
            2,
            Math.round(pdfTextSize(span.transform) * 2),
          ),
          bold: Boolean(
            span.bold || (font?.bold && !/fmababld/iu.test(font.family)),
          ),
          italic: Boolean(
            font?.italic ||
            Math.abs(
              (span.transform[0] * span.transform[2] +
                span.transform[1] * span.transform[3]) /
                (span.transform[0] * span.transform[3] -
                  span.transform[1] * span.transform[2] || 1),
            ) > 0.12,
          ),
          shadow: span.shadow,
          color: span.color,
        };
        if (!span.inlineStyles || span.inlineStyles.length < 2) return [base];
        const total = span.inlineStyles.reduce(
          (sum, run) => sum + run.advance,
          0,
        );
        let offset = 0;
        return span.inlineStyles.map((run, index) => {
          const width = (span.width * run.advance) / total;
          const bounds = base.bounds
            ? { ...base.bounds, x: base.bounds.x + offset, width }
            : null;
          offset += width;
          return {
            ...base,
            text: (index ? "" : span.separator || "") + run.text,
            bounds,
            separator: index ? undefined : base.separator,
            tabStop: index ? undefined : base.tabStop,
            bold: Boolean(
              run.bold || (font?.bold && !/fmababld/iu.test(font.family)),
            ),
            color: run.color,
          };
        });
      }),
    })),
  };
}

export async function readPdfPageLayout(page, pdfjs) {
  const viewport = page.getViewport({ scale: 1 });
  const content = await page.getTextContent({ includeMarkedContent: true });
  const tree = await page.getStructTree().catch(() => null);
  const operators = await page.getOperatorList({
    annotationMode: pdfjs.AnnotationMode.DISABLE,
  });
  const fonts = await pageFonts(page, content, operators, pdfjs.OPS);
  const {
    images: shadowImages,
    refs: shadowRefs,
    shadows,
  } = await textShadows(page, content, operators, pdfjs);
  const { artwork, graphics, artworkLayers, renderList } = await pageArtwork(
    page,
    operators,
    pdfjs,
    shadowImages,
    shadowRefs,
  );
  const colors = itemColors(content.items, renderList || operators, pdfjs.OPS);
  const styledItems = content.items.map((item, index) => ({
    ...item,
    ...colors[index],
  }));
  const repairedItems = await repairPdfUnicodeText(
    page,
    { ...content, items: styledItems },
    operators,
    pdfjs.OPS,
  );
  const structuredItems = annotatePdfStructure(repairedItems, tree);
  // Normalize CropBox, page rotation and UserUnit to upright page coordinates,
  // keeping the Cartesian baseline convention used by the paragraph grouper.
  const unit = Math.hypot(viewport.transform[0], viewport.transform[1]);
  const items = structuredItems.map((item, index) => {
    if (typeof item.str !== "string") return item;
    const [a, b, c, d, x, y] = pdfjs.Util.transform(
      viewport.transform,
      item.transform,
    );
    return {
      ...item,
      shadow: shadows.get(index),
      width: item.width * unit,
      height: item.height * unit,
      paintGroup: artworkLayers.length
        ? artworkLayers.filter(
            (layer) =>
              layer.paintOrder < (colors[index].paintOrder ?? Infinity),
          ).length
        : undefined,
      transform: [a, -b, c, -d, x, viewport.height - y],
    };
  });
  const paragraphs = extractPdfParagraphs(items);
  const lines = paragraphs.flatMap((paragraph) => paragraph.lines);
  const layout = paragraphs.map((paragraph) =>
    paragraphLayout(paragraph, lines, viewport, fonts),
  );
  const underlines = [];
  for (const rule of artworkLayers) {
    if (
      rule.kind !== "shape" ||
      rule.preset !== "rect" ||
      rule.height > 1 ||
      rule.width < 4
    )
      continue;
    // Table rules belong to the table grid. Only match thin decorations that
    // follow the baseline and width of actual, non-table text.
    const spans = layout
      .filter((paragraph) => !paragraph.tableCell)
      .flatMap((paragraph) => paragraph.lines.flatMap((line) => line.spans))
      .filter((span) => {
        const box = span.bounds;
        return (
          span.text.trim() &&
          box &&
          box.x >= rule.x - 2 &&
          box.x + box.width <= rule.x + rule.width + 2 &&
          Math.abs(rule.y - (box.y + box.height)) < span.sizePoints * 0.22
        );
      });
    if (
      !spans.length ||
      Math.min(...spans.map((span) => span.bounds.x)) > rule.x + 3 ||
      Math.max(...spans.map((span) => span.bounds.x + span.bounds.width)) <
        rule.x + rule.width - 3
    )
      continue;
    spans.forEach((span) => {
      span.underline = true;
    });
    underlines.push(rule);
  }
  return {
    width: viewport.width,
    height: viewport.height,
    artwork,
    artworkLayers,
    graphics: graphics.filter(
      (graphic) =>
        !underlines.some(
          (rule) =>
            graphic.height <= 3 &&
            Math.abs(graphic.x - rule.x) <= 2 &&
            Math.abs(graphic.y - rule.y) <= 2 &&
            Math.abs(graphic.width - rule.width) <= 3,
        ),
    ),
    margins: {
      left: lines.length
        ? Math.max(0, Math.min(...lines.map((line) => line.left)))
        : 72,
      right: lines.length
        ? Math.max(
            0,
            viewport.width - Math.max(...lines.map((line) => line.right)),
          )
        : 72,
    },
    paragraphs: layout,
  };
}
