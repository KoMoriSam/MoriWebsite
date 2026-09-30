export const normalizeChapterPage = (page) => {
  const value = Number(page);
  return Number.isFinite(value) && value > 0 ? value : 1;
};

export const getChapterRoutePage = (route) =>
  normalizeChapterPage(route?.query?.p ?? route?.query?.page);
