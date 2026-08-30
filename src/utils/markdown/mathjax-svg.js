let mathJaxPluginPromise;

const normalizeMathJaxDimensions = (html, xHeight) => {
  const ratio = Number.isFinite(xHeight) && xHeight > 0 ? xHeight : 0.5;
  return String(html).replace(
    /<(?:mjx-container|mjx-break|svg)\b[^>]*>/gu,
    (tag) =>
      tag.replace(
        /([+-]?(?:\d+(?:\.\d+)?|\.\d+))ex\b/giu,
        (_, value) => `${Number((Number(value) * ratio).toFixed(6))}em`,
      ),
  );
};

const decorateMathJaxSvg = (html, source, display, md, xHeight) => {
  const escapedSource = md.utils.escapeHtml(source);
  return normalizeMathJaxDimensions(html, xHeight)
    .replace(/<mjx-assistive-mml\b[\s\S]*?<\/mjx-assistive-mml>/gu, "")
    .replace(
      /<mjx-container\b/u,
      `<mjx-container data-reader-latex-source="${escapedSource}" data-reader-math-display="${display ? "true" : "false"}" aria-label="${escapedSource}"`,
    );
};

const addReaderMetadata = (md, xHeight) => {
  const inlineRenderer = md.renderer.rules.math_inline;
  const blockRenderer = md.renderer.rules.math_block;

  md.renderer.rules.math_inline = (tokens, index, options, env, self) =>
    decorateMathJaxSvg(
      inlineRenderer(tokens, index, options, env, self),
      tokens[index].content,
      false,
      md,
      xHeight,
    );
  md.renderer.rules.math_block = (tokens, index, options, env, self) =>
    decorateMathJaxSvg(
      blockRenderer(tokens, index, options, env, self),
      tokens[index].content,
      true,
      md,
      xHeight,
    );
};

export const loadMathJaxPlugin = async () => {
  if (mathJaxPluginPromise) return mathJaxPluginPromise;

  mathJaxPluginPromise = Promise.all([
    import("@mdit/plugin-mathjax"),
    import("@mathjax/mathjax-newcm-font/js/svg/dynamic/calligraphic.js"),
  ])
    .then(async ([{ createMathjaxInstance, mathjax }]) => {
      const instance = await createMathjaxInstance({
        output: "svg",
        delimiters: "all",
        svg: {
          fontCache: "local",
        },
      });
      if (!instance) throw new Error("无法创建 MathJax SVG 实例");

      const font = instance.documentOptions.OutputJax.font;
      font.constructor.dynamicFiles.calligraphic.setup(font);
      const xHeight = Number(font.params.x_height);

      return (md) => {
        mathjax(md, instance);
        addReaderMetadata(md, xHeight);
      };
    })
    .catch((error) => {
      mathJaxPluginPromise = null;
      throw error;
    });

  return mathJaxPluginPromise;
};
