import assert from "node:assert/strict";

import { renderToString } from "@vue/server-renderer";
import MarkdownIt from "markdown-it";
import MarkdownItAttrs from "markdown-it-attrs";
import { createSSRApp, h } from "vue";

import { projectMarkdownComponentProps } from "../src/utils/markdown/markdown-component-props.js";
import { alertPlugin } from "../src/utils/markdown/markdown-it-alert.js";
import {
  chatContainerPlugin,
  chatHeaderPlugin,
  momentsPlugin,
} from "../src/utils/markdown/markdown-it-chat.js";
import { codePlugin } from "../src/utils/markdown/markdown-it-code.js";
import { footnotePlugin } from "../src/utils/markdown/markdown-it-footnote.js";
import { linkIconPlugin } from "../src/utils/markdown/markdown-it-link-icon.js";
import { mermaidPlugin } from "../src/utils/markdown/markdown-it-mermaid.js";
import { taskStatusPlugin } from "../src/utils/markdown/markdown-it-task-status.js";
import { loadMathJaxPlugin } from "../src/utils/markdown/mathjax-svg.js";
import {
  parseHtmlFragment,
  renderHtmlFragment,
} from "../src/utils/markdown/render-html-vnodes.js";
import { sanitizeMarkdownHtml } from "../src/utils/markdown/sanitize-html.js";

const xssPayloads = [
  "<script>console.log('XSS-1')</script>",
  "<img src=x onerror=\"console.log('XSS-2')\">",
  "<svg onload=\"console.log('XSS-3')\"></svg>",
  "<a href=\"javascript:console.log('XSS-4')\">click</a>",
  "<iframe src=\"javascript:console.log('XSS-5')\"></iframe>",
  "<video src=x onerror=\"console.log('XSS-6')\"></video>",
  "<details open ontoggle=\"console.log('XSS-7')\"></details>",
  "<marquee onstart=\"console.log('XSS-8')\"></marquee>",
  "<ScRiPt>console.log('XSS-9')</ScRiPt>",
  '<img src=x onerror="&#99;&#111;&#110;&#115;&#111;&#108;&#101;&#46;&#108;&#111;&#103;&#40;&#39;&#88;&#83;&#83;&#45;&#49;&#48;&#39;&#41;">',
  "<object data=\"data:text/html,<script>console.log('XSS-11')</script>\"></object>",
  "<form action=\"javascript:console.log('XSS-12')\" onsubmit=\"console.log('XSS-12')\"><input type=submit></form>",
  "<body onload=\"console.log('XSS-13')\"></body>",
  "<input onfocus=\"console.log('XSS-14')\" autofocus>",
  "<textarea onfocus=\"console.log('XSS-15')\" autofocus></textarea>",
];

const dangerousVariants = [
  '<a href="java&#x09;script:alert(1)">tab</a>',
  '<a href="jav&#x61;script:alert(1)">entity</a>',
  '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
  '<button formaction="javascript:alert(1)">submit</button>',
  '<svg><use xlink:href="javascript:alert(1)"></use></svg>',
  '<svg><a href="data:text/html,<script>alert(1)</script>">svg</a></svg>',
  '<img src="data:text/html,<script>alert(1)</script>">',
  '<div is="script" style="background:url(javascript:alert(1))">x</div>',
  '<a ping="https://tracker.example" href="/safe">safe</a>',
];

const blockedTags =
  /<(?:script|style|iframe|object|embed|applet|base|link|meta|form|textarea|select|template|noscript|marquee|video)\b/iu;
const blockedAttributes =
  /\s(?:on[a-z]+|srcdoc|action|formaction|autofocus|ping|is)=/iu;
const blockedProtocols = /(?:javascript|data:text\/html)\s*:/iu;
const rawHtmlMarkdown = new MarkdownIt({ html: true });

for (const payload of [...xssPayloads, ...dangerousVariants]) {
  for (const html of [payload, rawHtmlMarkdown.render(payload)]) {
    const sanitized = sanitizeMarkdownHtml(html);
    assert.doesNotMatch(sanitized, blockedTags, payload);
    assert.doesNotMatch(sanitized, blockedAttributes, payload);
    assert.doesNotMatch(sanitized, blockedProtocols, payload);
  }
}

const safeHtml = sanitizeMarkdownHtml(`
  <div id="safe" class="native-html" style="color:red">
    <u>underline</u><small>small</small>
    <details open><summary>summary</summary><p>content</p></details>
    <a href="#inside">anchor</a>
    <img src="/images/article.png" alt="article" width="320" height="180"
      style="max-width:100%;height:auto;width:320px;color:red">
    <input type="checkbox" checked class="task-list-item-checkbox">
    <button type="button" class="comment-trigger" data-paragraph-id="p-1"
      data-source-type="article" aria-label="打开段评">comment</button>
  </div>
`);

for (const tag of ["u", "small", "details", "summary", "div", "img", "input", "button"]) {
  assert.match(safeHtml, new RegExp(`<${tag}\\b`, "u"));
}
assert.match(safeHtml, /href="#inside"/u);
assert.match(safeHtml, /style="max-width: 100%; height: auto; width: 320px"/u);
assert.doesNotMatch(safeHtml, /color\s*:/iu);
assert.match(safeHtml, /type="checkbox"/u);
assert.match(safeHtml, /disabled=""/u);
assert.match(safeHtml, /data-paragraph-id="p-1"/u);

const safeUrls = sanitizeMarkdownHtml(`
  <a href="https://example.com" target="_blank">https</a>
  <a href="mailto:test@example.com">mail</a>
  <a href="../relative">relative</a>
  <img src="data:image/png;base64,iVBORw0KGgo=" alt="data image">
`);
assert.match(safeUrls, /href="https:\/\/example.com"/u);
assert.match(safeUrls, /rel="noopener noreferrer"/u);
assert.match(safeUrls, /href="mailto:test@example.com"/u);
assert.match(safeUrls, /href="\.\.\/relative"/u);
assert.match(safeUrls, /src="data:image\/png;base64,iVBORw0KGgo="/u);

const mathJaxHtml = sanitizeMarkdownHtml(`
  <mjx-container jax="SVG" display="true" style="position:relative"
    data-reader-latex-source="E = mc^2" data-reader-math-display="true">
    <svg xmlns="http://www.w3.org/2000/svg" width="1ex" height="1ex"
      viewBox="0 0 100 100" role="img" focusable="false"
      style="vertical-align:-0.025ex">
      <defs><path id="MJX-1" d="M0 0" fill="currentColor"></path></defs>
      <g transform="scale(1,-1)"><use xlink:href="#MJX-1"></use></g>
    </svg>
  </mjx-container>
`);
for (const tag of ["mjx-container", "svg", "defs", "path", "g", "use"]) {
  assert.match(mathJaxHtml, new RegExp(`<${tag}\\b`, "u"));
}
assert.match(mathJaxHtml, /xlink:href="#MJX-1"/u);
assert.match(mathJaxHtml, /data-reader-latex-source="E = mc\^2"/u);
assert.match(mathJaxHtml, /style="position: relative"/u);
assert.match(mathJaxHtml, /style="vertical-align: -0.025ex"/u);

const mathMarkdown = new MarkdownIt();
mathMarkdown.use(await loadMathJaxPlugin());
const actualMathJaxHtml = sanitizeMarkdownHtml(
  mathMarkdown.render("$\\frac{a}{b}+\\sqrt{x}$\n\n$$\\sum_{i=1}^{n} i$$"),
);
assert.match(actualMathJaxHtml, /<mjx-break\b[^>]*size="\d+"/u);
assert.match(actualMathJaxHtml, /<mjx-container\b[^>]*display="true"/u);
assert.match(actualMathJaxHtml, /data-latex=/u);
assert.match(actualMathJaxHtml, /<defs><path/u);
assert.match(actualMathJaxHtml, /<use\b[^>]*xlink:href="#MJX-/u);

const markerNames = ["alert", "chat", "moment", "code", "link-icon", "mermaid"];
const markerHtml = sanitizeMarkdownHtml(
  markerNames
    .map(
      (name) =>
        `<markdown-${name} data-markdown-props="%7B%7D"></markdown-${name}>`,
    )
    .join(""),
);
for (const name of markerNames) {
  assert.match(markerHtml, new RegExp(`<markdown-${name}\\b`, "u"));
}

const componentMarkdown = new MarkdownIt({ html: true });
componentMarkdown
  .use(alertPlugin)
  .use(chatHeaderPlugin)
  .use(chatContainerPlugin)
  .use(momentsPlugin)
  .use(codePlugin)
  .use(footnotePlugin)
  .use(taskStatusPlugin)
  .use(mermaidPlugin)
  .use(linkIconPlugin);
const componentHtml = sanitizeMarkdownHtml(
  componentMarkdown.render(`
> [!note] Safe alert
> alert body

> [!chat] **Mori** · online
>
> > **Mori** 10:30 · sent
> > safe chat

> [!moment] **Mori** · now · Kunming
>
> safe moment
>
> ![safe](https://example.com/image.png)
>
> ❤️ 1 · 💬 2 · 🔁 3

[external](https://example.com)

- [x] task

footnote[^1]

[^1]: safe footnote

\`\`\`js
const safe = true;
\`\`\`

\`\`\`mermaid
flowchart TD
  A --> B
\`\`\`
`),
);
const componentFragment = parseHtmlFragment(componentHtml);
const projectedMarkerNames = new Set();
const visitMarker = (node) => {
  if (node.tagName?.startsWith("markdown-")) {
    const encoded = node.attrs?.find(
      (attribute) => attribute.name === "data-markdown-props",
    )?.value;
    assert.ok(projectMarkdownComponentProps(node.tagName, encoded), node.tagName);
    projectedMarkerNames.add(node.tagName.replace(/^markdown-/u, ""));
  }
  for (const child of node.childNodes || []) visitMarker(child);
};
visitMarker(componentFragment);
assert.deepEqual([...projectedMarkerNames].sort(), [...markerNames].sort());
assert.match(componentHtml, /data-task-status="x"/u);
assert.match(componentHtml, /data-task-tone="success"/u);
assert.match(componentHtml, /class="footnote-ref"/u);
assert.match(componentHtml, /class="footnote-backref"/u);
assert.match(componentHtml, /href="#fn1"/u);
assert.match(componentHtml, /href="#fnref1"/u);

const encodeProps = (value) => encodeURIComponent(JSON.stringify(value));
const alertProps = projectMarkdownComponentProps(
  "markdown-alert",
  encodeProps({
    type: "warning",
    titleHtml: '<img src=x onerror="alert(1)">title',
    foldable: true,
    innerHTML: "<script>alert(1)</script>",
    onclick: "alert(1)",
    unknown: "discard",
  }),
);
assert.deepEqual(Object.keys(alertProps).sort(), [
  "collapsed",
  "foldable",
  "icon",
  "titleHtml",
  "type",
]);
assert.equal(alertProps.innerHTML, undefined);
assert.equal(alertProps.onclick, undefined);
assert.doesNotMatch(sanitizeMarkdownHtml(alertProps.titleHtml), blockedAttributes);

const momentProps = projectMarkdownComponentProps(
  "markdown-moment",
  encodeProps({
    username: "Mori",
    images: [
      { url: "https://example.com/safe.png", alt: "safe", onerror: "bad" },
      { url: "javascript:alert(1)", alt: "bad" },
      { url: "data:image/svg+xml,<svg onload=alert(1)>", alt: "bad" },
    ],
    stats: { like: "1", comment: "2", share: "3", constructor: "bad" },
    comments: [],
    innerHTML: "bad",
  }),
);
assert.deepEqual(momentProps.images, [
  { url: "https://example.com/safe.png", alt: "safe" },
]);
assert.deepEqual(momentProps.stats, { like: "1", comment: "2", share: "3" });
assert.equal(momentProps.innerHTML, undefined);

assert.equal(
  projectMarkdownComponentProps(
    "markdown-link-icon",
    encodeProps({ src: "javascript:alert(1)", innerHTML: "bad" }),
  ),
  null,
);
assert.deepEqual(
  projectMarkdownComponentProps(
    "markdown-link-icon",
    encodeProps({ src: "https://example.com/favicon.ico", innerHTML: "bad" }),
  ),
  { src: "https://example.com/favicon.ico" },
);
assert.equal(projectMarkdownComponentProps("markdown-code", "%E0%A4%A"), null);
assert.equal(projectMarkdownComponentProps("markdown-unknown", encodeProps({})), null);

const attrsMarkdown = new MarkdownIt({ html: true }).use(MarkdownItAttrs, {
  allowedAttributes: ["id", "class"],
});
const attrsHtml = sanitizeMarkdownHtml(
  attrsMarkdown.render(
    '![image](/safe.png){#safe .wide onerror="alert(1)" style="color:red" src="javascript:alert(1)"}\n\n[text](/safe){#link .safe onclick="alert(1)" href="javascript:alert(1)"}',
  ),
);
assert.match(attrsHtml, /id="safe"/u);
assert.match(attrsHtml, /class="wide"/u);
assert.match(attrsHtml, /src="\/safe.png"/u);
assert.match(attrsHtml, /href="\/safe"/u);
assert.doesNotMatch(attrsHtml, blockedAttributes);
assert.doesNotMatch(attrsHtml, /style=/iu);
assert.doesNotMatch(attrsHtml, /javascript:/iu);

const renderInput = `${safeHtml}${mathJaxHtml}`;
assert.equal(sanitizeMarkdownHtml(renderInput), renderInput);

const ssrApp = createSSRApp({
  render: () =>
    h(
      "article",
      null,
      renderHtmlFragment(parseHtmlFragment(renderInput)),
    ),
});
const ssrHtml = await renderToString(ssrApp);
assert.doesNotMatch(ssrHtml, blockedTags);
assert.doesNotMatch(ssrHtml, blockedAttributes);
assert.match(ssrHtml, /<mjx-container/u);
assert.match(ssrHtml, /<details open/u);

console.log("Markdown XSS checks passed: 15 payloads, variants, real markers, SSR and compatibility.");
