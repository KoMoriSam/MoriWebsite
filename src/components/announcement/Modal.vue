<template>
  <Modal
    :visible="Boolean(mode)"
    :button-mode="buttonMode"
    :button-text="buttonText"
    :variant="summaryRequiresConfirmation ? 'confirm' : 'default'"
    :show-cancel="mode !== 'summary'"
    scroll-content
    :show-back="canGoBack"
    :back-label="translate('common.modal.backToImportantAnnouncements')"
    :on-submit="submit"
    @back="emit('back')"
    @close="emit('close')"
  >
    <template #title>
      <hgroup v-if="mode === 'summary'">
        <h3 class="font-serif text-lg font-bold flex items-center gap-2">
          {{ translate('common.modal.importantAnnouncements') }}
          <span
            v-if="unreadSummaryCount"
            class="badge badge-error badge-sm tabular-nums px-1.25"
          >
            {{ unreadSummaryCount }}
          </span>
        </h3>
        <p class="text-base-content/55 text-xs">{{ translate('common.modal.pleaseTakeNoteOfTheFollowing') }}</p>
      </hgroup>

      <div
        v-else-if="mode === 'detail' && selectedAnnouncement"
        class="flex flex-wrap items-center gap-2"
      >
        <AnnouncementBadges
          :announcement="selectedAnnouncement"
          :read="announcementStore.isRead(selectedAnnouncement)"
        />
      </div>
    </template>

    <template #header-details>
      <div v-if="mode === 'detail' && selectedAnnouncement" class="min-w-0">
        <div class="flex min-w-0 items-center justify-between gap-4">
          <h3 class="min-w-0 flex-1 font-serif text-lg font-bold text-balance">
            {{ selectedAnnouncement.title }}
          </h3>

          <dl
            class="shrink-0 text-right text-xs font-normal text-base-content/50 flex items-center gap-1"
          >
            <div>
              <dt class="sr-only">{{ translate('common.modal.published') }}</dt>
              <dd>
                <time :datetime="selectedAnnouncement.startsAt">
                  {{
                    formatAnnouncementDate(selectedAnnouncement.startsAt, true, uiLocale)
                  }}
                </time>
              </dd>
            </div>
            <div v-if="selectedAnnouncement.endsAt">
              <dt class="sr-only">{{ translate('common.modal.ends') }}</dt>
              <dd>
                {{ translate('common.modal.to') }}
                <time :datetime="selectedAnnouncement.endsAt">
                  {{
                    formatAnnouncementDate(selectedAnnouncement.endsAt, true, uiLocale)
                  }}
                </time>
              </dd>
            </div>
          </dl>
        </div>

        <p
          class="w-full text-sm leading-relaxed font-normal text-base-content/65 text-pretty"
        >
          <span lang="zh-CN">{{ selectedAnnouncement.summary }}</span>
        </p>
      </div>
    </template>

    <template #description>
      <section v-if="mode === 'summary'" :aria-label="translate('common.modal.importantAnnouncementList')">
        <ul class="grid gap-3">
          <li
            v-for="announcement in summaryAnnouncements"
            :key="`${announcement.id}:${announcement.revision}`"
            role="button"
            class="card card-border card-sm w-full group hover:border-primary/25 hover:bg-primary/5 cursor-pointer"
            @click="emit('open', announcement)"
          >
            <div class="card-body">
              <AnnouncementTitle
                :announcement="announcement"
                :read="announcementStore.isRead(announcement)"
                heading-tag="h4"
                class="card-title"
              />
              <div class="card-actions justify-end">
                <p>
                  {{ announcement.summary }}
                </p>
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
      </section>

      <Markdown
        v-else-if="mode === 'detail' && selectedAnnouncement"
        lang="zh-CN"
        :content="selectedAnnouncement.body"
        :content-id="`announcement-${selectedAnnouncement.id}-${selectedAnnouncement.revision}`"
        mode="standard"
        prose-size="sm"
        :manage-route-anchor="false"
        class="max-w-none min-w-0 wrap-break-word"
      />
    </template>
  </Modal>
</template>

<script setup>
import { useLocale } from '@/i18n';
const { t: translate, locale: uiLocale } = useLocale();

import { computed } from "vue";

import AnnouncementBadges from "@/components/announcement/Badges.vue";
import AnnouncementTitle from "@/components/announcement/Title.vue";
import Modal from "@/components/ui/Modal.vue";
import Markdown from "@/components/markdown/Markdown.vue";
import { useAnnouncementStore } from "@/stores/announcementStore";
import { formatAnnouncementDate } from "@/utils/announcements";

const props = defineProps({
  mode: {
    type: String,
    default: "",
    validator: (value) => ["", "summary", "detail"].includes(value),
  },
  selectedAnnouncement: {
    type: Object,
    default: null,
  },
  summaryAnnouncements: {
    type: Array,
    default: () => [],
  },
  canGoBack: {
    type: Boolean,
    default: false,
  },
});

const announcementStore = useAnnouncementStore();

const emit = defineEmits([
  "acknowledge",
  "acknowledge-detail",
  "back",
  "close",
  "open",
]);

const showsAnnouncementDetail = computed(
  () => props.mode === "detail" && Boolean(props.selectedAnnouncement),
);
const buttonMode = computed(() =>
  props.mode === "summary" || showsAnnouncementDetail.value ? "footer" : "none",
);
const buttonText = computed(() =>
  props.mode === "summary"
    ? unreadSummaryCount.value
      ? translate('common.modal.markAllAsRead')
      : translate('common.modal.close')
    : translate('common.modal.gotIt'),
);
const unreadSummaryCount = computed(
  () =>
    props.summaryAnnouncements.filter(
      (announcement) => !announcementStore.isRead(announcement),
    ).length,
);
const summaryRequiresConfirmation = computed(
  () => props.mode === "summary" && unreadSummaryCount.value > 0,
);
const submit = () => {
  if (props.mode === "summary") {
    emit("acknowledge");
    return;
  }

  if (!showsAnnouncementDetail.value) return;
  emit("acknowledge-detail");

  if (props.canGoBack) return false;
};
</script>
