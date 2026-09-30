<template>
  <ContentPage :eyebrow="translate('common.sections.siteAnnouncements')" :title="translate('pages.announcements.announcements')">
    <template #meta>
      <span v-if="updatedAt" class="inline-flex items-center gap-1">
        <i class="ri-refresh-line" aria-hidden="true"></i>
        {{ translate('pages.announcements.updated') }} {{ formatAnnouncementDate(updatedAt, true, uiLocale) }}
      </span>
    </template>

    <section
      v-if="error && !loaded"
      class="alert alert-error alert-soft my-8 sm:alert-horizontal"
      role="alert"
    >
      <i class="ri-error-warning-line text-xl" aria-hidden="true"></i>
      <div>
        <h2 class="font-semibold">{{ translate('pages.announcements.announcementsCouldNotBeLoaded') }}</h2>
        <p class="text-sm opacity-80">{{ error }}</p>
      </div>
      <button
        type="button"
        class="btn btn-sm"
        :disabled="loading"
        @click="store.fetchAnnouncements({ force: true })"
      >
        <i class="ri-refresh-line" aria-hidden="true"></i>
        {{ translate('pages.announcements.reload') }}
      </button>
    </section>

    <template v-else>
      <div
        v-if="error"
        class="alert alert-warning alert-soft my-6"
        role="status"
      >
        <i class="ri-error-warning-line" aria-hidden="true"></i>
        <span>{{ translate('pages.announcements.refreshFailedShowingPreviouslyLoadedAnnouncements') }}</span>
        <button
          type="button"
          class="btn btn-sm"
          :disabled="loading"
          @click="store.fetchAnnouncements({ force: true })"
        >
          {{ translate('pages.announcements.retry') }}
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
          <span class="sr-only">{{ translate('pages.announcements.loading') }}{{ group.title }}</span>
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
              <NoticeTitle
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
                  {{ formatAnnouncementDate(announcement.startsAt, true, uiLocale) }}
                </time>
              </NoticeTitle>
            </summary>
            <div
              class="collapse-content border-t border-base-300 px-5 py-5 sm:px-6"
            >
              <Renderer
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
import { useLocale } from '@/i18n';
const { t: translate, locale: uiLocale } = useLocale();

import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";

import NoticeTitle from "@/components/announcement/display/NoticeTitle.vue";
import ContentPage from "@/components/layout/ContentPage.vue";
import Renderer from "@/components/markdown/Renderer.vue";
import { useAnnouncementStore } from "@/stores/announcementStore";
import { formatAnnouncementDate } from "@/utils/announcement/format";

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
    get title() { return translate('pages.announcements.currentAnnouncements'); },
    titleId: "active-announcements-title",
    items: pageActiveAnnouncements.value,
    sectionClass: "my-8",
    emptyIcon: "ri-notification-off-line",
    get emptyText() { return translate('pages.announcements.thereAreNoActiveAnnouncements'); },
    skeletonCount: 3,
    markRead: true,
    forceRead: false,
  },
  {
    key: "history",
    eyebrow: "Archive",
    get title() { return translate('pages.announcements.pastAnnouncements'); },
    titleId: "history-announcements-title",
    items: historyAnnouncements.value,
    sectionClass: "my-12",
    emptyIcon: "ri-archive-line",
    get emptyText() { return translate('pages.announcements.thereAreNoPastAnnouncementsYet'); },
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
