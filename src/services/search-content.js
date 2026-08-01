import fm from "front-matter";

import {
  formatArticleTag,
  normalizeArticleDate,
  normalizeArticleTag,
} from "@/composables/useArticleFilter";
import { useArticleApi } from "@/services/api-articles";
import { useChapterApi } from "@/services/api-chapters";
import { typeText } from "@/utils/type-changelog";
import { createLicenseAnchor } from "@/utils/license-anchor";
import { createMarkdownSearchBlocks } from "@/utils/markdown/search-anchors";
import { splitMarkdown } from "@/utils/markdown/split-markdown";

export const CONTENT_TYPES = [
  {
    value: "blog",
    label: "博客",
    icon: "ri-article-line",
  },
  {
    value: "novel",
    label: "小说",
    icon: "ri-book-open-line",
  },
  {
    value: "changelog",
    label: "更新日志",
    icon: "ri-history-line",
  },
  {
    value: "licenses",
    label: "开源许可",
    icon: "ri-file-shield-2-line",
  },
];

const CONTENT_TYPE_MAP = new Map(
  CONTENT_TYPES.map((type) => [type.value, type]),
);

const FRONTMATTER_LABELS = {
  aliases: "别名",
  author: "作者",
  authors: "作者",
  category: "分类",
  created: "创建时间",
  date: "发布时间",
  description: "描述",
  length: "约",
  modified: "修改时间",
  modifiedDate: "修改时间",
  status: "状态",
  uploadDate: "上传时间",
};

const FRONTMATTER_ICONS = {
  aliases: "ri-links-line",
  author: "ri-user-line",
  authors: "ri-user-line",
  category: "ri-folder-line",
  created: "ri-calendar-event-line",
  date: "ri-calendar-line",
  description: "ri-file-info-line",
  length: "ri-file-text-line",
  modified: "ri-file-edit-line",
  modifiedDate: "ri-file-edit-line",
  status: "ri-checkbox-circle-line",
  uploadDate: "ri-upload-2-line",
};

const INTERNAL_FRONTMATTER_KEYS = new Set([
  "banner",
  "catalogOrder",
  "content",
  "frontmatter",
  "id",
  "path",
  "public",
  "routeCode",
  "summary",
  "tags",
  "title",
  "uuid",
  "volumeOrder",
  "volumeTitle",
]);

const DATE_FRONTMATTER_KEYS = new Set([
  "created",
  "date",
  "modified",
  "modifiedDate",
  "uploadDate",
]);

let blogSearchPromise;
let globalSearchPromise;

const uniqueStrings = (values) => {
  return [
    ...new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  ];
};

const stripMarkdown = (value) => {
  return String(value || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[\[[^\]]+\]\]/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^\s{0,3}(?:#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
    .replace(/[*_~=<>{}\[\]|\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const createLocalMarkdownSearchBlocks = ({
  content,
  baseUrl,
  title,
  paginated = false,
}) => {
  const pages = paginated ? splitMarkdown(content) : [content];

  return pages.flatMap((pageContent, pageIndex) =>
    createMarkdownSearchBlocks(pageContent).map((block) => {
      const sectionTitle = stripMarkdown(block.heading);
      const url = `${baseUrl}${paginated ? `?p=${pageIndex + 1}` : ""}#${block.id}`;

      return {
        url,
        title:
          sectionTitle && sectionTitle !== title
            ? `${title} · ${sectionTitle}`
            : title,
        summary: stripMarkdown(block.content).slice(0, 280),
        content: block.content,
      };
    }),
  );
};

const formatDateTime = (value) => {
  const text = String(value || "").trim();
  if (!text) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return text;

  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("/");

  if (!/[T\s]\d{1,2}:\d{2}/.test(text)) return datePart;

  return `${datePart} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
};

const formatFrontmatterValue = (key, value) => {
  if (DATE_FRONTMATTER_KEYS.has(key)) return formatDateTime(value);

  if (key === "length") {
    const length = Number(value);
    return Number.isFinite(length)
      ? `${length.toLocaleString("zh-CN")} 字`
      : String(value || "").trim();
  }

  if (Array.isArray(value)) {
    return uniqueStrings(value).join("、");
  }

  if (typeof value === "boolean") return value ? "是" : "否";
  if (value && typeof value === "object") return "";

  return String(value ?? "").trim();
};

export const createMarkdownMetadata = (
  frontmatter = {},
  preferredKeys = [],
) => {
  if (!frontmatter || typeof frontmatter !== "object") return [];

  const keys = [
    ...preferredKeys,
    ...Object.keys(frontmatter).filter((key) => !preferredKeys.includes(key)),
  ];

  return keys
    .filter((key, index) => keys.indexOf(key) === index)
    .filter((key) => !INTERNAL_FRONTMATTER_KEYS.has(key))
    .map((key) => {
      const value = formatFrontmatterValue(key, frontmatter[key]);

      if (!value) return null;

      return {
        key,
        label: FRONTMATTER_LABELS[key] || key,
        value,
        icon: FRONTMATTER_ICONS[key] || "ri-information-line",
      };
    })
    .filter(Boolean);
};

const createFilterTag = (
  contentType,
  rawValue,
  { label = "", groupPath = "", order = Number.MAX_SAFE_INTEGER } = {},
) => {
  const value = normalizeArticleTag(rawValue);
  if (!value) return null;

  return {
    key: `${contentType}:${value}`,
    value,
    label: label || formatArticleTag(value),
    contentType,
    groupPath: normalizeArticleTag(groupPath),
    order,
  };
};

const metadataSearchText = (metadata) => {
  return (Array.isArray(metadata) ? metadata : [])
    .flatMap((item) => [item?.label, item?.value])
    .filter(Boolean)
    .join(" ");
};

const createBlogMetadata = (frontmatter) => {
  const searchableMetadata = createMarkdownMetadata(frontmatter, [
    "date",
    "created",
    "modified",
    "length",
    "aliases",
  ]);

  return {
    metadata: searchableMetadata.filter(
      (item) => !["created", "modified", "aliases"].includes(item.key),
    ),
    metadataText: metadataSearchText(searchableMetadata),
  };
};

export const createSearchExcerpt = (
  content,
  keyword,
  fallback = "",
  maxLength = 110,
) => {
  const plainContent = stripMarkdown(content);
  const fallbackText = stripMarkdown(fallback);

  if (!plainContent) return fallbackText;

  const normalizedContent = plainContent.normalize("NFKC").toLocaleLowerCase();
  const terms = String(keyword || "")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const positions = terms
    .map((term) => normalizedContent.indexOf(term))
    .filter((position) => position >= 0);
  const matchPosition = positions.length ? Math.min(...positions) : -1;

  if (matchPosition < 0) {
    return fallbackText || plainContent.slice(0, maxLength);
  }

  const start = Math.max(0, matchPosition - Math.floor(maxLength * 0.35));
  const end = Math.min(plainContent.length, start + maxLength);

  return `${start > 0 ? "…" : ""}${plainContent.slice(start, end)}${
    end < plainContent.length ? "…" : ""
  }`;
};

const withType = (entry, type) => {
  const definition = CONTENT_TYPE_MAP.get(type) || CONTENT_TYPE_MAP.get("blog");

  return {
    ...entry,
    type: definition.value,
    typeLabel: definition.label,
    typeIcon: definition.icon,
  };
};

export const fetchBlogSearchArticles = async () => {
  if (blogSearchPromise) return blogSearchPromise;

  blogSearchPromise = (async () => {
    const { fetchArticleList, fetchArticleDocument } = useArticleApi();
    const articles = await fetchArticleList();

    return Promise.all(
      articles.map(async (article) => {
        try {
          const document = article?.path
            ? await fetchArticleDocument(article.path)
            : { attributes: {}, content: "" };
          const frontmatter = {
            ...article,
            ...document.attributes,
          };
          const { metadata, metadataText } = createBlogMetadata(frontmatter);

          return {
            ...article,
            content: document.content,
            frontmatter,
            metadata,
            metadataText,
          };
        } catch {
          const frontmatter = { ...article };
          const { metadata, metadataText } = createBlogMetadata(frontmatter);

          return {
            ...article,
            content: "",
            frontmatter,
            metadata,
            metadataText,
          };
        }
      }),
    );
  })();

  try {
    return await blogSearchPromise;
  } catch (error) {
    blogSearchPromise = null;
    throw error;
  }
};

const fetchBlogEntries = async () => {
  const articles = await fetchBlogSearchArticles();

  return articles.map((article, catalogOrder) => {
    const id = String(article?.id || "").trim();
    const date = normalizeArticleDate(article?.date);
    const tags = uniqueStrings(article?.tags)
      .map(normalizeArticleTag)
      .filter(Boolean);
    const filterTags = tags
      .map((tag) => {
        const segments = tag.split("/").filter(Boolean);

        return createFilterTag("blog", tag, {
          label: formatArticleTag(tag),
          groupPath: segments.length > 1 ? segments.slice(0, -1).join("/") : "",
        });
      })
      .filter(Boolean);
    const blogMetadata = createBlogMetadata(article?.frontmatter);
    const metadata = Array.isArray(article?.metadata)
      ? article.metadata
      : blogMetadata.metadata;

    const url = id ? `/blog/${encodeURIComponent(id)}` : "/blog";
    const title = String(article?.title || "未命名文章");

    return withType(
      {
        url,
        title,
        summary: String(article?.summary || ""),
        content: String(article?.content || ""),
        searchBlocks: createLocalMarkdownSearchBlocks({
          content: article?.content,
          baseUrl: url,
          title,
        }),
        tags,
        filterTags,
        metadata,
        metadataText: article?.metadataText ?? blogMetadata.metadataText,
        date,
        year: date.slice(0, 4),
        catalogOrder,
      },
      "blog",
    );
  });
};

const fetchNovelEntries = async () => {
  const { fetchChapters, fetchContent } = useChapterApi();
  const chaptersByVolume = await fetchChapters();
  let catalogOrder = 0;
  const chapters = Object.values(chaptersByVolume || {}).flatMap(
    (volume, volumeOrder) => {
      const volumeTitle = String(volume?.volumeInfo?.title || "").trim();

      return (Array.isArray(volume?.chapters) ? volume.chapters : []).map(
        (chapter) => ({
          ...chapter,
          volumeTitle,
          volumeOrder,
          catalogOrder: catalogOrder++,
        }),
      );
    },
  );

  return Promise.all(
    chapters.map(async (chapter) => {
      let content = "";
      let frontmatter = { ...chapter };

      try {
        const rawContent = chapter?.path
          ? await fetchContent(chapter.path)
          : "";
        const document = fm(String(rawContent || ""));
        content = document.body;
        frontmatter = {
          ...chapter,
          ...document.attributes,
        };
      } catch {
        content = "";
      }

      const uploadDate = normalizeArticleDate(
        frontmatter?.uploadDate || chapter?.uploadDate,
      );
      const modifiedDate = normalizeArticleDate(
        frontmatter?.modifiedDate || chapter?.modifiedDate,
      );
      const date = modifiedDate || uploadDate;
      const uuid = String(chapter?.uuid || "").trim();
      const volumeTitle = String(chapter?.volumeTitle || "").trim();
      const volumeFacet = createFilterTag("novel", volumeTitle, {
        label: volumeTitle,
        order: chapter.volumeOrder,
      });
      const metadata = createMarkdownMetadata(frontmatter, [
        "uploadDate",
        "modifiedDate",
        "length",
      ]);
      const url = uuid ? `/novel/${encodeURIComponent(uuid)}` : "/novel";
      const title = String(chapter?.title || "未命名章节");

      return withType(
        {
          url,
          title,
          summary: volumeTitle || "《向远方》",
          content,
          searchBlocks: createLocalMarkdownSearchBlocks({
            content,
            baseUrl: url,
            title,
            paginated: true,
          }),
          tags: volumeTitle ? [volumeTitle] : [],
          filterTags: volumeFacet ? [volumeFacet] : [],
          metadata,
          metadataText: metadataSearchText(metadata),
          uploadDate,
          modifiedDate,
          date,
          year: date.slice(0, 4),
          catalogOrder: chapter.catalogOrder,
        },
        "novel",
      );
    }),
  );
};

const fetchChangelogEntries = async () => {
  const response = await fetch("/changelog.json");

  if (!response.ok) {
    throw new Error(`获取更新日志失败: ${response.status}`);
  }

  const changelog = await response.json();

  return Object.entries(changelog || {}).map(
    ([version, item], catalogOrder) => {
      const changeEntries = Object.entries(item?.changes || {});
      const changes = changeEntries.flatMap(([, values]) =>
        Array.isArray(values) ? values : [],
      );
      const changeTypes = changeEntries
        .filter(([, values]) => Array.isArray(values) && values.length)
        .map(([type]) => type);
      const typeLabels = changeTypes.map(typeText);
      const filterTags = changeTypes
        .map((type, index) =>
          createFilterTag("changelog", type, {
            label: typeLabels[index],
          }),
        )
        .filter(Boolean);
      const date = normalizeArticleDate(item?.date);
      const content = [
        version,
        item?.date,
        ...typeLabels,
        ...changes,
        item?.note,
        item?.warning,
      ]
        .filter(Boolean)
        .join(" ");

      return withType(
        {
          url: `/changelog#version-${encodeURIComponent(version)}`,
          title: `${version}`,
          summary: String(changes[0] || item?.note || item?.warning || ""),
          content,
          tags: typeLabels,
          filterTags,
          metadata: [],
          metadataText: "",
          date,
          year: date.slice(0, 4),
          catalogOrder,
        },
        "changelog",
      );
    },
  );
};

const createLicenseSearchEntry = ({
  url,
  title,
  summary,
  content,
  tags = [],
  metadata = [],
  catalogOrder,
}) => {
  const filterTags = tags
    .map((tag) =>
      createFilterTag("licenses", tag, {
        label: tag,
      }),
    )
    .filter(Boolean);

  return withType(
    {
      url,
      title,
      summary,
      content,
      tags,
      filterTags,
      metadata,
      metadataText: metadataSearchText(metadata),
      date: "",
      year: "",
      catalogOrder,
    },
    "licenses",
  );
};

const fetchLicenseEntries = async () => {
  const { default: licenseData } = await import("@/router/license-data");
  const entries = [
    createLicenseSearchEntry({
      url: "/licenses#notices",
      title: "开源许可与第三方声明",
      summary: "第三方库、字体、图标、图片与其他内容的许可范围和权利声明。",
      content: [
        licenseData.noticesMarkdownZh,
        licenseData.noticesMarkdownEn,
      ].join("\n\n"),
      tags: ["第三方声明"],
      catalogOrder: 0,
    }),
    createLicenseSearchEntry({
      url: "/licenses#project-license",
      title: "项目 MIT License",
      summary: "本仓库原创软件源代码适用的 MIT License。",
      content: licenseData.projectLicense,
      tags: ["MIT"],
      catalogOrder: 1,
    }),
  ];

  licenseData.dependencyNotices.forEach((dependency, index) => {
    const declaredLicense = String(
      dependency.declaredLicense || "not declared",
    );
    const metadata = [
      {
        key: "license",
        label: "许可证",
        value: declaredLicense,
        icon: "ri-file-shield-2-line",
      },
    ];
    const licenseText = dependency.licenseFiles
      .flatMap((license) => [license.name, license.text])
      .join("\n\n");

    entries.push(
      createLicenseSearchEntry({
        url: `/licenses#${createLicenseAnchor(
          "dependency",
          dependency.name,
          dependency.version,
        )}`,
        title: `${dependency.name}@${dependency.version}`,
        summary: `${declaredLicense} · ${dependency.source}`,
        content: [
          dependency.name,
          dependency.version,
          declaredLicense,
          dependency.source,
          licenseText,
        ].join("\n"),
        tags: declaredLicense === "not declared" ? [] : [declaredLicense],
        metadata,
        catalogOrder: index + 2,
      }),
    );
  });

  licenseData.supplementalLicenses.forEach((license, index) => {
    entries.push(
      createLicenseSearchEntry({
        url: `/licenses#${createLicenseAnchor(
          "supplemental",
          license.name,
        )}`,
        title: license.name,
        summary: "字体、图标或其他第三方内容的补充许可证文件。",
        content: license.text,
        tags: ["补充许可"],
        catalogOrder: licenseData.dependencyNotices.length + index + 2,
      }),
    );
  });

  return entries;
};

export const fetchGlobalSearchIndex = async () => {
  if (globalSearchPromise) return globalSearchPromise;

  globalSearchPromise = (async () => {
    const sources = await Promise.allSettled([
      fetchBlogEntries(),
      fetchNovelEntries(),
      fetchChangelogEntries(),
      fetchLicenseEntries(),
    ]);
    const entries = sources.flatMap((source) =>
      source.status === "fulfilled" ? source.value : [],
    );

    if (!entries.length) {
      throw new Error("没有可用的检索内容");
    }

    return entries;
  })();

  try {
    return await globalSearchPromise;
  } catch (error) {
    globalSearchPromise = null;
    throw error;
  }
};
