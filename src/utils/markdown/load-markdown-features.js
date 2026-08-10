import hljs from "highlight.js/lib/core";

const loadedLanguages = new Set();

const languageLoaders = {
  bash: () => import("highlight.js/lib/languages/bash"),
  c: () => import("highlight.js/lib/languages/c"),
  cpp: () => import("highlight.js/lib/languages/cpp"),
  csharp: () => import("highlight.js/lib/languages/csharp"),
  css: () => import("highlight.js/lib/languages/css"),
  diff: () => import("highlight.js/lib/languages/diff"),
  dockerfile: () => import("highlight.js/lib/languages/dockerfile"),
  go: () => import("highlight.js/lib/languages/go"),
  graphql: () => import("highlight.js/lib/languages/graphql"),
  ini: () => import("highlight.js/lib/languages/ini"),
  java: () => import("highlight.js/lib/languages/java"),
  javascript: () => import("highlight.js/lib/languages/javascript"),
  json: () => import("highlight.js/lib/languages/json"),
  kotlin: () => import("highlight.js/lib/languages/kotlin"),
  less: () => import("highlight.js/lib/languages/less"),
  lua: () => import("highlight.js/lib/languages/lua"),
  makefile: () => import("highlight.js/lib/languages/makefile"),
  markdown: () => import("highlight.js/lib/languages/markdown"),
  nginx: () => import("highlight.js/lib/languages/nginx"),
  objectivec: () => import("highlight.js/lib/languages/objectivec"),
  perl: () => import("highlight.js/lib/languages/perl"),
  php: () => import("highlight.js/lib/languages/php"),
  plaintext: () => import("highlight.js/lib/languages/plaintext"),
  powershell: () => import("highlight.js/lib/languages/powershell"),
  python: () => import("highlight.js/lib/languages/python"),
  r: () => import("highlight.js/lib/languages/r"),
  ruby: () => import("highlight.js/lib/languages/ruby"),
  rust: () => import("highlight.js/lib/languages/rust"),
  scss: () => import("highlight.js/lib/languages/scss"),
  shell: () => import("highlight.js/lib/languages/shell"),
  sql: () => import("highlight.js/lib/languages/sql"),
  swift: () => import("highlight.js/lib/languages/swift"),
  typescript: () => import("highlight.js/lib/languages/typescript"),
  vue: () => import("highlight.js/lib/languages/xml"),
  xml: () => import("highlight.js/lib/languages/xml"),
  yaml: () => import("highlight.js/lib/languages/yaml"),
};

const languageAliases = {
  cplusplus: "cpp",
  cs: "csharp",
  cxx: "cpp",
  h: "c",
  hpp: "cpp",
  html: "xml",
  js: "javascript",
  jsx: "javascript",
  md: "markdown",
  objc: "objectivec",
  plaintext: "plaintext",
  ps1: "powershell",
  py: "python",
  rb: "ruby",
  sh: "shell",
  shellscript: "shell",
  text: "plaintext",
  ts: "typescript",
  tsx: "typescript",
  yml: "yaml",
  zsh: "shell",
};

const FENCE_INFO_REGEX = /^(```|~~~)\s*([^\n]*)/gm;
const MATH_BLOCK_REGEX =
  /\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\begin\{(?:align|equation|gather|cd|alignat)\}/;
const MATH_INLINE_REGEX =
  /(^|[^\\])\$(?:[^$\n]|\\\$)+\$|\\\((?:[^\n]|\\\))+\\\)/;

export const normalizeLanguage = (rawLanguage = "") => {
  const firstToken = String(rawLanguage || "")
    .trim()
    .split(/\s+/)[0]
    ?.toLowerCase();

  if (!firstToken) {
    return "";
  }

  const sanitized = firstToken.replace(/[^a-z0-9#+-]/g, "");
  if (!sanitized) {
    return "";
  }

  if (sanitized === "c++") {
    return "cpp";
  }

  if (sanitized === "c#") {
    return "csharp";
  }

  return languageAliases[sanitized] || sanitized;
};

export const collectFenceLanguages = (markdown = "") => {
  const languages = new Set();

  for (const match of String(markdown || "").matchAll(FENCE_INFO_REGEX)) {
    const normalizedLanguage = normalizeLanguage(match[2]);
    if (!normalizedLanguage) {
      continue;
    }

    languages.add(normalizedLanguage);
  }

  return Array.from(languages);
};

export const hasMathSyntax = (markdown = "") => {
  const content = String(markdown || "");
  return MATH_BLOCK_REGEX.test(content) || MATH_INLINE_REGEX.test(content);
};

const registerLanguage = async (language) => {
  if (
    !language ||
    loadedLanguages.has(language) ||
    hljs.getLanguage(language)
  ) {
    loadedLanguages.add(language);
    return;
  }

  const loader = languageLoaders[language];
  if (!loader) {
    return;
  }

  try {
    const module = await loader();
    const languageDefinition = module?.default || module;

    if (languageDefinition) {
      hljs.registerLanguage(language, languageDefinition);
      loadedLanguages.add(language);
    }
  } catch (error) {
    console.warn(`代码高亮语言加载失败: ${language}`, error);
  }
};

export const preloadHighlightLanguages = async (languages = []) => {
  await Promise.all(
    Array.from(new Set(languages.map(normalizeLanguage))).map(registerLanguage),
  );
};

const ensureHljsCodeClass = (html = "") => {
  if (!html.includes("<code")) {
    return html;
  }

  if (html.includes('class="hljs') || html.includes("class='hljs")) {
    return html;
  }

  return html
    .replace(/<code([^>]*)class="([^"]*)"([^>]*)>/, (_, before, cls, after) => {
      const classNames = cls.includes("hljs") ? cls : `hljs ${cls}`;
      return `<code${before}class="${classNames}"${after}>`;
    })
    .replace(/<code(?![^>]*class=)([^>]*)>/, '<code class="hljs"$1>');
};

export const highlightLazyPlugin = (md) => {
  md.options.highlight = (code, language) => {
    const normalizedLanguage = normalizeLanguage(language);

    if (normalizedLanguage && hljs.getLanguage(normalizedLanguage)) {
      try {
        return hljs.highlight(code, {
          language: normalizedLanguage,
          ignoreIllegals: true,
        }).value;
      } catch (error) {
        console.warn(`代码高亮渲染失败: ${normalizedLanguage}`, error);
      }
    }

    return md.utils.escapeHtml(code);
  };

  const defaultFenceRenderer =
    md.renderer.rules.fence ||
    ((tokens, idx, options, env, self) =>
      self.renderToken(tokens, idx, options));

  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const html = defaultFenceRenderer(tokens, idx, options, env, self);
    return ensureHljsCodeClass(html);
  };
};
