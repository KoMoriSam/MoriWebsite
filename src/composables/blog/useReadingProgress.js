import { useReadingStateStorage } from '@/composables/storage/useReadingStateStorage';

export function useReadingProgress() {
  const storage = useReadingStateStorage();
  const { getState, setState } = storage;

  const getOptions = (articleId) => {
    const readPosKey = `BLOG_READ_POS:${articleId}`;
    const readContextKey = `BLOG_READ_ARTICLE_ID:${articleId}`;
    const readViewportKey = `${readPosKey}_VIEWPORT`;

    // 旧版只保存最后一篇文章的位置，将它迁移到对应文章，避免串用进度。
    if (getState(readPosKey, null) == null &&
        String(getState('BLOG_READ_ARTICLE_ID', '')) === articleId) {
      setState(readPosKey, getState('BLOG_READ_POS', ''));
      setState(readContextKey, articleId);
      const viewport = getState('BLOG_READ_POS_VIEWPORT', null);
      const matchesArticle = (position) => position?.anchorToken &&
        (!position.contextId || String(position.contextId) === articleId);
      if (matchesArticle(viewport)) {
        setState(readViewportKey, { ...viewport, contextId: articleId });
      } else if (viewport && typeof viewport === 'object') {
        setState(readViewportKey, Object.fromEntries(
          Object.entries(viewport).filter(([, position]) => matchesArticle(position))
            .map(([breakpoint, position]) => [breakpoint, { ...position, contextId: articleId }]),
        ));
      }
    }

    return { storage, readPosKey, readContextKey, readViewportKey };
  };

  const hasProgress = (articleId) => {
    const { readPosKey, readViewportKey } = getOptions(articleId);
    if (getState(readPosKey, '')) return true;
    const viewport = getState(readViewportKey, null);
    return Boolean(viewport?.anchorToken ||
      (viewport && Object.values(viewport).some((position) => position?.anchorToken)));
  };

  return { getOptions, hasProgress };
}
