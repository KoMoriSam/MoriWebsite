export const collectPageFootnotes = ({ article, getElementPage }) => {
  const definitions = new Map(
    Array.from(article.querySelectorAll(".footnotes .footnote-item[id]")).map(
      (item) => [`#${item.id}`, item],
    ),
  );
  const grouped = {};

  article.querySelectorAll(".footnote-ref a[href^='#fn']").forEach((link) => {
    const definitionId = link.getAttribute("href") || "";
    const definition = definitions.get(definitionId);
    if (!definition) return;
    const page = getElementPage(link.closest(".footnote-ref") || link);
    const notes = (grouped[page] ||= []);
    if (notes.some((note) => note.id === definitionId)) return;

    const clone = definition.cloneNode(true);
    clone
      .querySelectorAll(".footnote-backref, [data-footnote-backref]")
      .forEach((element) => element.remove());
    clone.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"));
    const textBlocks = Array.from(clone.children)
      .map((element) => element.textContent?.trim())
      .filter(Boolean);
    notes.push({
      id: definitionId,
      label: link.textContent?.trim() || String(notes.length + 1),
      text: textBlocks.join("\n") || clone.textContent?.trim() || "",
    });
  });
  return grouped;
};

export const removeFootnotePageBreaks = (article) => {
  const parents = new Set();
  article.querySelectorAll(".mobile-footnote-page-break").forEach((element) => {
    if (element.parentNode) parents.add(element.parentNode);
    element.remove();
  });
  parents.forEach((parent) => parent.normalize?.());
};

export const restoreFootnoteParagraphSplits = (article) => {
  article.querySelectorAll(".mobile-footnote-split-source").forEach((source) => {
    const splitToken = source.dataset.mobileFootnoteSplit;
    let sibling = source.nextElementSibling;
    while (
      splitToken &&
      sibling?.classList.contains("mobile-footnote-continuation") &&
      sibling.dataset.mobileFootnoteSplit === splitToken
    ) {
      const nextSibling = sibling.nextElementSibling;
      while (sibling.firstChild) source.appendChild(sibling.firstChild);
      sibling.remove();
      sibling = nextSibling;
    }
    source.classList.remove(
      "mobile-footnote-split-source",
      "mobile-footnote-split-empty",
    );
    delete source.dataset.mobileFootnoteSplit;
    delete source.dataset.readerFullParagraphText;
    source.normalize?.();
  });
};

export const extractParagraphCommentText = (paragraph) => {
  const clone = paragraph.cloneNode(true);
  clone
    .querySelectorAll(
      ".comment-trigger, .paragraph-comment-count, .footnote-ref, [data-footnote-ref]",
    )
    .forEach((element) => element.remove());
  return clone.textContent || "";
};
