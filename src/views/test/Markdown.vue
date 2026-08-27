<template>
  <TestPage section-id="markdown">
    <section title="Markdown 渲染与阅读器样式设置">
      <div role="tablist" aria-label="Markdown 示例" class="tabs tabs-border">
        <button
          v-for="sample in markdownSamples"
          :key="sample.name"
          type="button"
          role="tab"
          class="tab shrink-0 whitespace-nowrap"
          :class="{ 'tab-active': currentSample === sample.name }"
          :aria-selected="currentSample === sample.name"
          @click="currentSample = sample.name"
        >
          {{ sample.name }}
        </button>
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
            :content="markdownContent"
            :header-data="markdownHeaderData"
            :style-configs="readerStore.styleConfigs"
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
    </section>
  </TestPage>
</template>

<script setup>
import { computed, ref } from "vue";
import { useReaderStore } from "@/stores/readerStore";
import Markdown from "@/components/reader/Markdown.vue";
import FormatSetting from "@/components/reader/FormatSetting.vue";
import { useParagraphCommentsStorage } from "@/utils/storage/use-paragraph-comments-storage";

import TestPage from "./_TestPage.vue";
import markdownSampleSource from "./MarkdownSample.md?raw";

const readerStore = useReaderStore();
const { setCount } = useParagraphCommentsStorage();
const testCommentCounts = {
  "markdown-test-1": 3,
  "markdown-test-2": 12,
  "markdown-test-3": 108,
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

function parseMarkdownSamples(source) {
  const matches = [...source.matchAll(/^<!--\s*sample:(.+?)\s*-->\r?$/gm)];

  return matches.map((match, index) => ({
    name: match[1].trim(),
    content: source
      .slice(
        match.index + match[0].length,
        matches[index + 1]?.index ?? source.length,
      )
      .trim(),
  }));
}

const markdownSamples = parseMarkdownSamples(markdownSampleSource);

const currentSample = ref("标题与段落");
const markdownContent = computed(
  () =>
    markdownSamples.find((sample) => sample.name === currentSample.value)
      ?.content || "",
);
const markdownHeaderData = computed(() => ({
  title: `Markdown 渲染测试：${currentSample.value}`,
  uuid: "markdown-test",
  page:
    markdownSamples.findIndex((sample) => sample.name === currentSample.value) +
    1,
  meta: "",
  sourceType: "article",
}));
</script>
