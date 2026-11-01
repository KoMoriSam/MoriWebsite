const stylesheets = new Map();
const themeNames = ['lemonade', 'forest', 'corporate', 'dim'];

function compileThemes(css) {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  const common = [];
  const palettes = Object.fromEntries(themeNames.map(name => [name, []]));
  for (const rule of sheet.cssRules) {
    const name = themeNames.find(name => rule.selectorText?.includes(`[href$="#${name}"]`));
    if (!name) {
      common.push(rule.cssText);
    } else if (rule.style.getPropertyValue('--color-canvas-default')) {
      palettes[name].push(`:root { ${rule.style.cssText} }`);
    } else if (rule.selectorText.endsWith(' main .pagination-loader-container')) {
      palettes[name].push(`main .pagination-loader-container { ${rule.style.cssText} }`);
    }
  }
  return Object.fromEntries(themeNames.map(name => {
    if (!palettes[name].length) throw new Error(`Missing Giscus palette: ${name}`);
    const selected = `${common.join('\n')}\n${palettes[name].join('\n')}`;
    return [name, `data:text/css;charset=utf-8,${encodeURIComponent(selected)}`];
  }));
}

export function loadGiscusStyles(theme) {
  const source = new URL(theme);
  source.hash = '';
  const url = source.href;
  if (!stylesheets.has(url)) {
    const request = fetch(url, {
      credentials: 'omit',
      cache: 'no-cache',
      signal: AbortSignal.timeout(5000),
    }).then(async response => {
      if (!response.ok) throw new Error(`Giscus CSS: ${response.status}`);
      // 转为内存样式后，资源路径仍相对于原来的 CSS 文件。
      const css = (await response.text()).replace(
        /url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]+))\s*\)/gi,
        (match, doubleQuoted, singleQuoted, unquoted) => {
          const resource = doubleQuoted ?? singleQuoted ?? unquoted;
          if (/^(?:[a-z][a-z\d+.-]*:|#)/i.test(resource)) return match;
          return `url(${JSON.stringify(new URL(resource, url).href)})`;
        },
      );
      return { url, entries: compileThemes(css) };
    });
    stylesheets.set(url, request);
    request.catch(() => { stylesheets.delete(url); });
  }
  return stylesheets.get(url);
}

export function resolveGiscusTheme(theme, stylesheet) {
  if (!stylesheet) return theme;
  try {
    const source = new URL(theme);
    const hash = source.hash;
    source.hash = '';
    const entry = stylesheet.entries[hash.slice(1)];
    return source.href === stylesheet.url && entry ? `${entry}${hash}` : theme;
  } catch {
    return theme;
  }
}
