export function sortArticleNavigation(articles, normalizeDate) {
  return articles
    .filter((article) => article?.id != null)
    .map((article) => ({ article, date: normalizeDate(article.date) || null }))
    .sort((left, right) => {
      if (left.date === right.date) return 0;
      if (left.date === null) return 1;
      if (right.date === null) return -1;
      return left.date.localeCompare(right.date);
    })
    .map(({ article }) => article);
}
