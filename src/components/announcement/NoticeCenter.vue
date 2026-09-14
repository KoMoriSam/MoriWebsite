<template>
  <div>
    <button
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
      id="notification-center"
      ref="panelRef"
      popover="auto"
      class="dropdown dropdown-end mt-2 max-h-[min(78dvh,38rem)] w-96 overflow-hidden rounded-box border border-base-300 bg-base-100 p-0 shadow-xl max-sm:mt-0! max-sm:w-[calc(100vw-1rem)]! max-sm:[inset:3.75rem_0.5rem_auto_auto]! max-sm:[position-area:none]!"
      style="position-anchor: --notification-center-anchor"
      aria-labelledby="notification-center-title"
      @toggle="handleToggle"
    >
      <header
        class="flex items-center justify-between gap-3 border-b border-base-300 px-4 py-3"
      >
        <h2
          id="notification-center-title"
          class="font-serif text-lg font-semibold"
        >
          通知中心
        </h2>

        <button
          v-if="unreadCount"
          type="button"
          class="btn btn-ghost btn-xs"
          @click="store.markAllRead()"
        >
          全部已读
        </button>
      </header>

      <div
        class="scrollbar-thin max-h-[min(58dvh,29rem)] overflow-y-auto overscroll-contain p-3"
      >
        <div v-if="loading && !loaded" role="status" aria-busy="true">
          <span class="sr-only">正在加载公告</span>
          <ul class="grid gap-2" aria-hidden="true">
            <li
              v-for="index in 3"
              :key="index"
              class="card card-border card-sm w-full"
            >
              <div class="card-body">
                <div class="flex items-center gap-2">
                  <span class="skeleton size-2 shrink-0 rounded-full"></span>
                  <span class="skeleton h-4 w-10 rounded-selector"></span>
                  <span class="skeleton h-4 w-1/2"></span>
                </div>
                <div class="space-y-2">
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
          class="alert alert-error alert-soft items-start"
          role="alert"
        >
          <i class="ri-error-warning-line" aria-hidden="true"></i>
          <div class="min-w-0">
            <p class="font-semibold">公告暂时无法加载</p>
            <p class="mt-0.5 text-xs opacity-80">{{ error }}</p>
            <button
              type="button"
              class="btn btn-sm mt-3"
              :disabled="loading"
              @click="store.fetchAnnouncements({ force: true })"
            >
              <i class="ri-refresh-line" aria-hidden="true"></i>
              重试
            </button>
          </div>
        </div>

        <div
          v-else-if="!activeAnnouncements.length"
          class="grid min-h-36 place-items-center text-center text-base-content/55"
        >
          <div>
            <i class="ri-notification-off-line text-2xl" aria-hidden="true"></i>
            <p class="mt-2 text-sm">当前没有有效公告</p>
          </div>
        </div>

        <ul v-else class="grid gap-2">
          <li
            v-for="announcement in activeAnnouncements"
            :key="`${announcement.id}:${announcement.revision}`"
            role="button"
            class="card card-border card-sm w-full group hover:border-primary/25 hover:bg-primary/5 cursor-pointer"
            @click="openAnnouncement(announcement)"
          >
            <div class="card-body">
              <AnnouncementTitle
                :announcement="announcement"
                :read="store.isRead(announcement)"
                class="card-title"
              />
              <p>
                {{ announcement.summary }}
              </p>
              <div class="card-actions justify-end items-center">
                <time
                  :datetime="announcement.startsAt"
                  class="flex-1 text-[0.6875rem] text-base-content/45"
                >
                  {{ formatAnnouncementDate(announcement.startsAt, true) }}
                </time>
                <span
                  class="text-primary group-hover:translate-x-0.25 transition-[translate]"
                >
                  查看
                  <i class="ri-arrow-right-s-line" aria-hidden="true"></i>
                </span>
              </div>
            </div>
          </li>
        </ul>

        <p
          v-if="error && loaded"
          class="mt-3 text-xs text-warning"
          role="status"
        >
          <i class="ri-error-warning-line" aria-hidden="true"></i>
          刷新失败，当前显示上次加载的公告。
        </p>
      </div>

      <footer class="border-t border-base-300 p-2">
        <RouterLink
          to="/announcements"
          class="btn btn-ghost btn-sm w-full justify-between"
          @click="closePanel"
        >
          查看全部与历史公告
          <i class="ri-arrow-right-line" aria-hidden="true"></i>
        </RouterLink>
      </footer>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";

import AnnouncementTitle from "@/components/announcement/Title.vue";
import { useAnnouncementStore } from "@/stores/announcementStore";
import { formatAnnouncementDate } from "@/utils/announcements";

const store = useAnnouncementStore();
const { activeAnnouncements, error, loaded, loading, unreadAnnouncements } =
  storeToRefs(store);
const panelRef = ref(null);

const unreadCount = computed(() => unreadAnnouncements.value.length);
const triggerLabel = computed(() =>
  unreadCount.value
    ? `打开站点公告，有 ${unreadCount.value} 条未读`
    : "打开站点公告",
);

const closePanel = () => panelRef.value?.hidePopover?.();

const openAnnouncement = (announcement) => {
  closePanel();
  store.openAnnouncement(announcement);
};

const handleToggle = (event) => {
  if (event.newState === "open") void store.refreshIfStale();
};
</script>
