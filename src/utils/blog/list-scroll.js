const positions = new Map();
const storagePrefix = 'mori:blog:list-scroll:';

const listKey = (route) => route.fullPath.split('#')[0];
const isPosition = (value) => value &&
  Number.isFinite(value.left) && value.left >= 0 &&
  Number.isFinite(value.top) && value.top >= 0;

export function rememberBlogListScroll(route, position) {
  if (!route.meta.blogList || !isPosition(position)) return;
  const key = listKey(route);
  positions.set(key, position);
  try {
    window.sessionStorage.setItem(storagePrefix + key, JSON.stringify(position));
  } catch { /* Keep the position in memory when storage is unavailable. */ }
}

export function getBlogListScroll(route) {
  if (!route.meta.blogList) return null;
  const key = listKey(route);
  if (positions.has(key)) return { ...positions.get(key) };
  try {
    const position = JSON.parse(window.sessionStorage.getItem(storagePrefix + key));
    if (isPosition(position)) return position;
  } catch { /* A new list visit starts at the top. */ }
  return null;
}
