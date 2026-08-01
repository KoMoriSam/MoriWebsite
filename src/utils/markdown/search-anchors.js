const SEARCH_ANCHOR_PREFIX = "search-content";

const hashContent = (value) => {
  let hash = 2166136261;

  for (const character of String(value || "")) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
};

const headingText = (block) => {
  const firstLine = String(block || "").split("\n", 1)[0];
  const match = firstLine.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/u);
  return match?.[1]?.trim() || "";
};

const splitIntoBlocks = (source) => {
  const lines = String(source || "")
    .replace(/\r\n?/g, "\n")
    .split("\n");
  const blocks = [];
  let current = [];
  let fence = null;
  let inCustomContainer = false;

  const flush = () => {
    const content = current.join("\n").trim();
    if (content) blocks.push(content);
    current = [];
  };

  for (const line of lines) {
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/u);

    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (!fence) {
        fence = { character: marker[0], length: marker.length };
      } else if (
        marker[0] === fence.character &&
        marker.length >= fence.length
      ) {
        fence = null;
      }

      current.push(line);
      continue;
    }

    if (!fence && /^\s*:{3,}/u.test(line)) {
      inCustomContainer = !inCustomContainer;
      current.push(line);
      continue;
    }

    if (!fence && !inCustomContainer && !line.trim()) {
      flush();
      continue;
    }

    if (
      !fence &&
      !inCustomContainer &&
      /^\s{0,3}#{1,6}\s+/u.test(line) &&
      current.length
    ) {
      flush();
    }

    current.push(line);

    if (!fence && !inCustomContainer && /^\s{0,3}#{1,6}\s+/u.test(line)) {
      flush();
    }
  }

  flush();
  return blocks;
};

export const createMarkdownSearchBlocks = (source) => {
  const duplicateCounts = new Map();
  let currentHeading = "";

  return splitIntoBlocks(source).map((content) => {
    const contentHash = hashContent(content);
    const occurrence = (duplicateCounts.get(contentHash) || 0) + 1;
    duplicateCounts.set(contentHash, occurrence);

    const ownHeading = headingText(content);
    if (ownHeading) currentHeading = ownHeading;

    return {
      id: `${SEARCH_ANCHOR_PREFIX}-${contentHash}-${occurrence}`,
      content,
      heading: currentHeading,
    };
  });
};

export const injectMarkdownSearchAnchors = (source) =>
  createMarkdownSearchBlocks(source)
    .map(
      ({ id, content }) =>
        `<div id="${id}" class="scroll-mt-12" aria-hidden="true"></div>\n\n${content}`,
    )
    .join("\n\n");
