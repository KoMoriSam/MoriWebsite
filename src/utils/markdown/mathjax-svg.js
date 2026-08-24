let mathJaxPluginPromise;

const decorateMathJaxSvg = (html, source, display, md) => {
  const escapedSource = md.utils.escapeHtml(source);
  return String(html)
    .replace(
      /<mjx-assistive-mml\b[\s\S]*?<\/mjx-assistive-mml>/gu,
      "",
    )
    .replace(
      /<mjx-container\b/u,
      `<mjx-container data-reader-latex-source="${escapedSource}" data-reader-math-display="${display ? "true" : "false"}" aria-label="${escapedSource}"`,
    );
};

const addReaderMetadata = (md) => {
  const inlineRenderer = md.renderer.rules.math_inline;
  const blockRenderer = md.renderer.rules.math_block;

  md.renderer.rules.math_inline = (tokens, index, options, env, self) =>
    decorateMathJaxSvg(
      inlineRenderer(tokens, index, options, env, self),
      tokens[index].content,
      false,
      md,
    );
  md.renderer.rules.math_block = (tokens, index, options, env, self) =>
    decorateMathJaxSvg(
      blockRenderer(tokens, index, options, env, self),
      tokens[index].content,
      true,
      md,
    );
};

export const loadMathJaxPlugin = async () => {
  if (mathJaxPluginPromise) return mathJaxPluginPromise;

  mathJaxPluginPromise = import("@mdit/plugin-mathjax")
    .then(async ({ createMathjaxInstance, mathjax }) => {
      const instance = await createMathjaxInstance({
        output: "svg",
        delimiters: "all",
        svg: { fontCache: "local" },
      });
      if (!instance) throw new Error("无法创建 MathJax SVG 实例");

      return (md) => {
        mathjax(md, instance);
        addReaderMetadata(md);
      };
    })
    .catch((error) => {
      mathJaxPluginPromise = null;
      throw error;
    });

  return mathJaxPluginPromise;
};
