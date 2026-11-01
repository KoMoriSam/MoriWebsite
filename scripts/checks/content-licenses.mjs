import assert from "node:assert/strict";
import { DEFAULT_BLOG_LICENSE, ALL_RIGHTS_RESERVED, normalizeContentLicense, resolveContentLicense } from "../../src/utils/content-license.js";
import { resolveArticleVersion, validateArticleIndex } from "../../src/utils/blog/article-versions.js";
import { createArticleSnapshot } from "../lib/article-snapshot.mjs";
import { createArticleMetadata } from "../../src/utils/ssg/page-data.js";

assert.equal(resolveContentLicense().label, DEFAULT_BLOG_LICENSE);
assert.equal(resolveContentLicense(undefined, ALL_RIGHTS_RESERVED).type, "reserved");
for (const code of ["BY", "BY-SA", "BY-ND", "BY-NC", "BY-NC-SA", "BY-NC-ND"]) {
  const resolved = resolveContentLicense(` cc ${code.toLowerCase()} 4.0 `);
  assert.equal(resolved.label, `CC ${code} 4.0`);
  assert.equal(resolved.url, `https://creativecommons.org/licenses/${code.toLowerCase()}/4.0/`);
}
assert.equal(resolveContentLicense("CC0").label, "CC0 1.0");
assert.equal(resolveContentLicense("All Rights Reserved").type, "reserved");
assert.equal(resolveContentLicense("保留所有权利").label, ALL_RIGHTS_RESERVED);
assert.deepEqual(resolveContentLicense("自定义协议"), { label: "自定义协议", url: "", type: "custom" });
assert.equal(resolveContentLicense("javascript:alert(1)").url, "", "custom license text must never become an unchecked URL");
for (const value of [true, false, [], {}, 42, "", "   "]) assert.throws(() => normalizeContentLicense(value));

const source = {
  id: "fixture", path: "fixture.md", title: "原文", license: "CC BY 4.0",
  translations: {
    en: { title: "English", path: "en/fixture.md", machineTranslated: true, license: "All Rights Reserved" },
    si: { title: "සිංහල", path: "si/fixture.md", machineTranslated: true },
  },
};
validateArticleIndex([source]);
assert.equal(resolveArticleVersion(source, "en").license, "All Rights Reserved");
assert.equal(resolveArticleVersion(source, "si").license, "CC BY 4.0");
assert.equal(resolveArticleVersion({ ...source, translations: { en: source.translations.en } }, "si").license, "All Rights Reserved");
for (const value of [false, {}, " "]) {
  assert.throws(() => validateArticleIndex([{ ...source, license: value }]));
  assert.throws(() => validateArticleIndex([{ ...source, translations: { en: { ...source.translations.en, license: value } } }]));
}
const documents = new Map([
  ["/fixture.md", "---\npublic: true\ntitle: 原文\nlicense: CC BY 4.0\n---\nSource"],
  ["/en/fixture.md", "---\npublic: true\ntitle: English\ntranslationOf: fixture\nlang: en\nmachineTranslated: true\nlicense: All Rights Reserved\n---\nEnglish"],
  ["/si/fixture.md", "---\npublic: true\ntitle: සිංහල\ntranslationOf: fixture\nlang: si\nmachineTranslated: true\n---\nසිංහල"],
]);
const snapshot = await createArticleSnapshot([source], "https://example.invalid", async (url) => new Response(documents.get(new URL(url).pathname)));
const metadata = createArticleMetadata(snapshot);
for (const entry of metadata) {
  assert.equal(entry.article.license, entry.article.lang === "en" ? "All Rights Reserved" : "CC BY 4.0");
}
console.log("检查通过：文章版权协议、协议链接与译文继承。");
