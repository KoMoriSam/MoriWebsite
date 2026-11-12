<template>
  <section
    class="comments-placeholder not-prose flex min-h-0 w-full min-w-0 flex-col gap-6 font-sans motion-reduce:[&_.skeleton]:animate-none"
    aria-hidden="true"
    inert
  >
    <div v-if="novel" class="flex shrink-0 flex-wrap items-center justify-between gap-2">
      <span class="font-serif text-2xl font-bold">{{ t("novel.reader.chapterComments") }}</span>
      <div class="skeleton h-6 w-24 rounded-field"></div>
    </div>

    <div
      class="grid min-h-0 grid-cols-1 content-start gap-6"
      :class="{ 'lg:overflow-y-auto lg:scrollbar-thin': sidebar }"
    >
      <div class="flex flex-wrap items-center gap-2 border-b border-base-300 pb-3 text-sm">
        <div class="flex flex-wrap items-center gap-2">
          <span
            v-for="vote in 2"
            :key="vote"
            class="btn btn-xs rounded-full border-base-300 bg-base-100"
          >
            <span class="skeleton size-3 rounded-sm"></span>
            <span class="skeleton h-3 w-2 rounded-sm"></span>
          </span>
          <span class="btn btn-circle btn-xs border-base-300 bg-base-100">
            <span class="skeleton size-4 rounded-full"></span>
          </span>
        </div>
        <span class="skeleton skeleton-text ms-auto flex items-center gap-1">
          <i class="ri-github-fill"></i>
          {{ t("reader.comments.openGithub") }}
        </span>
      </div>

      <div class="flex min-w-0 flex-col gap-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2 text-sm">
            <span class="skeleton h-3.5 w-16 rounded-sm"></span>
            <span>·</span>
            <span class="skeleton h-3.5 w-16 rounded-sm"></span>
          </div>
          <div class="tabs tabs-box tabs-sm">
            <span
              v-for="order in orders"
              :key="order"
              class="tab whitespace-nowrap"
              :class="{ 'tab-active': order === 'oldest' }"
            >
              <span class="skeleton skeleton-text">{{ t("reader.comments." + order) }}</span>
            </span>
          </div>
        </div>

        <article
          v-for="(lines, index) in commentLines"
          :key="index"
          class="comment-surface card card-border min-w-0 border-base-300 bg-base-100 text-sm"
        >
          <header class="comment-surface-top flex min-w-0 items-center gap-2 border-b border-base-300 bg-base-200/50 px-4 py-2">
            <span class="skeleton size-9 shrink-0 rounded-full"></span>
            <div class="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
              <span class="skeleton h-3.5 w-20 max-w-full rounded-sm"></span>
              <span class="skeleton h-3 w-12 rounded-sm"></span>
            </div>
            <span class="btn btn-ghost btn-square btn-xs">
              <span class="skeleton h-2 w-4 rounded-sm"></span>
            </span>
          </header>
          <div class="px-4 py-4">
            <div v-for="width in lines" :key="width" class="flex h-5 items-center">
              <div class="skeleton h-3 rounded-sm" :class="width"></div>
            </div>
          </div>
          <footer class="mb-3 flex flex-wrap items-center justify-between gap-2 px-4">
            <div class="flex flex-wrap items-center gap-2">
              <span
                v-for="vote in 2"
                :key="vote"
                class="btn btn-xs rounded-full border-base-300 bg-base-100"
              >
                <span class="skeleton size-3 rounded-sm"></span>
                <span class="skeleton h-3 w-2 rounded-sm"></span>
              </span>
              <span class="btn btn-circle btn-xs border-base-300 bg-base-100">
                <span class="skeleton size-4 rounded-full"></span>
              </span>
            </div>
            <span v-if="index" class="skeleton ms-auto h-3 w-14 rounded-sm"></span>
          </footer>
          <div class="comment-surface-bottom border-t border-base-300 bg-(--comment-reply-bg) p-(--comment-inset)">
            <span class="btn btn-sm rounded-inner w-full justify-start border-base-300 bg-base-100 font-normal">
              <span class="skeleton skeleton-text">
                {{ t(moriSession.authenticated ? "reader.comments.reply" : "reader.comments.loginToReply") }}
              </span>
            </span>
          </div>
        </article>
      </div>
    </div>

    <CommentEditor
      v-if="!contentOnly"
      class="shrink-0"
      model-value=""
      loading
      :authenticated="moriSession.authenticated"
      :label="t('reader.comments.post')"
    />
  </section>
</template>

<script setup>
import CommentEditor from "@/components/comments/interaction/CommentEditor.vue";
import { useLocale } from "@/i18n";
import { moriSession } from "@/composables/auth/useMoriAuth";

defineProps({
  novel: Boolean,
  sidebar: Boolean,
  contentOnly: Boolean,
});
const { t } = useLocale();
const orders = ["oldest", "newest", "top"];
const commentLines = [["w-11/12"], ["w-full", "w-10/12", "w-2/3"]];
</script>

<style src="@/assets/comments.css"></style>
