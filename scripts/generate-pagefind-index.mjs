import dotenv from "dotenv";
import fm from "front-matter";
import { createIndex } from "pagefind";
import { resolve } from "node:path";

import licenseData from "../src/router/license-data.generated.js";
import ssgData from "../src/router/ssg-data.generated.js";
import { createLicenseAnchor } from "../src/utils/license-anchor.js";
import { createMarkdownSearchBlocks } from "../src/utils/markdown/search-anchors.js";
import { splitMarkdown } from "../src/utils/markdown/split-markdown.js";

dotenv.config({ path: ".env.production" });

const OUTPUT_PATH = resolve("dist", "pagefind");
const NOVEL_BASE = String(process.env.VITE_NOVEL_RAW || "").replace(/\/+$/, "");

const TYPE_META = {
  blog: { label: "博客", icon: "ri-article-line" },
  novel: { label: "小说", icon: "ri-book-open-line" },
  changelog: { label: "更新日志", icon: "ri-history-line" },
  licenses: { label: "开源许可", icon: "ri-file-shield-2-line" },
};

const CHANGE_TYPE_LABELS = {
  feature: "功能",
  fix: "修复",
  improve: "改进",
  performance: "优化",
  refactor: "重构",
};

const uniqueStrings = (values) => [
  ...new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean),
  ),
];

const normalizeTag = (value) =>
  String(value || "")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/");

const normalizeDate = (value) => {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (!match) return "";
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
};

const stripMarkdown = (value) =>
  String(value || "")
    .replace(/```[^\n]*\n([\s\S]*?)```/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[\[.*?\]\]/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^\s{0,3}(?:#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
    .replace(/[*_~=<>{}\[\]|\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const encodeCjkToken = (value) =>
  `z${Array.from(value, (character) =>
    character.codePointAt(0).toString(16).padStart(6, "0"),
  ).join("")}`;

// Pagefind 1.5 的浏览器端会把自定义记录中的中文查询归一化为空串。
// 为每段汉字补充稳定的 ASCII 单字/双字词项，实际匹配仍由 Pagefind 完成。
const createCjkSearchTerms = (value) =>
  [
    ...new Set(
      (String(value || "").match(/[\p{Script=Han}]+/gu) || []).flatMap(
        (run) => {
          const characters = Array.from(run);
          const tokens = characters.map(encodeCjkToken);

          for (let index = 0; index < characters.length - 1; index += 1) {
            tokens.push(encodeCjkToken(characters.slice(index, index + 2).join("")));
          }

          return tokens;
        },
      ),
    ),
  ].join(" ");

const tagFilter = (type, value) => {
  const normalized = normalizeTag(value);
  return normalized ? `${type}:${normalized}` : "";
};

const createRecord = ({
  url,
  title,
  summary = "",
  content = "",
  type,
  tags = [],
  metadata = [],
  date = "",
  catalogOrder = 0,
  searchTitle = title,
  indexContext = true,
}) => {
  const typeMeta = TYPE_META[type];
  const normalizedTags = uniqueStrings(tags);
  const normalizedDate = normalizeDate(date);
  const filters = {
    type: [type],
  };
  const tagFilters = normalizedTags.map((tag) => tagFilter(type, tag)).filter(Boolean);

  if (tagFilters.length) filters.tag = tagFilters;
  if (normalizedDate) filters.year = [normalizedDate.slice(0, 4)];

  return {
    url,
    language: "zh",
    content: (() => {
      const plainContent = stripMarkdown(
      [
        searchTitle,
        summary,
        content,
        indexContext ? normalizedTags.join(" ") : "",
        ...(indexContext
          ? metadata.flatMap((item) => [item.label, item.value])
          : []),
      ]
        .filter(Boolean)
        .join("\n\n"),
      );
      return `${plainContent}\n\n${createCjkSearchTerms(plainContent)}`;
    })(),
    filters,
    meta: {
      title: String(title || "未命名内容"),
      summary: String(summary || ""),
      type,
      typeLabel: typeMeta.label,
      typeIcon: typeMeta.icon,
      tags: JSON.stringify(normalizedTags),
      metadata: JSON.stringify(metadata),
      date: normalizedDate,
      year: normalizedDate.slice(0, 4),
      catalogOrder: String(catalogOrder),
    },
    sort: normalizedDate ? { date: normalizedDate } : undefined,
  };
};

const createMarkdownRecords = ({
  pages,
  urlForBlock,
  title,
  fallbackSummary = "",
  aliases = [],
  ...recordOptions
}) => {
  let globalBlockIndex = 0;
  const records = (Array.isArray(pages) ? pages : [pages]).flatMap(
    (pageContent, pageIndex) => {
      const blocks = createMarkdownSearchBlocks(pageContent);

      return blocks.map((block) => {
        const isFirstBlock = globalBlockIndex === 0;
        globalBlockIndex += 1;

        const blockSummary = stripMarkdown(block.content).slice(0, 280);
        const sectionTitle = stripMarkdown(block.heading);

        return createRecord({
          ...recordOptions,
          url: urlForBlock({ block, page: pageIndex + 1 }),
          title:
            sectionTitle && sectionTitle !== title
              ? `${title} · ${sectionTitle}`
              : title,
          summary: blockSummary || fallbackSummary,
          content: [
            block.content,
            isFirstBlock ? fallbackSummary : "",
            isFirstBlock ? aliases.join("\n") : "",
          ].join("\n\n"),
          searchTitle: isFirstBlock ? title : "",
          indexContext: isFirstBlock,
        });
      });
    },
  );

  if (records.length) return records;

  return [
    createRecord({
      ...recordOptions,
      url: urlForBlock({ block: null, page: 1 }),
      title,
      summary: fallbackSummary,
      content: aliases.join("\n"),
    }),
  ];
};

const blogRecords = (ssgData.articles || []).flatMap((entry, catalogOrder) => {
  const article = entry.article || {};
  const date = normalizeDate(article.date);
  const metadata = [
    { key: "date", label: "发布时间", value: date, icon: "ri-calendar-line" },
    article.length
      ? { key: "length", label: "约", value: `${article.length} 字`, icon: "ri-file-text-line" }
      : null,
  ].filter(Boolean);

  return createMarkdownRecords({
    pages: [entry.content],
    urlForBlock: ({ block }) =>
      block ? `${entry.path}#${block.id}` : entry.path,
    title: article.title || "未命名文章",
    fallbackSummary: article.summary || "",
    aliases: Array.isArray(article.aliases) ? article.aliases : [],
    type: "blog",
    tags: article.tags,
    metadata,
    date,
    catalogOrder,
  });
});

const loadNovelRecords = async () => {
  if (!NOVEL_BASE) throw new Error("缺少 VITE_NOVEL_RAW，无法生成小说 Pagefind 索引");

  let catalogOrder = 0;
  const chapters = Object.values(ssgData.novelChapters || {}).flatMap((volume, volumeOrder) =>
    (Array.isArray(volume?.chapters) ? volume.chapters : []).map((chapter) => ({
      ...chapter,
      volumeTitle: String(volume?.volumeInfo?.title || "").trim(),
      volumeOrder,
      catalogOrder: catalogOrder++,
    })),
  );

  const chapterRecordGroups = await Promise.all(
    chapters.map(async (chapter) => {
      let document = { attributes: {}, body: "" };
      if (chapter.path) {
        const response = await fetch(`${NOVEL_BASE}/${chapter.path}`);
        if (!response.ok) {
          throw new Error(`获取小说章节失败：${chapter.path} (${response.status})`);
        }
        document = fm(await response.text());
      }

      const attributes = { ...chapter, ...document.attributes };
      const uploadDate = normalizeDate(attributes.uploadDate);
      const modifiedDate = normalizeDate(attributes.modifiedDate);
      const date = modifiedDate || uploadDate;
      const metadata = [
        uploadDate
          ? { key: "uploadDate", label: "上传时间", value: uploadDate, icon: "ri-upload-2-line" }
          : null,
        modifiedDate
          ? { key: "modifiedDate", label: "修改时间", value: modifiedDate, icon: "ri-file-edit-line" }
          : null,
        attributes.length
          ? { key: "length", label: "约", value: `${attributes.length} 字`, icon: "ri-file-text-line" }
          : null,
      ].filter(Boolean);

      const baseUrl = chapter.uuid
        ? `/novel/${encodeURIComponent(chapter.uuid)}`
        : "/novel";

      return createMarkdownRecords({
        pages: splitMarkdown(document.body),
        urlForBlock: ({ block, page }) =>
          `${baseUrl}?p=${page}${block ? `#${block.id}` : ""}`,
        title: chapter.title || "未命名章节",
        fallbackSummary: chapter.volumeTitle || "《向远方》",
        type: "novel",
        tags: chapter.volumeTitle ? [chapter.volumeTitle] : [],
        metadata,
        date,
        catalogOrder: chapter.catalogOrder,
      });
    }),
  );

  return chapterRecordGroups.flat();
};

const changelogRecords = Object.entries(ssgData.changelog || {}).map(
  ([version, item], catalogOrder) => {
    const changeEntries = Object.entries(item?.changes || {});
    const changes = changeEntries.flatMap(([, values]) => (Array.isArray(values) ? values : []));
    const tags = changeEntries
      .filter(([, values]) => Array.isArray(values) && values.length)
      .map(([type]) => type);

    return createRecord({
      url: `/changelog#version-${encodeURIComponent(version)}`,
      title: version,
      summary: changes[0] || item?.note || item?.warning || "",
      content: [
        ...tags.map((type) => CHANGE_TYPE_LABELS[type] || "其他"),
        ...changes,
        item?.note,
        item?.warning,
      ].join("\n"),
      type: "changelog",
      tags,
      date: item?.date,
      catalogOrder,
    });
  },
);

const licenseRecords = [
  createRecord({
    url: "/licenses#notices",
    title: "开源许可与第三方声明",
    summary: "第三方库、字体、图标、图片与其他内容的许可范围和权利声明。",
    content: `${licenseData.noticesMarkdownZh}\n\n${licenseData.noticesMarkdownEn}`,
    type: "licenses",
    tags: ["第三方声明"],
    catalogOrder: 0,
  }),
  createRecord({
    url: "/licenses#project-license",
    title: "项目 MIT License",
    summary: "本仓库原创软件源代码适用的 MIT License。",
    content: licenseData.projectLicense,
    type: "licenses",
    tags: ["MIT"],
    catalogOrder: 1,
  }),
];

for (const [index, dependency] of (licenseData.dependencyNotices || []).entries()) {
  const declaredLicense = String(dependency.declaredLicense || "not declared");
  const metadata = [
    {
      key: "license",
      label: "许可证",
      value: declaredLicense,
      icon: "ri-file-shield-2-line",
    },
  ];

  licenseRecords.push(
    createRecord({
      url: `/licenses#${createLicenseAnchor("dependency", dependency.name, dependency.version)}`,
      title: `${dependency.name}@${dependency.version}`,
      summary: `${declaredLicense} · ${dependency.source}`,
      content: (dependency.licenseFiles || [])
        .flatMap((license) => [license.name, license.text])
        .join("\n\n"),
      type: "licenses",
      tags: declaredLicense === "not declared" ? [] : [declaredLicense],
      metadata,
      catalogOrder: index + 2,
    }),
  );
}

for (const [index, license] of (licenseData.supplementalLicenses || []).entries()) {
  licenseRecords.push(
    createRecord({
      url: `/licenses#${createLicenseAnchor("supplemental", license.name)}`,
      title: license.name,
      summary: "字体、图标或其他第三方内容的补充许可证文件。",
      content: license.text,
      type: "licenses",
      tags: ["补充许可"],
      catalogOrder: (licenseData.dependencyNotices || []).length + index + 2,
    }),
  );
}

const novelRecords = await loadNovelRecords();
const records = [...blogRecords, ...novelRecords, ...changelogRecords, ...licenseRecords];
const { index, errors } = await createIndex({ includeCharacters: "@/+-._" });

if (!index || errors.length) {
  throw new Error(`创建 Pagefind 索引失败：${errors.join("；") || "未知错误"}`);
}

for (const record of records) {
  const result = await index.addCustomRecord(record);
  if (result.errors.length) {
    throw new Error(`索引 ${record.url} 失败：${result.errors.join("；")}`);
  }
}

const output = await index.writeFiles({ outputPath: OUTPUT_PATH });
if (output.errors.length) {
  throw new Error(`写入 Pagefind 索引失败：${output.errors.join("；")}`);
}

console.log(
  `Pagefind indexed ${records.length} records: ${blogRecords.length} blog blocks, ${novelRecords.length} novel blocks, ${changelogRecords.length} changelog versions, and ${licenseRecords.length} license notices.`,
);
