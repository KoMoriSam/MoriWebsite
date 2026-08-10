export const getDirectoryLabel = (title, unit) => {
  const normalizedTitle = String(title || "").trim();
  const numberedLabel = normalizedTitle.match(
    new RegExp(`^第[零〇一二三四五六七八九十百千万两]+${unit}`),
  );

  return numberedLabel?.[0] || normalizedTitle;
};

export const getChapterDisplayTitle = (chapter) =>
  [getDirectoryLabel(chapter?.volumeTitle, "卷"), chapter?.title]
    .filter(Boolean)
    .join(" · ");
