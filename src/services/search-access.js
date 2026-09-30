// 同时检查查询和结果读取阶段，退出后不再读取小说片段。
export async function searchPagefindBundle(engine, query, filters, canRead = () => true) {
  if (!engine || !canRead()) return [];
  const response = await engine.search(query, { filters });
  if (!canRead()) return [];
  const results = await Promise.all((response?.results || []).map(async result => {
    if (!canRead()) return null;
    const data = await result.data();
    return canRead() ? { ...result, data: async () => data } : null;
  }));
  return canRead() ? results.filter(Boolean) : [];
}
