import postcss from "postcss";
import { compile } from "tailwindcss";

const collectDefinitions = (sources) => sources.flatMap((source) =>
  postcss.parse(source).nodes.filter((node) =>
    node.type === "atrule" && ["theme", "utility", "custom-variant"].includes(node.name),
  ).map((node) => node.toString()),
).join("\n");

export async function createMarkdownStyleCompiler({ theme, sources, loadPlugin }) {
  const input = `@layer theme, base, components, utilities;
    @layer theme { ${theme} }
    ${collectDefinitions(sources)}
    @plugin "daisyui";
    @plugin "@tailwindcss/typography";
    @layer utilities { @tailwind utilities; }`;
  const createCompiler = () => compile(input, {
    loadModule: async (id) => {
      const plugin = await loadPlugin(id);
      const { handler, config } = plugin.__isOptionsFunction
        ? plugin({ themes: false, logs: false })
        : plugin;
      return {
        base: "",
        module: {
          config,
          // The application already owns preflight, themes and daisyUI base styles.
          handler: (api) => handler({ ...api, addBase: () => {} }),
        },
      };
    },
  });
  let compiler = await createCompiler();
  let previous = new Set();

  return async (classes, existing) => {
    const knownClasses = new Set(existing.classes);
    const candidates = [...new Set(classes)].filter((name) => !knownClasses.has(name));
    const current = new Set(candidates);
    // Tailwind's compiler accumulates candidates. Reset when a newly loaded
    // application stylesheet takes over a previously generated class.
    if ([...previous].some((name) => !current.has(name))) {
      compiler = await createCompiler();
    }
    previous = current;
    if (!candidates.length) return "";

    const rootProperties = new Set(existing.rootProperties);
    const propertyRules = new Set(existing.propertyRules);
    const initialProperties = new Set(existing.initialProperties);
    const keyframes = new Set(existing.keyframes);
    const output = postcss.parse(compiler.build(candidates));
    output.walkComments((node) => node.remove());
    output.walkAtRules((node) => {
      if ((node.name === "property" && propertyRules.has(node.params)) ||
          (node.name.endsWith("keyframes") && keyframes.has(node.params)) ||
          (node.name === "layer" && !node.nodes)) node.remove();
    });
    output.walkRules((rule) => {
      const isRoot = /:(?:root|host)\b/u.test(rule.selector);
      const isInitial = /^(?:\*|::(?:before|after|backdrop))(?:,\s*(?:\*|::(?:before|after|backdrop)))*$/u.test(rule.selector);
      rule.walkDecls((declaration) => {
        if ((isRoot && rootProperties.has(declaration.prop)) ||
            (isInitial && declaration.prop.startsWith("--tw-") &&
              (propertyRules.has(declaration.prop) || initialProperties.has(declaration.prop)))) {
          declaration.remove();
        }
      });
    });
    const removeEmpty = (node) => {
      for (const child of [...(node.nodes || [])]) {
        removeEmpty(child);
        if (child.nodes && !child.nodes.length) child.remove();
      }
    };
    removeEmpty(output);
    return output.toString();
  };
}
