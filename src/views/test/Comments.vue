<template>
  <PageShell section-id="comments">
    <div
      class="grid min-w-0 gap-5 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start"
    >
      <div class="space-y-3 lg:sticky lg:top-4 lg:max-h-dvh lg:overflow-y-auto">
        <fieldset
          class="fieldset grid-cols-2 gap-3 rounded-box border border-base-300 p-3"
        >
          <legend class="fieldset-legend">预览条件</legend>
          <label class="grid min-w-0 gap-1">
            场景
            <select v-model="scene" class="select select-sm w-full">
              <option v-for="item in scenes" :key="item.label" :value="item">
                {{ item.label }}
              </option>
            </select>
          </label>
          <label class="grid min-w-0 gap-1">
            状态
            <select v-model="settings.status" class="select select-sm w-full">
              <option value="ready">有评论</option>
              <option value="empty">空评论</option>
              <option value="loading">加载中</option>
              <option value="error">加载失败</option>
            </select>
          </label>
          <label class="grid min-w-0 gap-1">
            身份
            <select v-model="settings.identity" class="select select-sm w-full">
              <option value="guest">未登录</option>
              <option value="member">已登录读者</option>
              <option value="owner">站长 / 作者</option>
            </select>
          </label>
          <label class="grid min-w-0 gap-1">
            请求延迟
            <select v-model="settings.delay" class="select select-sm w-full">
              <option :value="0">无</option>
              <option :value="600">0.6 秒</option>
              <option :value="2000">2 秒</option>
            </select>
          </label>
          <label class="col-span-2 grid min-w-0 gap-2">
            预览最大宽度 · {{ width }} px
            <input
              v-model.number="width"
              type="range"
              min="280"
              max="1000"
              step="10"
              class="range range-xs w-full"
            />
          </label>
          <label
            v-for="{ key, label } in switches"
            :key="key"
            class="flex items-center gap-2"
          >
            <input
              v-model="settings[key]"
              type="checkbox"
              class="checkbox checkbox-sm"
            />
            {{ label }}
          </label>
        </fieldset>

        <fieldset class="fieldset gap-3 rounded-box border border-base-300 p-3">
          <legend class="fieldset-legend">首条评论</legend>
          <label class="grid gap-1">
            Markdown 示例
            <select v-model="sampleIndex" class="select select-sm w-full">
              <option
                v-for="(sample, index) in COMMENT_SAMPLES"
                :key="sample.label"
                :value="index"
              >
                {{ sample.label }}
              </option>
            </select>
          </label>
          <label class="grid gap-1">
            Markdown 源文
            <textarea
              v-model="settings.body"
              class="textarea w-full font-mono"
              rows="6"
              maxlength="10000"
            ></textarea>
          </label>
          <button type="button" class="btn btn-sm" @click="resetComments">
            重置模拟评论
          </button>
        </fieldset>
      </div>

      <section class="min-w-0" aria-label="评论区预览">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-sm font-semibold">{{ scene.label }}</h2>
          <button
            v-if="scene.mode === 'dialog'"
            type="button"
            class="btn btn-sm"
            @click="dialogOpen = true"
          >
            打开实际弹窗
          </button>
        </div>

        <div
          v-if="!dialogOpen"
          class="mx-auto w-full min-w-0"
          :style="{ maxWidth: `${width}px` }"
        >
          <ParagraphQuote
            v-if="scene.scope.endsWith('-paragraph')"
            :html="paragraphQuote"
            lang="zh-CN"
            class="mb-4"
          />
          <Thread
            :key="threadKey"
            :scope="scene.scope"
            :target="target"
            :scroll-mode="scene.mode"
            :preview="preview"
            :class="{
              'max-h-[70dvh]': scene.mode === 'dialog',
              'lg:max-h-[70dvh]': scene.mode === 'sidebar',
            }"
          />
        </div>
      </section>
    </div>

    <Modal
      :visible="dialogOpen"
      button-mode="close"
      scroll-content="nested"
      @close="dialogOpen = false"
    >
      <template #title>
        <h3 class="font-serif text-lg font-bold">{{ scene.label }}</h3>
        <ParagraphQuote
          v-if="scene.scope.endsWith('-paragraph')"
          :html="paragraphQuote"
          lang="zh-CN"
        />
      </template>
      <template #description>
        <Thread
          v-if="dialogOpen"
          :key="threadKey"
          :scope="scene.scope"
          :target="target"
          scroll-mode="dialog"
          :preview="preview"
        />
      </template>
    </Modal>
  </PageShell>
</template>

<script setup>
import { computed, ref, shallowRef, watch } from "vue";
import Thread from "@/components/comments/Thread.vue";
import Modal from "@/components/interaction/overlay/Modal.vue";
import ParagraphQuote from "@/components/reader/display/ParagraphQuote.vue";
import PageShell from "./PageShell.vue";
import { COMMENT_SAMPLES } from "./comment-samples";
import { useCommentPreview } from "./useCommentPreview";

const scenes = [
  { label: "文章评论侧栏", scope: "article", mode: "sidebar" },
  { label: "本章说侧栏", scope: "chapter", mode: "sidebar" },
  { label: "本章说弹窗", scope: "chapter", mode: "dialog" },
  { label: "文章段评弹窗", scope: "article-paragraph", mode: "dialog" },
  { label: "小说段评弹窗", scope: "novel-paragraph", mode: "dialog" },
  { label: "书评（正文内）", scope: "book" },
];
const switches = [
  { key: "locked", label: "锁定讨论" },
  { key: "minimized", label: "首条评论隐藏" },
  { key: "edited", label: "编辑记录" },
  { key: "showReplies", label: "显示回复" },
  { key: "showReactions", label: "预置表态" },
  { key: "showMore", label: "评论翻页" },
];
const paragraphQuote =
  "<p>风沿着窗缝钻进房间，<em>纸页响了一声</em>。她没有抬头。</p>";

const { settings, preview, reset } = useCommentPreview();
const scene = shallowRef(scenes[0]);
const width = ref(600);
const dialogOpen = ref(false);
const sampleIndex = ref(0);
const resetCount = ref(0);
const target = computed(() =>
  scene.value.scope.endsWith("-paragraph")
    ? "comment-preview-1"
    : "comment-preview",
);
const threadKey = computed(() => {
  const status = settings.status === "empty" ? "ready" : settings.status;
  return `${scene.value.label}:${status}:${resetCount.value}`;
});

watch(sampleIndex, (index) => {
  settings.body = COMMENT_SAMPLES[index].body;
});
function resetComments() {
  settings.body = COMMENT_SAMPLES[sampleIndex.value].body;
  reset();
  resetCount.value++;
}
</script>
