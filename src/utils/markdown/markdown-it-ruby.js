import MarkdownItRuby from "markdown-it-ruby";

export function rubyPlugin(md, options = {}) {
  md.use(MarkdownItRuby, options);

  // 上游在找到 | 前会跳过 }，可能将相邻 span 的属性吞进注音。
  md.inline.ruler.before("ddmd_ruby", "ruby_boundary", (state, silent) => {
    if (silent || state.src[state.pos] !== "{") return false;

    for (let pos = state.pos + 1; pos < state.posMax; pos += 1) {
      // 与上游保持相同的转义判断，保留注音内的转义字符行为。
      if (state.src[pos - 1] === "\\") continue;
      if (state.src[pos] === "|") return false;
      if (state.src[pos] === "}") {
        state.pending += "{";
        state.pos += 1;
        return true;
      }
    }

    return false;
  });
}
