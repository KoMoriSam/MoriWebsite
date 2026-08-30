import markdownSampleSource from "./MarkdownSample.md?raw";

const sampleMarkerPattern = /^<!--\s*sample:(.+?)\s*-->\r?$/gm;

function parseMarkdownSamples(source) {
  const matches = [...source.matchAll(sampleMarkerPattern)];
  const samples = matches.map((match, index) => {
    const descriptor = match[1].trim();
    const separatorIndex = descriptor.indexOf("|");
    const slug = descriptor.slice(0, separatorIndex).trim();
    const name = descriptor.slice(separatorIndex + 1).trim();

    if (separatorIndex < 1 || !name) {
      throw new Error(
        `Markdown sample marker must use "sample:<slug>|<name>": ${match[0]}`,
      );
    }

    return {
      slug,
      name,
      content: source
        .slice(
          match.index + match[0].length,
          matches[index + 1]?.index ?? source.length,
        )
        .trim(),
    };
  });

  const slugs = new Set();
  samples.forEach(({ slug }) => {
    if (slugs.has(slug)) {
      throw new Error(`Duplicate Markdown sample slug: ${slug}`);
    }
    slugs.add(slug);
  });

  return samples;
}

export const MARKDOWN_SAMPLES = parseMarkdownSamples(markdownSampleSource);
