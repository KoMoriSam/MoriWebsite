export async function readGithubCache(key) {
  try {
    return await (await caches.default.match(key))?.json() || null;
  } catch {
    return null;
  }
}

export async function writeGithubCache(key, value, expiresAt) {
  const ttl = Math.ceil((expiresAt - Date.now()) / 1000);
  if (ttl <= 0) return;
  try {
    await caches.default.put(key, Response.json(value, {
      headers: { "Cache-Control": `public, max-age=${ttl}` },
    }));
  } catch {
    console.warn("github-cache-write-failed");
  }
}

export async function deleteGithubCache(key) {
  try { await caches.default.delete(key); } catch { /* Cache is best effort. */ }
}
