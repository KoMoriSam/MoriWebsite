import selectorParser from "postcss-selector-parser";

export const MARKDOWN_STYLE_ID = "markdown-runtime-styles";
const sheetCache = new WeakMap();

const readSheet = (sheet) => {
  let rules;
  try {
    rules = sheet.cssRules;
  } catch {
    // Remote font stylesheets may not expose their CSSOM to this origin.
    return null;
  }
  const text = sheet.ownerNode?.tagName === "STYLE" ? sheet.ownerNode.textContent : "";
  const cached = sheetCache.get(sheet);
  if (cached?.length === rules.length && cached.text === text) return cached;
  const result = {
    length: rules.length,
    text,
    classes: new Set(),
    rootProperties: new Set(),
    propertyRules: new Set(),
    initialProperties: new Set(),
    keyframes: new Set(),
  };
  const visit = (nodes) => {
    for (const rule of nodes) {
      if (rule.selectorText) {
        try {
          const selectors = selectorParser().astSync(rule.selectorText);
          selectors.walkClasses((node) => result.classes.add(node.value));
        } catch {
          // An unsupported selector must not prevent other rules being read.
        }
        const isRoot = /:(?:root|host)\b/u.test(rule.selectorText);
        const isInitial = /^(?:\*|::(?:before|after|backdrop))(?:,\s*(?:\*|::(?:before|after|backdrop)))*$/u.test(rule.selectorText);
        for (const property of Array.from(rule.style || [])) {
          if (isRoot && property.startsWith("--")) result.rootProperties.add(property);
          if (isInitial && property.startsWith("--tw-")) result.initialProperties.add(property);
        }
      }
      if (rule.name && rule.cssText?.startsWith("@property ")) result.propertyRules.add(rule.name);
      if (rule.type === 7) result.keyframes.add(rule.name);
      if (rule.cssRules) visit(rule.cssRules);
    }
  };
  visit(rules);
  sheetCache.set(sheet, result);
  return result;
};

export function readMarkdownStyleRegistry(document) {
  const result = {
    classes: new Set(),
    rootProperties: new Set(),
    propertyRules: new Set(),
    initialProperties: new Set(),
    keyframes: new Set(),
  };
  for (const sheet of document.styleSheets) {
    if (sheet.ownerNode?.id === MARKDOWN_STYLE_ID || sheet.disabled) continue;
    const entry = readSheet(sheet);
    if (!entry) continue;
    for (const key of Object.keys(result)) {
      for (const value of entry[key]) result[key].add(value);
    }
  }
  return Object.fromEntries(Object.entries(result).map(([key, values]) => [key, [...values]]));
}
