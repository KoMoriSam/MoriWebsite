import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import postcss from "postcss";
import { createMarkdownStyleCompiler } from "../src/utils/markdown/markdown-style-compiler.js";
import { collectMarkdownClasses } from "../src/utils/markdown/load-markdown-styles.js";
import { readMarkdownStyleRegistry } from "../src/utils/markdown/markdown-style-registry.js";
import { parseHtmlFragment } from "../src/utils/markdown/render-html-vnodes.js";

const emptyRegistry = () => ({
  classes: [], rootProperties: [], propertyRules: [], initialProperties: [], keyframes: [],
});
const build = await createMarkdownStyleCompiler({
  theme: await readFile(new URL("../node_modules/tailwindcss/theme.css", import.meta.url), "utf8"),
  sources: await Promise.all(["font/index.css", "main.css"].map((file) =>
    readFile(new URL(`../src/assets/${file}`, import.meta.url), "utf8"),
  )),
  loadPlugin: async (id) => (await import(id)).default,
});
const classes = [
  "p-4", "tooltip", "sm:tooltip-right", "hover:badge-success", "w-[137px]",
  "font-gemunu", "shadow-xl", "animate-spin", "prose-xl", "card-icon",
];
const existing = { ...emptyRegistry(), classes: ["p-4", "tooltip"], rootProperties: ["--spacing"] };
const first = await build(classes, existing);
assert.match(first, /\.sm\\:tooltip-right/u);
assert.match(first, /@media \(width >= 40rem\)/u);
assert.match(first, /\.hover\\:badge-success/u);
assert.match(first, /width: 137px/u);
for (const name of ["font-gemunu", "prose-xl", "card-icon"]) assert.ok(first.includes(`.${name}`));
assert.doesNotMatch(first, /\.p-4\s*\{|\.tooltip\s*\{|--spacing:|@layer base|\[data-theme=/u);
assert.equal(await build(classes, existing), first, "Repeated classes do not grow the output");

const root = postcss.parse(first);
const newVariables = [];
const newProperties = [];
const keyframes = [];
root.walkRules((rule) => {
  if (rule.selector.includes(":root")) rule.walkDecls((node) => newVariables.push(node.prop));
});
root.walkAtRules("property", (rule) => newProperties.push(rule.params));
root.walkAtRules("keyframes", (rule) => keyframes.push(rule.params));
assert.ok(newVariables.includes("--font-gemunu"));
assert.ok(newProperties.length > 0);
assert.ok(keyframes.includes("spin"));
const deduplicated = await build(classes, {
  ...existing,
  rootProperties: [...existing.rootProperties, ...newVariables],
  propertyRules: newProperties,
  initialProperties: newProperties,
  keyframes,
});
assert.doesNotMatch(deduplicated, /--font-gemunu:|@property|@keyframes spin/u);
const takeover = await build(classes, { ...existing, classes: [...existing.classes, "sm:tooltip-right"] });
assert.doesNotMatch(takeover, /\.sm\\:tooltip-right/u);
assert.match(await build(classes, existing), /\.sm\\:tooltip-right/u);

const parsed = collectMarkdownClasses(parseHtmlFragment(
  '<span class="tooltip sm:tooltip-right"><span class="tooltip-content">tip</span></span><script class="blocked">bad</script>',
));
assert.deepEqual(parsed, ["tooltip", "sm:tooltip-right", "tooltip-content"]);

const declaration = ["--font-gemunu", "--color-primary"];
const applicationSheet = {
  ownerNode: { tagName: "STYLE", id: "application", textContent: "initial" },
  cssRules: [
    { selectorText: ".sm\\:tooltip-right > .tooltip-content", style: [] },
    { selectorText: ":root", style: declaration },
    { name: "--tw-shadow", cssText: "@property --tw-shadow {}" },
    { name: "spin", type: 7, cssRules: [] },
  ],
};
const runtimeSheet = {
  ownerNode: { id: "markdown-runtime-styles" },
  cssRules: [{ selectorText: ".runtime-only", style: [] }],
};
const remoteSheet = { get cssRules() { throw new Error("Cross origin"); } };
let registry = readMarkdownStyleRegistry({ styleSheets: [applicationSheet, runtimeSheet, remoteSheet] });
assert.deepEqual(registry.classes, ["sm:tooltip-right", "tooltip-content"]);
assert.deepEqual(registry.rootProperties, declaration);
assert.deepEqual(registry.propertyRules, ["--tw-shadow"]);
assert.deepEqual(registry.keyframes, ["spin"]);
applicationSheet.ownerNode.textContent = "updated";
applicationSheet.cssRules[0].selectorText = ".updated";
registry = readMarkdownStyleRegistry({ styleSheets: [applicationSheet] });
assert.deepEqual(registry.classes, ["updated"], "HMR invalidates cached inline sheets");
assert.deepEqual(readMarkdownStyleRegistry({ styleSheets: [] }), emptyRegistry());

console.log("Markdown style checks passed: dynamic utilities, daisyUI, variants, shared definitions, class/property/keyframe deduplication, stylesheet takeover, extraction and CSSOM caching.");
