const inline = {
  bold: ["**", "**"],
  italic: ["_", "_"],
  strike: ["~~", "~~"],
  mention: ["@", ""],
  math: ["$", "$"],
};
const linePrefixes = {
  heading: () => "## ",
  quote: () => "> ",
  bullet: () => "- ",
  ordered: (index) => `${index + 1}. `,
  task: () => "- [ ] ",
};

export function editMarkdown(action, source, start, end) {
  const selected = source.slice(start, end);
  const replace = (text, offset = text.length, length = 0) => ({
    start, end, text, selectionStart: start + offset, selectionEnd: start + offset + length,
  });

  if (Object.hasOwn(inline, action)) {
    const [before, after] = inline[action];
    return replace(before + selected + after, before.length, selected.length);
  }
  if (action === "link" || action === "image") {
    const label = (action === "image" ? "!" : "") + "[" + selected + "]";
    return selected
      ? replace(label + "(https://)", label.length + 1, 8)
      : replace(label + "(https://)", label.length - 1);
  }
  if (Object.hasOwn(linePrefixes, action)) {
    start = source.slice(0, start).lastIndexOf("\n") + 1;
    const prefix = linePrefixes[action];
    const lines = source.slice(start, end).split("\n");
    if (lines.length > 1 && !lines.at(-1)) lines.pop();
    const text = lines.map((line, index) => prefix(index) + line).join("\n");
    return replace(text + (source[end - 1] === "\n" && selected.endsWith("\n") ? "\n" : ""));
  }
  if (action === "code" || action === "codeBlock") {
    const longest = Math.max(0, ...[...selected.matchAll(/`+/g)].map(([run]) => run.length));
    if (action === "code" && !selected.includes("\n")) {
      const fence = "`".repeat(longest + 1);
      const space = longest ? " " : "";
      return replace(fence + space + selected + space + fence, fence.length + space.length, selected.length);
    }
    const fence = "`".repeat(Math.max(3, longest + 1));
    const before = (start && !source.slice(0, start).endsWith("\n") ? "\n\n" : "") + fence + "\n";
    return replace(before + selected + "\n" + fence + "\n", before.length, selected.length);
  }
  const before = start && !source.slice(0, start).endsWith("\n\n") ? "\n\n" : "";
  if (action === "table") {
    const cell = selected.replaceAll("|", "\\|").replace(/\s+/gu, " ");
    return replace(before + `| ${cell} |   |\n| --- | --- |\n|   |   |\n`, before.length + 2, cell.length);
  }
  if (action === "details") {
    const content = selected.split("\n").map((line) => "> " + line).join("\n");
    return replace(before + "> [!NOTE]-\n" + content + "\n", before.length + 13, content.length - 2);
  }
  return null;
}
