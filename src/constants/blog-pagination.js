export const BLOG_PAGE_SIZE = 9;

export const getBlogTotalPages = (articleCount) => {
  const normalizedCount = Math.max(0, Math.trunc(Number(articleCount) || 0));
  return Math.max(1, Math.ceil(normalizedCount / BLOG_PAGE_SIZE));
};

export const getBlogPagePath = (page) => {
  const normalizedPage = Math.max(1, Math.trunc(Number(page) || 1));
  return normalizedPage === 1 ? "/blog" : `/blog/page/${normalizedPage}`;
};

export const getBlogPagePaths = (articleCount) => {
  const totalPages = getBlogTotalPages(articleCount);

  return Array.from(
    { length: Math.max(0, totalPages - 1) },
    (_, index) => getBlogPagePath(index + 2),
  );
};
