import { computed, ref, toValue, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

const SEARCH_QUERY_KEYS = ["q", "tag", "year"];

export const normalizeArticleTag = (tag) => {
  return String(tag || "")
    .split("/")
    .map((item) => item.trim())
    .filter(Boolean)
    .join("/");
};

export const formatArticleTag = (tag) => {
  return normalizeArticleTag(tag).replaceAll("/", " / ");
};

export const normalizeArticleDate = (value) => {
  const text = String(value || "").trim();

  if (!text) return "";

  const dateMatch = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);

  if (dateMatch) {
    const [, yearText, monthText, dayText] = dateMatch;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const normalizedDate = new Date(Date.UTC(year, month - 1, day));

    if (
      normalizedDate.getUTCFullYear() === year &&
      normalizedDate.getUTCMonth() === month - 1 &&
      normalizedDate.getUTCDate() === day
    ) {
      return [
        String(year).padStart(4, "0"),
        String(month).padStart(2, "0"),
        String(day).padStart(2, "0"),
      ].join("-");
    }

    return "";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) return "";

  return [
    String(parsedDate.getUTCFullYear()).padStart(4, "0"),
    String(parsedDate.getUTCMonth() + 1).padStart(2, "0"),
    String(parsedDate.getUTCDate()).padStart(2, "0"),
  ].join("-");
};

export const normalizeArticleText = (value) => {
  return String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim();
};

const getTagList = (tags) => {
  const values = Array.isArray(tags) ? tags : tags ? [tags] : [];

  return [...new Set(values.map(normalizeArticleTag).filter(Boolean))];
};

const getSearchTerms = (keyword) => {
  return normalizeArticleText(keyword).split(" ").filter(Boolean);
};

const getArticleSearchFields = (article) => {
  const tags = getTagList(article?.tags);

  return {
    title: normalizeArticleText(article?.title),
    tags,
    normalizedTags: tags.map(normalizeArticleText),
    summary: normalizeArticleText(article?.summary),
    content: normalizeArticleText(article?.content),
    metadata: normalizeArticleText(article?.metadataText),
  };
};

export const getArticleSearchScore = (article, keyword) => {
  const query = normalizeArticleText(keyword);
  const terms = getSearchTerms(query);

  if (!terms.length) return 0;

  const fields = getArticleSearchFields(article);
  const searchableText = [
    fields.title,
    ...fields.normalizedTags,
    fields.summary,
    fields.content,
    fields.metadata,
  ].join(" ");

  if (!terms.every((term) => searchableText.includes(term))) {
    return Number.NEGATIVE_INFINITY;
  }

  let score = 0;

  if (fields.title === query) {
    score += 1200;
  } else if (fields.title.startsWith(query)) {
    score += 500;
  } else if (fields.title.includes(query)) {
    score += 300;
  }

  for (const term of terms) {
    if (fields.title.includes(term)) score += 160;

    for (const tag of fields.normalizedTags) {
      if (tag === term) score += 70;
      else if (tag.includes(term)) score += 35;
    }

    if (fields.summary.includes(term)) score += 12;
    if (fields.metadata.includes(term)) score += 8;
    if (fields.content.includes(term)) score += 3;
  }

  return score;
};

const escapeRegExp = (value) => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const splitArticleHighlight = (value, keyword) => {
  const text = String(value || "");
  const terms = [
    ...new Set(
      String(keyword || "")
        .normalize("NFKC")
        .trim()
        .split(/\s+/)
        .filter(Boolean),
    ),
  ].sort((a, b) => b.length - a.length);

  if (!text || !terms.length) {
    return [{ text, match: false }];
  }

  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "giu");

  return text
    .split(pattern)
    .filter(Boolean)
    .map((part) => ({
      text: part,
      match: terms.some(
        (term) => normalizeArticleText(term) === normalizeArticleText(part),
      ),
    }));
};

const getQueryList = (value) => {
  const values = Array.isArray(value) ? value : value ? [value] : [];

  return [
    ...new Set(values.map((item) => String(item).trim()).filter(Boolean)),
  ];
};

const getQueryText = (value) => {
  return Array.isArray(value)
    ? String(value[0] || "").trim()
    : String(value || "").trim();
};

const sameList = (left, right) => {
  return (
    left.length === right.length &&
    left.every((item, index) => item === right[index])
  );
};

const getDateTimestamp = (dateKey) => {
  if (!dateKey) return null;

  const timestamp = Date.parse(`${dateKey}T00:00:00.000Z`);
  return Number.isNaN(timestamp) ? null : timestamp;
};

const compareNewest = (a, b) => {
  if (a.timestamp === null && b.timestamp === null) {
    return a.index - b.index;
  }

  if (a.timestamp === null) return 1;
  if (b.timestamp === null) return -1;

  return b.timestamp - a.timestamp || a.index - b.index;
};

export function useArticleFilter(articles, { syncUrl = true } = {}) {
  const route = useRoute();
  const router = useRouter();

  const keyword = ref(getQueryText(route.query.q));
  const selectedTags = ref(getQueryList(route.query.tag));
  const selectedYears = ref(getQueryList(route.query.year));
  let applyingRouteState = false;
  let urlSyncTimer;

  const buildScopedQuery = () => {
    const query = {};
    const normalizedKeyword = keyword.value.trim();

    if (selectedTags.value.length) query.type = "blog";
    for (const [key, value] of Object.entries(route.query)) {
      if (key === "type" || SEARCH_QUERY_KEYS.includes(key)) continue;
      query[key] = value;
    }
    if (selectedTags.value.length) query.tag = [...selectedTags.value];
    if (selectedYears.value.length) query.year = [...selectedYears.value];
    if (normalizedKeyword) query.q = normalizedKeyword;

    return query;
  };

  const indexedArticles = computed(() => {
    const sourceArticles = toValue(articles);
    const safeArticles = Array.isArray(sourceArticles) ? sourceArticles : [];

    return safeArticles.map((article, index) => {
      const tags = getTagList(article.tags);
      const dateKey = normalizeArticleDate(article.date);

      return {
        article,
        index,
        tags,
        year: dateKey.slice(0, 4),
        timestamp: getDateTimestamp(dateKey),
      };
    });
  });

  const tagCounts = computed(() => {
    const counts = new Map();

    for (const { tags } of indexedArticles.value) {
      for (const tag of tags) {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }

    return counts;
  });

  const allTags = computed(() => {
    return [...tagCounts.value.keys()].sort((a, b) =>
      a.localeCompare(b, "zh-Hans-CN"),
    );
  });

  const yearCounts = computed(() => {
    const counts = new Map();

    for (const { year } of indexedArticles.value) {
      if (year) counts.set(year, (counts.get(year) || 0) + 1);
    }

    return counts;
  });

  const allYears = computed(() => {
    return [...yearCounts.value.keys()].sort((a, b) => b.localeCompare(a));
  });

  const advancedFilterCount = computed(() => {
    return selectedTags.value.length + selectedYears.value.length;
  });

  const hasFilter = computed(() => {
    return (
      normalizeArticleText(keyword.value) !== "" ||
      advancedFilterCount.value > 0
    );
  });

  const filteredArticles = computed(() => {
    const selectedTagSet = new Set(selectedTags.value);
    const selectedYearSet = new Set(selectedYears.value);

    return indexedArticles.value
      .map((indexedArticle) => ({
        ...indexedArticle,
        searchScore: getArticleSearchScore(
          indexedArticle.article,
          keyword.value,
        ),
      }))
      .filter((indexedArticle) => {
        const matchesKeyword =
          indexedArticle.searchScore !== Number.NEGATIVE_INFINITY;
        const matchesTags =
          selectedTagSet.size === 0 ||
          indexedArticle.tags.some((tag) => selectedTagSet.has(tag));
        const matchesYear =
          selectedYearSet.size === 0 ||
          selectedYearSet.has(indexedArticle.year);

        return matchesKeyword && matchesTags && matchesYear;
      })
      .sort((a, b) => {
        return b.searchScore - a.searchScore || compareNewest(a, b);
      })
      .map(({ article }) => article);
  });

  const removeTag = (tag) => {
    selectedTags.value = selectedTags.value.filter((item) => item !== tag);
  };

  const removeYear = (year) => {
    selectedYears.value = selectedYears.value.filter((item) => item !== year);
  };

  const clearKeyword = () => {
    keyword.value = "";
  };

  const resetAdvancedFilter = () => {
    selectedTags.value = [];
    selectedYears.value = [];
  };

  const resetFilter = () => {
    clearKeyword();
    resetAdvancedFilter();
  };

  watch(
    allTags,
    (availableTags) => {
      if (!indexedArticles.value.length) return;

      const availableTagSet = new Set(availableTags);
      const validTags = selectedTags.value.filter((tag) =>
        availableTagSet.has(tag),
      );

      if (!sameList(validTags, selectedTags.value)) {
        selectedTags.value = validTags;
      }
    },
    { immediate: true },
  );

  watch(allYears, (availableYears) => {
    const availableYearSet = new Set(availableYears);
    const validYears = selectedYears.value.filter((year) =>
      availableYearSet.has(year),
    );

    if (!sameList(validYears, selectedYears.value)) {
      selectedYears.value = validYears;
    }
  });

  watch(
    () => [
      route.query.search,
      route.query.q,
      route.query.type,
      route.query.tag,
      route.query.year,
    ],
    () => {
      if (route.query.search === "1") return;

      const nextKeyword = getQueryText(route.query.q);
      const routeTags = getQueryList(route.query.tag);
      const canValidateTags = indexedArticles.value.length > 0;
      const availableTagSet = new Set(allTags.value);
      const nextTags = canValidateTags
        ? routeTags.filter((tag) => availableTagSet.has(tag))
        : routeTags;
      const nextYears = getQueryList(route.query.year);
      const nextTypes = getQueryList(route.query.type);
      const expectedTypes = nextTags.length ? ["blog"] : [];

      applyingRouteState = true;

      if (keyword.value !== nextKeyword) keyword.value = nextKeyword;
      if (!sameList(selectedTags.value, nextTags)) selectedTags.value = nextTags;
      if (!sameList(selectedYears.value, nextYears)) {
        selectedYears.value = nextYears;
      }

      applyingRouteState = false;

      if (
        syncUrl &&
        canValidateTags &&
        (!sameList(nextTypes, expectedTypes) ||
          !sameList(routeTags, nextTags))
      ) {
        router.replace({ query: buildScopedQuery() });
      }
    },
    { immediate: true },
  );

  watch(
    [keyword, selectedTags, selectedYears],
    () => {
      if (!syncUrl || applyingRouteState || typeof window === "undefined") {
        return;
      }

      window.clearTimeout(urlSyncTimer);
      urlSyncTimer = window.setTimeout(() => {
        if (route.query.search === "1") return;
        router.replace({ query: buildScopedQuery() });
      }, 120);
    },
    { deep: true },
  );

  return {
    keyword,
    selectedTags,
    selectedYears,
    tagCounts,
    allTags,
    yearCounts,
    allYears,
    advancedFilterCount,
    hasFilter,
    filteredArticles,
    removeTag,
    removeYear,
    clearKeyword,
    resetAdvancedFilter,
    resetFilter,
  };
}
