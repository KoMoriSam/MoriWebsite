<template>
  <TestPage section-id="markdown">
    <section title="Markdown 渲染与样式测试">
      <div role="tablist" aria-label="Markdown 示例" class="tabs tabs-border">
        <router-link
          v-for="sample in markdownSamples"
          :key="sample.slug"
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

      <Reader
        toc
        aside
        root-tag="div"
        :show-footer="false"
        page-class=""
        container-class="my-4"
        sticky-top="1rem"
      >
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

        <template #aside>
          <fieldset
            class="fieldset mb-4 rounded-box border border-base-300 bg-base-100 p-3 pb-4"
          >
            <legend class="fieldset-legend p-0">段评测试</legend>
            <div class="flex justify-between gap-2">
              <button
                class="btn btn-sm flex-1"
                type="button"
                @click="seedCommentCounts"
              >
                模拟计数
              </button>
              <button
                class="btn btn-sm btn-ghost flex-1"
                type="button"
                @click="clearCommentCounts"
              >
                清除计数
              </button>
            </div>
          </fieldset>

          <fieldset
            class="fieldset mb-4 rounded-box border border-base-300 bg-base-100"
          >
            <legend class="fieldset-legend mx-3 p-0">排版设置</legend>
            <FormatSetting controls-only />
          </fieldset>
        </template>
      </Reader>

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
import Reader from "@/components/reader/Reader.vue";
import TextContextMenu from "@/components/reader/TextContextMenu.vue";
import { useParagraphCommentsStorage } from "@/utils/storage/use-paragraph-comments-storage";

import TestPage from "./_TestPage.vue";
import { MARKDOWN_SAMPLES as markdownSamples } from "./markdown-samples";

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

const currentSample = computed(
  () =>
    markdownSamples.find((sample) => sample.slug === route.name) ||
    markdownSamples[0],
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
