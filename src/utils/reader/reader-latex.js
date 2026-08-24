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
  const svg = formula.matches("mjx-container")
    ? Array.from(formula.children).find(
        (child) =>
          child.namespaceURI === SVG_NAMESPACE || child.tagName === "svg",
      ) || formula.querySelector("svg")
    : null;
  if (!source || (!svg && !formula.matches(".reader-math-source"))) {
    return null;
  }

  const display = formula.dataset.readerMathDisplay === "true";
  return {
    element: formula,
    source,
    display,
    text: formatLatexSource({ source, display }),
    mathml: "",
    svg: svg ? new XMLSerializer().serializeToString(svg) : "",
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
    emHeight,
    baselineShiftEm,
  };
};

export const loadLatexSvgImage = ({
  svg,
  width,
  height,
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
        resolve({ image, width, height, emHeight, baselineShiftEm });
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
