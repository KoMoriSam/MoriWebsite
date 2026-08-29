<template>
  <TestPage section-id="markdown">
    <section title="Markdown 渲染与样式测试">
      <div role="tablist" aria-label="Markdown 示例" class="tabs tabs-border">
        <router-link
          v-for="sample in markdownSamples"
          :key="sample.name"
          :to="{
            name: sample.slug,
          }"
          role="tab"
          class="tab shrink-0 whitespace-nowrap"
          :class="{ 'tab-active': currentSample.slug === sample.slug }"
          :aria-selected="currentSample.slug === sample.slug"
        >
          {{ sample.name }}
        </router-link>
      </div>

      <div
        class="grid grid-cols-1 gap-4 xl:grid-cols-[24rem_minmax(0,1fr)_12rem] xl:items-start my-4"
      >
        <aside
          class="min-w-0 xl:sticky xl:top-4 xl:h-[100dvh-5rem] rounded-box border border-base-300 bg-base-100"
          aria-label="阅读排版设置"
        >
          <FormatSetting />
        </aside>

        <section class="min-w-0" aria-label="Markdown 示例预览">
          <Markdown
            ref="markdownPreviewRef"
            :content="markdownContent"
            :header-data="markdownHeaderData"
            :style-configs="readerStore.styleConfigs"
            @pointerdown.capture="handleMarkdownPointerDown"
            @pointermove.capture="handleMarkdownPointerMove"
            @pointerup.capture="handleMarkdownPointerUp"
            @pointercancel.capture="handleMarkdownPointerCancel"
            @contextmenu.capture="handleMarkdownContextMenu"
          />
        </section>

        <aside class="min-w-0 xl:sticky xl:top-4">
          <section class="card card-sm card-border bg-base-100">
            <div class="card-body gap-4">
              <h3 class="card-title text-base">实时联动检查</h3>

              <dl class="grid grid-cols-2 gap-2 text-sm" aria-live="polite">
                <div class="col-span-2 rounded-box border border-base-300 p-2">
                  <dt class="text-xs text-base-content/55">字体类名</dt>
                  <dd class="mt-1 break-all font-mono font-semibold">
                    {{ readerStore.styleConfigs.fontStyle }}
                  </dd>
                </div>
                <div class="rounded-box border border-base-300 p-2">
                  <dt class="text-xs text-base-content/55">字体大小</dt>
                  <dd class="mt-1 font-mono font-semibold">
                    {{ readerStore.styleConfigs.fontSize }}px
                  </dd>
                </div>
                <div class="rounded-box border border-base-300 p-2">
                  <dt class="text-xs text-base-content/55">字间距</dt>
                  <dd class="mt-1 font-mono font-semibold">
                    {{ readerStore.styleConfigs.fontGap }}
                  </dd>
                </div>
                <div class="rounded-box border border-base-300 p-2">
                  <dt class="text-xs text-base-content/55">行间距</dt>
                  <dd class="mt-1 font-mono font-semibold">
                    {{ readerStore.styleConfigs.lineHeight }}
                  </dd>
                </div>
                <div class="rounded-box border border-base-300 p-2">
                  <dt class="text-xs text-base-content/55">段间距</dt>
                  <dd class="mt-1 font-mono font-semibold">
                    {{ readerStore.styleConfigs.paraHeight }}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          <fieldset
            class="fieldset mt-4 rounded-box border border-base-300 bg-base-100 p-3"
          >
            <legend class="fieldset-legend">段评测试</legend>
            <button class="btn btn-sm" type="button" @click="seedCommentCounts">
              模拟段评计数
            </button>
            <button
              class="btn btn-sm btn-ghost"
              type="button"
              @click="clearCommentCounts"
            >
              清除模拟计数
            </button>
          </fieldset>
        </aside>
      </div>

      <TextContextMenu
        v-model="textContextOpen"
        :context="textContext"
        :share-meta="shareMeta"
        @search="openContextSearch"
      />
    </section>
  </TestPage>
</template>

<script setup>
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useReaderStore } from "@/stores/readerStore";
import { useReaderTextContext } from "@/composables/novel/useReaderTextContext";
import Markdown from "@/components/reader/Markdown.vue";
import FormatSetting from "@/components/reader/FormatSetting.vue";
import TextContextMenu from "@/components/reader/TextContextMenu.vue";
import { useParagraphCommentsStorage } from "@/utils/storage/use-paragraph-comments-storage";

import TestPage from "./_TestPage.vue";
import markdownSampleSource from "./MarkdownSample.md?raw";

const readerStore = useReaderStore();
const route = useRoute();
const router = useRouter();
const { setCount } = useParagraphCommentsStorage();
const markdownPreviewRef = ref(null);
const textContextOpen = ref(false);
const textContext = ref({});
const testCommentCounts = {
  "markdown-test-1": 3,
  "markdown-test-2": 12,
  "markdown-test-3": 108,
  "markdown-test-4": 25,
  "markdown-test-5": 64,
  "markdown-test-6": 99,
};

function updateCommentCounts(counts) {
  Object.entries(counts).forEach(([paragraphId, count]) => {
    setCount(paragraphId, count, "article");
    document.dispatchEvent(
      new CustomEvent("paragraph-comment-metadata", {
        detail: {
          paragraphId,
          sourceType: "article",
          totalCommentCount: count,
        },
      }),
    );
  });
}

function seedCommentCounts() {
  updateCommentCounts(testCommentCounts);
}

function clearCommentCounts() {
  updateCommentCounts(
    Object.fromEntries(Object.keys(testCommentCounts).map((id) => [id, 0])),
  );
}

const markdownSampleSlugs = {
  标题与段落: "headings-paragraphs",
  行内与扩展: "inline-extensions",
  列表与复选框: "lists-tasks",
  链接与媒体: "links-media",
  表格: "tables",
  代码块: "code-blocks",
  提示与折叠: "alerts-details",
  脚注与锚点: "footnotes-anchors",
  数学公式: "math",
  Mermaid: "mermaid",
  "原生 HTML": "native-html",
  社交媒体容器: "chat-moment",
  "XSS 注入": "xss-inject",
  边界情况: "edge-cases",
};

function parseMarkdownSamples(source) {
  const matches = [...source.matchAll(/^<!--\s*sample:(.+?)\s*-->\r?$/gm)];

  return matches.map((match, index) => {
    const name = match[1].trim();

    return {
      name,
      slug: markdownSampleSlugs[name] || name,
      content: source
        .slice(
          match.index + match[0].length,
          matches[index + 1]?.index ?? source.length,
        )
        .trim(),
    };
  });
}

const markdownSamples = parseMarkdownSamples(markdownSampleSource);

const currentSample = computed(
  () =>
    markdownSamples.find(
      (sample) =>
        sample.slug === route.name || sample.slug === route.params.sample,
    ) || markdownSamples[0],
);
const markdownContent = computed(() => currentSample.value?.content || "");
const markdownHeaderData = computed(() => ({
  title: `Markdown 渲染测试：${currentSample.value?.name || ""}`,
  uuid: "markdown-test",
  page: markdownSamples.indexOf(currentSample.value) + 1,
  meta: "",
  sourceType: "article",
}));
const shareMeta = computed(() => ({
  sourceLabel: "远方之森 · Markdown 测试",
  title: markdownHeaderData.value.title,
  detail: "Markdown 组件上下文菜单测试",
  path: route.path,
}));

function openTextContextMenu(context) {
  if (!context) {
    textContextOpen.value = false;
    textContext.value = {};
    return;
  }

  textContext.value = context;
  textContextOpen.value = true;
}

const {
  handleContextMenu: handleMarkdownContextMenu,
  handlePointerCancel: handleMarkdownPointerCancel,
  handlePointerDown: handleMarkdownPointerDown,
  handlePointerMove: handleMarkdownPointerMove,
  handlePointerUp: handleMarkdownPointerUp,
} = useReaderTextContext({
  getRoot: () => markdownPreviewRef.value,
  emit: (_eventName, context) => openTextContextMenu(context),
});

function openContextSearch(keyword) {
  void router.replace({
    query: {
      ...route.query,
      search: "1",
      q: String(keyword || "").trim() || undefined,
    },
  });
}
</script>
