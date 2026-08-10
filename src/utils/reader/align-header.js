import { nextTick } from "vue";

export const alignMobileChapterHeaderBlock = async ({
  article,
  lineHeight,
  waitForLayout,
  isCurrent = () => true,
}) => {
  const header = article?.querySelector(":scope > .mobile-chapter-header");
  if (!header) return true;

  header.style.setProperty("--reader-chapter-header-spacing", "0px");
  await nextTick();
  await waitForLayout();
  if (!isCurrent()) return false;

  const safeLineHeight = Math.max(1, Number(lineHeight) || 1);
  const headerHeight = header.getBoundingClientRect().height;
  const alignedHeaderHeight =
    Math.ceil(Math.max(0, headerHeight - 0.5) / safeLineHeight) *
    safeLineHeight;
  const spacing = Math.max(
    safeLineHeight,
    alignedHeaderHeight - headerHeight + safeLineHeight,
  );

  header.style.setProperty("--reader-chapter-header-spacing", `${spacing}px`);
  await nextTick();
  await waitForLayout();
  return isCurrent();
};
