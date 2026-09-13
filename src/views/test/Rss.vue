<template>
  <TestPage section-id="rss">
    <section aria-labelledby="rss-preview-title">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <h2 id="rss-preview-title" class="font-serif text-xl font-semibold">
            当前 RSS 构建产物
          </h2>
          <p class="mt-1 text-sm leading-relaxed text-base-content/65">
            页面直接请求并解析 <code>/rss.xml</code>，不会使用模拟数据。
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            class="btn btn-sm"
            type="button"
            :disabled="loading"
            @click="loadFeed"
          >
            <i class="ri-refresh-line" aria-hidden="true"></i>
            重新读取
          </button>
          <a
            class="btn btn-sm"
            href="/rss.xml"
            target="_blank"
            rel="noopener noreferrer"
          >
            <i class="ri-code-s-slash-line" aria-hidden="true"></i>
            原始 XML
          </a>
        </div>
      </div>

      <div v-if="loading" class="mt-6 grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div class="space-y-3 rounded-box border border-base-300 p-4">
          <div v-for="index in 5" :key="index" class="space-y-2">
            <div class="skeleton h-4 w-3/4"></div>
            <div class="skeleton h-3 w-1/2"></div>
          </div>
        </div>
        <div class="space-y-4 rounded-box border border-base-300 p-6">
          <div class="skeleton h-7 w-2/3"></div>
          <div class="skeleton h-4 w-1/3"></div>
          <div v-for="index in 8" :key="index" class="skeleton h-4 w-full"></div>
        </div>
      </div>

      <div v-else-if="error" role="alert" class="alert alert-error mt-6">
        <i class="ri-error-warning-line" aria-hidden="true"></i>
        <div>
          <h3 class="font-semibold">RSS 加载失败</h3>
          <p class="text-sm">
            {{ error }} 请先运行 <code>pnpm generate:rss</code> 后重试。
          </p>
        </div>
      </div>

      <template v-else-if="feed">
        <div class="mt-6 flex flex-wrap gap-2" aria-label="RSS 频道信息">
          <span class="badge badge-outline gap-1">
            <i class="ri-rss-line" aria-hidden="true"></i>
            {{ feed.title }}
          </span>
          <span class="badge badge-outline">{{ feed.language }}</span>
          <span class="badge badge-outline">{{ feed.items.length }} 篇</span>
          <span class="badge badge-outline">
            更新于 {{ formatDate(feed.lastBuildDate) }}
          </span>
        </div>

        <p class="mt-3 text-sm text-base-content/65">
          {{ feed.description }}
          <a
            class="link link-hover ml-1"
            :href="feed.link"
            target="_blank"
            rel="noopener noreferrer"
          >
            打开频道主页
          </a>
        </p>

        <div class="mt-6 grid min-w-0 gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <nav
            class="min-w-0 self-start rounded-box border border-base-300 bg-base-100 p-2 lg:sticky lg:top-4"
            aria-label="RSS 文章条目"
          >
            <ul class="list max-h-[70vh] overflow-y-auto">
              <li v-for="item in feed.items" :key="item.guid" class="list-row p-0">
                <button
                  class="btn btn-ghost h-auto min-h-0 w-full items-start justify-start px-3 py-2 text-left"
                  :class="{ 'btn-active': item.guid === selectedGuid }"
                  type="button"
                  @click="selectedGuid = item.guid"
                >
                  <span class="min-w-0 whitespace-normal">
                    <span class="block line-clamp-2 font-medium">
                      {{ item.title }}
                    </span>
                    <time
                      class="mt-1 block text-xs font-normal text-base-content/50"
                      :datetime="item.pubDate"
                    >
                      {{ formatDate(item.pubDate) }}
                    </time>
                  </span>
                </button>
              </li>
            </ul>
          </nav>

          <article
            v-if="selectedItem"
            class="card card-border min-w-0 bg-base-100"
          >
            <div class="card-body min-w-0 gap-4 p-4 sm:p-6">
              <header>
                <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <h3 class="card-title font-serif text-2xl">
                    {{ selectedItem.title }}
                  </h3>
                  <a
                    class="btn btn-sm shrink-0"
                    :href="selectedItem.link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    阅读原文
                    <i class="ri-arrow-right-up-line" aria-hidden="true"></i>
                  </a>
                </div>

                <div class="mt-3 flex flex-wrap items-center gap-2 text-sm text-base-content/60">
                  <time :datetime="selectedItem.pubDate">
                    {{ formatDate(selectedItem.pubDate) }}
                  </time>
                  <span aria-hidden="true">·</span>
                  <span>{{ selectedItem.creator || "KoMoriSam" }}</span>
                  <span
                    v-for="category in selectedItem.categories"
                    :key="category"
                    class="badge badge-ghost badge-sm"
                  >
                    {{ category }}
                  </span>
                </div>
                <p class="mt-4 leading-relaxed text-base-content/70">
                  {{ selectedItem.description }}
                </p>
              </header>

              <div class="h-px bg-base-300" aria-hidden="true"></div>

              <div class="prose prose-sm min-w-0 max-w-none">
                <RenderedContent :html="selectedItem.content" />
              </div>
            </div>
          </article>

          <div v-else role="status" class="alert">
            当前 RSS 中没有可预览的文章。
          </div>
        </div>
      </template>
    </section>
  </TestPage>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";

import RenderedContent from "@/components/markdown/RenderedContent.vue";
import { sanitizeMarkdownHtml } from "@/utils/markdown/sanitize-html";

import TestPage from "./_TestPage.vue";

const RSS_CONTENT_NAMESPACE = "http://purl.org/rss/1.0/modules/content/";
const RSS_DC_NAMESPACE = "http://purl.org/dc/elements/1.1/";

const loading = ref(true);
const error = ref("");
const feed = ref(null);
const selectedGuid = ref("");

const selectedItem = computed(
  () =>
    feed.value?.items.find((item) => item.guid === selectedGuid.value) ||
    feed.value?.items[0] ||
    null,
);

const childText = (element, localName, namespace = "") => {
  const child = Array.from(element?.children || []).find(
    (item) =>
      item.localName === localName &&
      (!namespace || item.namespaceURI === namespace),
  );
  return child?.textContent?.trim() || "";
};

const parseFeed = (source) => {
  const documentNode = new DOMParser().parseFromString(
    source,
    "application/xml",
  );
  if (documentNode.querySelector("parsererror")) {
    throw new Error("rss.xml 不是有效的 XML。 ");
  }

  const channel = documentNode.querySelector("channel");
  if (!channel) throw new Error("rss.xml 缺少 channel。");

  const items = Array.from(channel.children)
    .filter((item) => item.localName === "item")
    .map((item) => ({
      title: childText(item, "title"),
      link: childText(item, "link"),
      guid: childText(item, "guid"),
      pubDate: childText(item, "pubDate"),
      creator: childText(item, "creator", RSS_DC_NAMESPACE),
      description: childText(item, "description"),
      categories: Array.from(item.children)
        .filter((child) => child.localName === "category")
        .map((child) => child.textContent?.trim())
        .filter(Boolean),
      content: sanitizeMarkdownHtml(
        childText(item, "encoded", RSS_CONTENT_NAMESPACE),
      ),
    }));

  return {
    title: childText(channel, "title"),
    link: childText(channel, "link"),
    description: childText(channel, "description"),
    language: childText(channel, "language"),
    lastBuildDate: childText(channel, "lastBuildDate"),
    items,
  };
};

const loadFeed = async () => {
  loading.value = true;
  error.value = "";
  try {
    const response = await fetch(`/rss.xml?preview=${Date.now()}`, {
      cache: "no-store",
      headers: { Accept: "application/rss+xml, application/xml, text/xml" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`请求返回 ${response.status}。`);

    const nextFeed = parseFeed(await response.text());
    feed.value = nextFeed;
    if (!nextFeed.items.some((item) => item.guid === selectedGuid.value)) {
      selectedGuid.value = nextFeed.items[0]?.guid || "";
    }
  } catch (loadError) {
    feed.value = null;
    error.value = loadError?.message || "无法读取 rss.xml。";
  } finally {
    loading.value = false;
  }
};

const formatDate = (value) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "未知时间";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

onMounted(loadFeed);
</script>
