<template>
  <section
    class="comments-placeholder not-prose flex min-h-0 w-full min-w-0 flex-col gap-4 font-sans motion-reduce:[&_.skeleton]:animate-none"
    :class="{ 'lg:flex-1 lg:[--comment-editor-max-height:40dvh]': sidebar }"
    aria-hidden="true"
    inert
  >
    <div
      v-if="novel"
      class="flex shrink-0 flex-wrap items-center justify-between gap-2"
    >
      <span class="min-w-0 font-serif text-2xl font-bold break-words">{{
        t("novel.reader.chapterComments")
      }}</span>
      <span class="btn btn-info btn-soft btn-xs shrink-0">
        <span class="skeleton skeleton-text">{{
          t("novel.reader.showBookComments")
        }}</span>
      </span>
    </div>

    <div v-if="part !== 'list'" class="grid min-w-0 shrink-0 gap-6">
      <div
        class="flex flex-wrap items-center gap-2 border-b border-base-300 pb-3 text-sm"
      >
        <div class="flex flex-wrap items-center gap-2">
          <span class="btn btn-xs btn-circle border-base-300 bg-base-100">
            <span class="skeleton size-4 rounded-full"></span>
          </span>
          <span
            v-for="vote in 2"
            :key="vote"
            class="btn btn-xs rounded-full border-base-300 bg-base-100"
          >
            <span class="skeleton size-3 rounded-sm"></span>
            <span class="skeleton h-3 w-2 rounded-sm"></span>
          </span>
        </div>
        <span class="skeleton skeleton-text ms-auto">
          <i class="ri-github-fill"></i>
          {{ t("comments.openGithub") }}
          <i class="ri-external-link-line"></i>
        </span>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-wrap items-center gap-x-2 text-sm font-semibold">
          <span class="skeleton h-3.5 w-16 rounded-sm"></span>
          <span>·</span>
          <span class="skeleton h-3.5 w-16 rounded-sm"></span>
        </div>
        <div class="tabs tabs-box tabs-sm">
          <span
            v-for="order in orders"
            :key="order"
            class="tab whitespace-nowrap"
            :class="{ 'tab-active': order === defaultCommentSort }"
          >
            <span class="skeleton skeleton-text">{{
              t("comments.sort." + order)
            }}</span>
          </span>
        </div>
      </div>
    </div>
    <component
      v-if="part !== 'header'"
      :is="sidebar ? ScrollableContainer : 'div'"
      :class="{ 'lg:flex-1': sidebar }"
    >
      <div
        class="flex min-h-0 min-w-0 flex-col gap-4"
        :class="{
          'lg:flex-1 lg:overflow-x-hidden lg:overflow-y-auto lg:overscroll-y-contain lg:scrollbar-thin':
            sidebar,
        }"
      >
        <article
          v-for="(lines, index) in commentLines"
          :key="index"
          class="comment-surface card card-border min-w-0 shrink-0 border-base-300 bg-base-100 text-sm"
        >
          <header
            class="comment-surface-top flex min-w-0 items-center gap-2 p-2"
          >
            <span class="skeleton size-9 shrink-0 rounded-full"></span>
            <div
              class="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 self-center"
            >
              <span class="skeleton h-3.5 w-20 max-w-full rounded-sm"></span>
              <span class="skeleton h-3 w-12 rounded-sm"></span>
            </div>
            <span class="btn btn-ghost btn-xs btn-square ms-auto">
              <span class="skeleton h-2 w-4 rounded-sm"></span>
            </span>
          </header>
          <div class="px-3 pb-2">
            <div
              v-for="width in lines"
              :key="width"
              class="flex h-5 items-center"
            >
              <div class="skeleton h-3 rounded-sm" :class="width"></div>
            </div>
          </div>
          <footer
            class="flex flex-wrap items-center justify-between gap-2 px-2 pb-2"
          >
            <div class="flex flex-wrap items-center gap-2">
              <span class="btn btn-xs btn-circle border-base-300 bg-base-100">
                <span class="skeleton size-4 rounded-full"></span>
              </span>
              <span
                v-for="vote in 2"
                :key="vote"
                class="btn btn-xs rounded-full border-base-300 bg-base-100"
              >
                <span class="skeleton size-3 rounded-sm"></span>
                <span class="skeleton h-3 w-2 rounded-sm"></span>
              </span>
            </div>
            <span v-if="!index" class="btn btn-ghost btn-xs ms-auto">
              <span class="skeleton h-3 w-14 rounded-sm"></span>
              <span class="skeleton size-3 rounded-sm"></span>
            </span>
          </footer>
          <div
            class="comment-surface-bottom border-t border-base-300 bg-(--comment-reply-bg)"
          >
            <div v-if="!index" class="ms-4 border-s border-base-300">
              <article
                v-for="reply in initialReplyCount"
                :key="reply"
                class="min-w-0"
              >
                <header class="flex min-w-0 items-center gap-2 p-2">
                  <span class="skeleton size-9 shrink-0 rounded-full"></span>
                  <div
                    class="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1"
                  >
                    <span
                      class="skeleton h-3.5 w-20 max-w-full rounded-sm"
                    ></span>
                    <span class="skeleton h-3 w-12 rounded-sm"></span>
                  </div>
                  <span class="btn btn-ghost btn-xs btn-square ms-auto">
                    <span class="skeleton h-2 w-4 rounded-sm"></span>
                  </span>
                </header>
                <div class="px-3 pb-2">
                  <div class="flex h-5 items-center">
                    <span class="skeleton h-3 w-3/4 rounded-sm"></span>
                  </div>
                </div>
                <footer class="flex flex-wrap items-center gap-2 px-3 pb-2">
                  <span
                    class="btn btn-xs btn-circle border-base-300 bg-base-100"
                  >
                    <span class="skeleton size-4 rounded-full"></span>
                  </span>
                  <span
                    v-for="vote in 2"
                    :key="vote"
                    class="btn btn-xs rounded-full border-base-300 bg-base-100"
                  >
                    <span class="skeleton size-3 rounded-sm"></span>
                    <span class="skeleton h-3 w-2 rounded-sm"></span>
                  </span>
                </footer>
              </article>
            </div>
            <div
              class="p-(--comment-inset)"
              :class="{ 'border-t border-base-300': !index }"
            >
              <span class="input input-sm w-full text-base-content/65">
                <span class="skeleton skeleton-text">
                  {{
                    t(
                      authenticated
                        ? "comments.reply"
                        : "comments.loginToReply",
                    )
                  }}
                </span>
              </span>
            </div>
          </div>
        </article>
      </div>
    </component>

    <CommentEditor
      v-if="!part"
      class="shrink-0"
      model-value=""
      loading
      :compact="compactEditor"
      :authenticated="authenticated"
    />
  </section>
</template>

<script setup>
import { computed } from "vue";
import {
  defaultCommentSort,
  initialReplyCount,
} from "@/../shared/discussions.js";
import CommentEditor from "@/components/comments/interaction/CommentEditor.vue";
import ScrollableContainer from "@/components/layout/ScrollableContainer.vue";
import { useLocale } from "@/i18n";
import { moriSession } from "@/composables/auth/useMoriAuth";

const props = defineProps({
  novel: Boolean,
  sidebar: Boolean,
  compactEditor: Boolean,
  part: String,
  authenticated: { type: Boolean, default: undefined },
});
const authenticated = computed(
  () => props.authenticated ?? moriSession.authenticated,
);
const { t } = useLocale();
const orders = ["oldest", "newest", "top"];
const commentLines = [["w-11/12"], ["w-full", "w-10/12", "w-2/3"]];
</script>

<style src="@/assets/comments.css"></style>
