<template>
  <div>
    <button
      v-if="!inline"
      type="button"
      class="btn btn-ghost btn-square"
      popovertarget="notification-center"
      style="anchor-name: --notification-center-anchor"
      :aria-label="triggerLabel"
    >
      <div class="indicator">
        <span
          v-if="unreadCount"
          class="indicator-item badge badge-error badge-xs min-w-4 px-1 tabular-nums"
          aria-hidden="true"
        >
          {{ unreadCount > 99 ? "99+" : unreadCount }}
        </span>
        <i class="ri-notification-2-line text-xl" aria-hidden="true"></i>
      </div>
    </button>

    <section
      :id="inline ? undefined : 'notification-center'"
      ref="panelRef"
      :popover="inline ? undefined : 'auto'"
      :class="inline ? 'flex min-h-0 flex-1 flex-col' : 'dropdown dropdown-end mt-2 max-h-[min(78dvh,38rem)] w-96 overflow-hidden rounded-box border border-base-300 bg-base-100 p-3 lg:p-0 shadow-xl max-sm:mt-0! max-sm:w-[calc(100vw-1rem)]! max-sm:[inset:3.75rem_0.5rem_auto_auto]! max-sm:[position-area:none]!'"
      :style="inline ? undefined : 'position-anchor: --notification-center-anchor'"
      :aria-labelledby="inline ? undefined : 'notification-center-title'"
      :aria-label="inline ? translate('common.noticeCenter.notifications') : undefined"
      @toggle="handleToggle"
    >
      <header
        :class="inline ? 'mb-2 flex shrink-0 justify-end' : 'flex items-center justify-between gap-3 border-b border-base-300 px-4 py-3 max-lg:gap-2 max-lg:px-0 max-lg:pt-0 max-lg:pb-1.5'"
      >
        <h2
          v-if="!inline"
          id="notification-center-title"
          class="font-serif text-lg font-semibold"
        >
          {{ translate('common.noticeCenter.notifications') }}
        </h2>

        <button
          v-if="unreadCount"
          type="button"
          class="btn btn-ghost btn-xs"
          @click="store.markAllRead()"
        >
          {{ translate('common.modal.markAllAsRead') }}
        </button>
      </header>

      <div
        :class="inline ? 'scrollbar-thin min-h-0 max-h-[min(18rem,max(0px,calc(78dvh-20rem)))] flex-1 overflow-y-auto overscroll-contain' : 'scrollbar-thin max-h-[min(58dvh,29rem)] overflow-y-auto overscroll-contain p-3 max-lg:px-0 max-lg:py-1.5'"
      >
        <div v-if="loading && !loaded" role="status" aria-busy="true">
          <span class="sr-only">{{ translate('common.noticeCenter.loadingAnnouncements') }}</span>
          <ul class="grid gap-2 max-lg:gap-1.5" aria-hidden="true">
            <li
              v-for="index in 3"
              :key="index"
              class="card card-border card-sm w-full"
            >
              <div class="card-body max-lg:gap-1.5 max-lg:p-2">
                <div class="flex items-center gap-2 max-lg:gap-1.5">
                  <span class="skeleton size-2 shrink-0 rounded-full"></span>
                  <span class="skeleton h-4 w-10 rounded-selector"></span>
                  <span class="skeleton h-4 w-1/2"></span>
                </div>
                <div class="space-y-2 max-lg:space-y-1.5">
                  <span class="skeleton block h-3 w-full"></span>
                  <span class="skeleton block h-3 w-4/5"></span>
                </div>
                <div class="card-actions items-center justify-between">
                  <span class="skeleton h-2.5 w-24"></span>
                  <span class="skeleton h-3 w-10"></span>
                </div>
              </div>
            </li>
          </ul>
        </div>

        <div
          v-else-if="error && !loaded"
          class="alert alert-error alert-soft items-start max-lg:gap-2 max-lg:p-2"
          role="alert"
        >
          <i class="ri-error-warning-line" aria-hidden="true"></i>
          <div class="min-w-0">
            <p class="font-semibold">{{ translate('common.noticeCenter.announcementsAreTemporarilyUnavailable') }}</p>
            <p class="mt-0.5 text-xs opacity-80">{{ error }}</p>
            <button
              type="button"
              class="btn btn-sm mt-3 max-lg:mt-2"
              :disabled="loading"
              @click="store.fetchAnnouncements({ force: true })"
            >
              <i class="ri-refresh-line" aria-hidden="true"></i>
              {{ translate('pages.announcements.retry') }}
            </button>
          </div>
        </div>

        <div
          v-else-if="!activeAnnouncements.length"
          class="grid min-h-36 place-items-center text-center text-base-content/55 max-lg:min-h-28"
        >
          <div>
            <i class="ri-notification-off-line text-2xl" aria-hidden="true"></i>
            <p class="mt-2 text-sm">{{ translate('common.noticeCenter.noActiveAnnouncements') }}</p>
          </div>
        </div>

        <ul v-else class="grid gap-2 max-lg:gap-1.5">
          <li
            v-for="announcement in activeAnnouncements"
            :key="`${announcement.id}:${announcement.revision}`"
            role="button"
            class="card card-border card-sm w-full group hover:border-primary/25 hover:bg-primary/5 cursor-pointer"
            @click="openAnnouncement(announcement)"
          >
            <div class="card-body max-lg:gap-1.5 max-lg:p-2">
              <NoticeTitle
                :announcement="announcement"
                :read="store.isRead(announcement)"
                class="card-title"
              />
              <p>
                {{ announcement.summary }}
              </p>
              <div class="card-actions justify-end items-center max-lg:gap-1.5">
                <time
                  :datetime="announcement.startsAt"
                  class="flex-1 text-[0.6875rem] text-base-content/45"
                >
                  {{ formatAnnouncementDate(announcement.startsAt, true, uiLocale) }}
                </time>
                <span
                  class="text-primary group-hover:translate-x-0.25 transition-[translate]"
                >
                  {{ translate('common.modal.view') }}
                  <i class="ri-arrow-right-s-line" aria-hidden="true"></i>
                </span>
              </div>
            </div>
          </li>
        </ul>

        <p
          v-if="error && loaded"
          class="mt-3 text-xs text-warning max-lg:mt-2"
          role="status"
        >
          <i class="ri-error-warning-line" aria-hidden="true"></i>
          {{ translate('pages.announcements.refreshFailedShowingPreviouslyLoadedAnnouncements') }}
        </p>
      </div>

      <footer :class="inline ? 'mt-2 shrink-0' : 'border-t border-base-300 p-2 max-lg:p-0 max-lg:pt-1.5'">
        <RouterLink
          to="/announcements"
          :class="inline ? 'flex min-h-10 items-center gap-2 rounded-field px-2 py-2 text-sm text-base-content/65 transition-colors hover:bg-base-200 hover:text-base-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary' : 'btn btn-ghost btn-sm w-full justify-between'"
          @click="closePanel"
        >
          <i v-if="inline" class="ri-history-line shrink-0" aria-hidden="true"></i>
          <span class="min-w-0 flex-1">{{ translate('common.noticeCenter.viewAllAndPastAnnouncements') }}</span>
          <i class="ri-arrow-right-line shrink-0" aria-hidden="true"></i>
        </RouterLink>
      </footer>
    </section>
  </div>
</template>

<script setup>
import { useLocale } from '@/i18n';
const { t: translate, locale: uiLocale } = useLocale();

import { computed, ref } from "vue";
import { storeToRefs } from "pinia";

import NoticeTitle from "@/components/announcement/display/NoticeTitle.vue";
import { useAnnouncementStore } from "@/stores/announcementStore";
import { formatAnnouncementDate } from "@/utils/announcement/format";

const props = defineProps({ inline: Boolean });
const emit = defineEmits(['navigate']);
const store = useAnnouncementStore();
const { activeAnnouncements, error, loaded, loading, unreadAnnouncements } =
  storeToRefs(store);
const panelRef = ref(null);

const unreadCount = computed(() => unreadAnnouncements.value.length);
const triggerLabel = computed(() =>
  unreadCount.value
    ? translate('common.noticeCenter.openAnnouncementsUnread', { p0: unreadCount.value })
    : translate('common.noticeCenter.openAnnouncements'),
);

const closePanel = () => {
  if (props.inline) emit('navigate');
  else if (panelRef.value?.matches(':popover-open')) panelRef.value.hidePopover();
};

const openAnnouncement = (announcement) => {
  closePanel();
  store.openAnnouncement(announcement);
};

const handleToggle = (event) => {
  if (event.newState === "open") void store.refreshIfStale();
};
</script>
