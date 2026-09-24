<template>
  <ContentPage eyebrow="Site Announcements" title="站点公告">
    <template #meta>
      <span v-if="updatedAt" class="inline-flex items-center gap-1">
        <i class="ri-refresh-line" aria-hidden="true"></i>
        更新于 {{ formatAnnouncementDate(updatedAt, true) }}
      </span>
    </template>

    <section
      v-if="error && !loaded"
      class="alert alert-error alert-soft my-8 sm:alert-horizontal"
      role="alert"
    >
      <i class="ri-error-warning-line text-xl" aria-hidden="true"></i>
      <div>
        <h2 class="font-semibold">公告暂时没有加载成功</h2>
        <p class="text-sm opacity-80">{{ error }}</p>
      </div>
      <button
        type="button"
        class="btn btn-sm"
        :disabled="loading"
        @click="store.fetchAnnouncements({ force: true })"
      >
        <i class="ri-refresh-line" aria-hidden="true"></i>
        重新加载
      </button>
    </section>

    <template v-else>
      <div
        v-if="error"
        class="alert alert-warning alert-soft my-6"
        role="status"
      >
        <i class="ri-error-warning-line" aria-hidden="true"></i>
        <span>刷新失败，当前显示上次加载的公告。</span>
        <button
          type="button"
          class="btn btn-sm"
          :disabled="loading"
          @click="store.fetchAnnouncements({ force: true })"
        >
          重试
        </button>
      </div>

      <section
        v-for="group in announcementGroups"
        :key="group.key"
        :class="group.sectionClass"
        :aria-labelledby="group.titleId"
      >
        <header class="mb-4 flex items-end justify-between gap-4">
          <hgroup>
            <p class="text-sm text-base-content/55">{{ group.eyebrow }}</p>
            <h2 :id="group.titleId" class="font-serif text-2xl font-semibold">
              {{ group.title }}
            </h2>
          </hgroup>
          <span
            v-if="initialLoading"
            class="skeleton h-6 w-10 rounded-selector"
            aria-hidden="true"
          ></span>
          <span v-else class="badge badge-ghost">{{ group.items.length }}</span>
        </header>

        <div
          v-if="initialLoading"
          class="grid gap-3"
          role="status"
          aria-busy="true"
        >
          <span class="sr-only">正在加载{{ group.title }}</span>
          <div
            v-for="index in group.skeletonCount"
            :key="index"
            class="rounded-box border border-base-300 px-5 py-4"
            aria-hidden="true"
          >
            <div class="flex items-center gap-2">
              <span class="skeleton size-2 shrink-0 rounded-full"></span>
              <span class="skeleton h-4 w-10 rounded-selector"></span>
              <span class="skeleton h-5 w-2/5"></span>
              <span class="skeleton ms-auto hidden h-3 w-28 sm:block"></span>
            </div>
            <div class="mt-3 space-y-2">
              <span class="skeleton block h-3.5 w-full"></span>
              <span class="skeleton block h-3.5 w-4/5"></span>
            </div>
            <span class="skeleton mt-3 block h-3 w-28 sm:hidden"></span>
          </div>
        </div>

        <div
          v-else-if="!group.items.length"
          class="rounded-box border border-base-300 bg-base-200/40 px-6 py-14 text-center"
        >
          <i
            :class="[group.emptyIcon, 'text-3xl text-base-content/40']"
            aria-hidden="true"
          ></i>
          <p class="mt-3 text-sm text-base-content/60">
            {{ group.emptyText }}
          </p>
        </div>

        <div v-else class="grid gap-3">
          <details
            v-for="announcement in group.items"
            :key="`${announcement.id}:${announcement.revision}`"
            class="collapse collapse-arrow border border-base-300 bg-base-100"
            @toggle="
              handleAnnouncementToggle($event, announcement, group.markRead)
            "
          >
            <summary class="collapse-title">
              <AnnouncementTitle
                :announcement="announcement"
                :read="group.forceRead || store.isRead(announcement)"
                show-time
              >
                <p
                  class="mt-1 text-sm leading-relaxed font-normal text-base-content/60"
                >
                  {{ announcement.summary }}
                </p>
                <time
                  :datetime="announcement.startsAt"
                  class="sm:hidden text-xs font-normal text-base-content/45"
                >
                  {{ formatAnnouncementDate(announcement.startsAt, true) }}
                </time>
              </AnnouncementTitle>
            </summary>
            <div
              class="collapse-content border-t border-base-300 px-5 py-5 sm:px-6"
            >
              <Markdown
                :content="announcement.body"
                :content-id="`announcement-${announcement.id}-${announcement.revision}`"
                mode="standard"
                prose-size="sm"
                :manage-route-anchor="false"
                class="max-w-none min-w-0 wrap-break-word"
              />
            </div>
          </details>
        </div>
      </section>
    </template>
  </ContentPage>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";

import AnnouncementTitle from "@/components/announcement/Title.vue";
import ContentPage from "@/components/layout/ContentPage.vue";
import Markdown from "@/components/markdown/Markdown.vue";
import { useAnnouncementStore } from "@/stores/announcementStore";
import { formatAnnouncementDate } from "@/utils/announcements";

const store = useAnnouncementStore();
const {
  activeAnnouncements,
  error,
  historyAnnouncements,
  items,
  loaded,
  loading,
  updatedAt,
} = storeToRefs(store);
const initialLoading = computed(() => loading.value && !loaded.value);
const pageActiveAnnouncements = ref([]);

watch(
  items,
  () => {
    pageActiveAnnouncements.value = [...activeAnnouncements.value];
  },
  { immediate: true },
);

const announcementGroups = computed(() => [
  {
    key: "active",
    eyebrow: "Active",
    title: "当前公告",
    titleId: "active-announcements-title",
    items: pageActiveAnnouncements.value,
    sectionClass: "my-8",
    emptyIcon: "ri-notification-off-line",
    emptyText: "当前没有有效公告。",
    skeletonCount: 3,
    markRead: true,
    forceRead: false,
  },
  {
    key: "history",
    eyebrow: "Archive",
    title: "历史公告",
    titleId: "history-announcements-title",
    items: historyAnnouncements.value,
    sectionClass: "my-12",
    emptyIcon: "ri-archive-line",
    emptyText: "暂时没有历史公告。",
    skeletonCount: 2,
    markRead: false,
    forceRead: true,
  },
]);

const handleAnnouncementToggle = (event, announcement, markRead) => {
  if (event.currentTarget.open && markRead) store.markRead(announcement);
};

onMounted(() => {
  void store.fetchAnnouncements();
});
</script>
