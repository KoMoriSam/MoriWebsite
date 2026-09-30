const LATEX_SELECTOR =
  ".reader-math-source, mjx-container[data-reader-latex-source]";
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

const parseSvgSignedLengthEm = (value = "") => {
  const match = String(value)
    .trim()
    .match(/^([+-]?(?:\d+(?:\.\d+)?|\.\d+))(ex|em)$/iu);
  if (!match) return 0;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return 0;
  return match[2].toLowerCase() === "ex" ? amount * 0.5 : amount;
};

const parseSvgLengthEm = (value = "") =>
  Math.max(0, parseSvgSignedLengthEm(value));

const MATHJAX_BREAK_SPACES = [0.001, 0.111, 0.167, 0.222, 0.278, 0.333];

const parseSvgViewBox = (svg) => {
  const values = String(svg.getAttribute("viewBox") || "")
    .trim()
    .split(/[\s,]+/u)
    .map(Number);
  if (
    values.length !== 4 ||
    !values.every(Number.isFinite) ||
    values[2] <= 0 ||
    values[3] <= 0
  ) {
    return null;
  }
  return { x: values[0], y: values[1], width: values[2], height: values[3] };
};

const getMathJaxBreakSpace = (element) => {
  const size = Number(element.getAttribute("size"));
  if (Number.isInteger(size) && MATHJAX_BREAK_SPACES[size] !== undefined) {
    return MATHJAX_BREAK_SPACES[size];
  }
  const match = String(element.getAttribute("style") || "").match(
    /letter-spacing:\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))em/iu,
  );
  return match ? Math.max(0, Number(match[1]) + 1) : 0;
};

const collectSharedSvgDefinitions = (svgs) => {
  const definitions = [];
  const seen = new Set();
  svgs.forEach((svg) => {
    Array.from(svg.children)
      .filter(({ localName }) => localName === "defs")
      .flatMap((defs) => Array.from(defs.children))
      .forEach((definition) => {
        const markup = new XMLSerializer().serializeToString(definition);
        const id = definition.getAttribute("id");
        const key = id ? `id:${id}` : `markup:${markup}`;
        if (seen.has(key)) return;
        seen.add(key);
        definitions.push(definition);
      });
  });
  return definitions;
};

const serializeStandaloneSvg = (svg, sharedDefinitions) => {
  if (!sharedDefinitions.length) {
    return new XMLSerializer().serializeToString(svg);
  }

  const clone = svg.cloneNode(true);
  Array.from(clone.children)
    .filter(({ localName }) => localName === "defs")
    .forEach((defs) => defs.remove());
  const defs = clone.ownerDocument.createElementNS(SVG_NAMESPACE, "defs");
  sharedDefinitions.forEach((definition) => {
    defs.append(definition.cloneNode(true));
  });
  clone.prepend(defs);
  return new XMLSerializer().serializeToString(clone);
};

const getLatexSvgSegments = (formula, svgs) => {
  const segments = [];
  const sharedDefinitions = collectSharedSvgDefinitions(svgs);
  let breakSpace = 0;
  Array.from(formula.children).forEach((child) => {
    if (child.localName === "mjx-break") {
      breakSpace = getMathJaxBreakSpace(child);
      return;
    }
    if (child.localName !== "svg") {
      return;
    }
    const viewBox = parseSvgViewBox(child);
    if (!viewBox) return;

    segments.push({
      element: child,
      svg: serializeStandaloneSvg(child, sharedDefinitions),
      viewBox,
      spaceBefore: breakSpace,
    });
    breakSpace = 0;
  });
  return segments.length === svgs.length ? segments : [];
};

const serializeLatexSvg = (segments) => {
  if (segments.length === 1) return segments[0].svg;

  let offsetX = 0;
  const positionedSegments = segments.map((segment) => {
    offsetX += segment.spaceBefore * 1000;
    const positioned = { ...segment, offsetX };
    offsetX += segment.viewBox.width;
    return positioned;
  });

  const top = Math.min(...positionedSegments.map(({ viewBox }) => viewBox.y));
  const bottom = Math.max(
    ...positionedSegments.map(({ viewBox }) => viewBox.y + viewBox.height),
  );
  const height = bottom - top;
  const documentNode = positionedSegments[0].element.ownerDocument;
  const root = documentNode.createElementNS(SVG_NAMESPACE, "svg");
  root.setAttribute("xmlns", SVG_NAMESPACE);
  root.setAttribute("viewBox", `0 ${top} ${offsetX} ${height}`);
  root.setAttribute("width", `${offsetX / 1000}em`);
  root.setAttribute("height", `${height / 1000}em`);
  root.style.verticalAlign = `${-bottom / 1000}em`;

  positionedSegments.forEach(({ element, viewBox, offsetX: x }) => {
    const clone = element.cloneNode(true);
    clone.setAttribute("x", String(x));
    clone.setAttribute("y", String(viewBox.y));
    clone.setAttribute("width", String(viewBox.width));
    clone.setAttribute("height", String(viewBox.height));
    clone.style.verticalAlign = "";
    root.append(clone);
  });
  return new XMLSerializer().serializeToString(root);
};

const inlineSvgCurrentColor = (root, color) => {
  [root, ...root.querySelectorAll("*")].forEach((element) => {
    Array.from(element.attributes).forEach(({ name, value }) => {
      if (!/currentcolor/iu.test(value)) return;
      element.setAttribute(name, value.replace(/currentcolor/giu, color));
    });
  });
};

export const formatLatexSource = ({ source = "", display = false } = {}) => {
  const normalized = String(source).trim();
  if (!normalized) return "";
  return display ? `$$${normalized}$$` : `$${normalized}$`;
};

export const getLatexFormula = (element) => {
  const formula = element?.matches?.(LATEX_SELECTOR)
    ? element
    : element?.closest?.(LATEX_SELECTOR);
  if (!formula) return null;

  const source = formula.dataset.readerLatexSource || "";
  const svgs = formula.matches("mjx-container")
    ? Array.from(formula.children).filter(
        (child) =>
          child.namespaceURI === SVG_NAMESPACE || child.localName === "svg",
      )
    : [];
  if (!source || (!svgs.length && !formula.matches(".reader-math-source"))) {
    return null;
  }

  const display = formula.dataset.readerMathDisplay === "true";
  const svgSegments = getLatexSvgSegments(formula, svgs);
  return {
    element: formula,
    source,
    display,
    text: formatLatexSource({ source, display }),
    mathml: "",
    svg: svgSegments.length ? serializeLatexSvg(svgSegments) : "",
    svgSegments:
      !display && svgSegments.length > 1
        ? svgSegments.map(({ svg, spaceBefore }) => ({ svg, spaceBefore }))
        : [],
  };
};

export const getLatexSelection = (range) => {
  if (!(range instanceof Range) || range.collapsed) return null;

  const common =
    range.commonAncestorContainer instanceof Element
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement;
  if (!common) return null;

  const containingFormula = getLatexFormula(common);
  if (containingFormula?.element.contains(common)) {
    return { ...containingFormula, pure: true };
  }

  const formulas = new Map();
  let hasOtherText = false;
  const intersects = (node) => {
    try {
      return range.intersectsNode(node);
    } catch {
      return false;
    }
  };
  const visit = (node) => {
    if (node instanceof Element) {
      const formula = getLatexFormula(node);
      if (formula?.element === node) {
        if (intersects(node)) formulas.set(formula.element, formula);
        return;
      }
      node.childNodes.forEach(visit);
      return;
    }
    if (node.nodeType !== Node.TEXT_NODE || !node.textContent || !intersects(node)) {
      return;
    }
    let start = 0;
    let end = node.textContent.length;
    if (range.startContainer === node) start = range.startOffset;
    if (range.endContainer === node) end = range.endOffset;
    if (!node.textContent.slice(start, end).trim()) return;

    hasOtherText = true;
  };

  visit(common);

  if (formulas.size !== 1 || hasOtherText) return null;
  return { ...formulas.values().next().value, pure: true };
};

export const createLatexSvg = ({
  svg,
  source = "",
  color = "#000000",
  fontSize = 64,
  display = false,
} = {}) => {
  const markup = String(svg).trim();
  if (!markup) throw new Error("公式尚未生成矢量 SVG");

  const documentNode = new DOMParser().parseFromString(
    markup,
    "image/svg+xml",
  );
  const root = documentNode.documentElement;
  if (root.tagName.toLowerCase() !== "svg") {
    throw new Error("无法读取公式 SVG");
  }

  const viewBox = String(root.getAttribute("viewBox") || "")
    .trim()
    .split(/[\s,]+/u)
    .map(Number);
  const viewWidth = Math.abs(viewBox[2]) || 1000;
  const viewHeight = Math.abs(viewBox[3]) || 1000;
  const emHeight =
    parseSvgLengthEm(root.getAttribute("height")) || (display ? 1.3 : 1);
  const baselineShiftEm = parseSvgSignedLengthEm(root.style.verticalAlign);
  const height = Math.max(1, Math.round(fontSize * emHeight));
  const width = Math.max(1, Math.round((viewWidth / viewHeight) * height));

  root.setAttribute("xmlns", SVG_NAMESPACE);
  root.setAttribute("width", String(width));
  root.setAttribute("height", String(height));
  root.setAttribute("preserveAspectRatio", "xMidYMid meet");
  root.setAttribute("color", color);
  root.setAttribute("fill", color);
  root.style.color = color;
  root.style.verticalAlign = "";
  root.style.overflow = "visible";
  inlineSvgCurrentColor(root, color);

  if (source) {
    const metadata = documentNode.createElementNS(SVG_NAMESPACE, "metadata");
    metadata.setAttribute("data-reader-latex-source", source);
    metadata.textContent = formatLatexSource({ source, display });
    root.prepend(metadata);
  }

  return {
    svg: new XMLSerializer().serializeToString(root),
    width,
    height,
    fontSize,
    emHeight,
    baselineShiftEm,
  };
};

export const loadLatexSvgImage = ({
  svg,
  width,
  height,
  fontSize = 64,
  emHeight = 1,
  baselineShiftEm = 0,
}) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const probe = document.createElement("canvas");
        probe.width = 1;
        probe.height = 1;
        const context = probe.getContext("2d");
        if (!context) throw new Error("当前浏览器无法验证 LaTeX 图片");
        context.drawImage(image, 0, 0, 1, 1);
        probe.toDataURL("image/png");
        resolve({
          image,
          width,
          height,
          fontSize,
          emHeight,
          baselineShiftEm,
        });
      } catch {
        reject(new Error("当前浏览器禁止导出 LaTeX 图片"));
      }
    };
    image.onerror = () => {
      reject(new Error("无法渲染 LaTeX 公式"));
    };
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });

export const copyLatexSvg = async (options) => {
  const { svg } = createLatexSvg(options);
  const svgBlob = new Blob([svg], { type: "image/svg+xml" });
  const textBlob = new Blob([svg], { type: "text/plain" });

  if (navigator.clipboard?.write && typeof ClipboardItem === "function") {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/svg+xml": svgBlob,
          "text/plain": textBlob,
        }),
      ]);
      return;
    } catch {
      // 部分浏览器不接受 SVG MIME，回退为可粘贴的 SVG 源码。
    }
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(svg);
    return;
  }
  throw new Error("当前浏览器不支持复制 SVG");
};
