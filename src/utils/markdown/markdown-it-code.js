const encodeProps = (value) => encodeURIComponent(JSON.stringify(value));

export function codePlugin(md) {
  md.renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx];
    const props = encodeProps({
      code: token.content,
      language: token.info.trim(),
    });

    return `<markdown-code data-markdown-props="${props}"></markdown-code>\n`;
  };
}
