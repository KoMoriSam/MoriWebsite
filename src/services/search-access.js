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

export function segmentPagefindQuery(query) {
  const encode = (value) => `z${Array.from(value, (character) =>
    character.codePointAt(0).toString(16).padStart(6, "0")).join("")}`;
  return query.replace(/[\p{Script=Han}]+/gu, (run) => {
    const characters = Array.from(run);
    if (characters.length === 1) return encode(run);
    return characters.slice(0, -1).map((character, index) => encode(character + characters[index + 1])).join(" ");
  }).replace(/\s+/g, " ").trim();
}
