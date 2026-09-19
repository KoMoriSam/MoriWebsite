const encodeProps = (value) => encodeURIComponent(JSON.stringify(value));

const TITLE_ATTRIBUTE_REGEX =
  /(?:^|[\s{])title\s*=\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|([^\s}]+))/u;

const unescapeAttributeValue = (value = "") =>
  value.replace(/\\([\\"'])/gu, "$1");

export const parseCodeFenceInfo = (info = "") => {
  const normalizedInfo = String(info).trim();
  const titleMatch = normalizedInfo.match(TITLE_ATTRIBUTE_REGEX);
  const firstToken = normalizedInfo.split(/\s+/u)[0] || "";
  const language = /^(?:\{\s*)?title\s*=/u.test(normalizedInfo)
    ? ""
    : firstToken;

  return {
    language,
    title: titleMatch
      ? unescapeAttributeValue(
          titleMatch[1] ?? titleMatch[2] ?? titleMatch[3] ?? "",
        )
      : "",
  };
};

export function codePlugin(md) {
  md.renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx];
    const { language, title } = parseCodeFenceInfo(token.info);
    const props = encodeProps({
      code: token.content,
      language,
      title,
    });

    return `<markdown-code data-markdown-props="${props}"></markdown-code>\n`;
  };
}
