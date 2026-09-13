<template>
  <TestPage section-id="announcement-modal">
    <section aria-labelledby="announcement-summary-test-title">
      <div class="mb-4">
        <h2
          id="announcement-summary-test-title"
          class="font-serif text-xl font-semibold"
        >
          重要公告摘要
        </h2>
        <p class="mt-1 text-sm leading-relaxed text-base-content/65">
          点击任意公告进入详情，再从标题区返回摘要列表；测试过程不会写入已读状态。
        </p>
      </div>

      <button class="btn btn-sm" type="button" @click="openSummary">
        打开重要公告摘要
      </button>
    </section>

    <section class="mt-8" aria-labelledby="announcement-detail-test-title">
      <div class="mb-4">
        <h2
          id="announcement-detail-test-title"
          class="font-serif text-xl font-semibold"
        >
          公告详情
        </h2>
        <p class="mt-1 text-sm leading-relaxed text-base-content/65">
          分别检查 info、warning、error 语义色，以及长正文的独立滚动。
        </p>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <button
          v-for="announcement in detailAnnouncements"
          :key="announcement.id"
          class="btn btn-soft justify-start"
          :class="toneButtonClass[announcement.tone]"
          type="button"
          @click="openDirectDetail(announcement)"
        >
          <i :class="toneIcon[announcement.tone]" aria-hidden="true"></i>
          {{ announcement.title }}
        </button>

        <button
          class="btn btn-soft justify-start"
          type="button"
          @click="openDirectDetail(longAnnouncement)"
        >
          <i class="ri-file-list-3-line" aria-hidden="true"></i>
          长正文滚动
        </button>
      </div>
    </section>

    <AnnouncementModal
      :mode="demoMode"
      :selected-announcement="selectedAnnouncement"
      :summary-announcements="summaryAnnouncements"
      :can-go-back="canGoBack"
      @acknowledge="closeDemo"
      @back="backToSummary"
      @close="closeDemo"
      @open="openSummaryDetail"
    />
  </TestPage>
</template>

<script setup>
import { ref } from "vue";

import AnnouncementModal from "@/components/announcement/Modal.vue";

import TestPage from "./_TestPage.vue";

const createAnnouncement = ({
  id,
  title,
  summary,
  tone,
  priority = "normal",
  pinned = false,
  body,
}) => ({
  id,
  revision: 2,
  title,
  summary,
  tone,
  priority,
  pinned,
  body,
  startsAt: "2026-09-12T10:00:00.000Z",
  endsAt: "2026-09-15T10:00:00.000Z",
  active: true,
});

const detailAnnouncements = [
  createAnnouncement({
    id: "test-announcement-info",
    title: "通知详情",
    summary: "检查普通信息公告的标题、摘要、时间与正文排版。",
    tone: "info",
    pinned: true,
    body: "## 信息公告\n\n这是 **info** 类型的公告正文。\n\n- 第一项内容\n- 第二项内容\n\n[查看站点公告](/announcements)",
  }),
  createAnnouncement({
    id: "test-announcement-warning",
    title: "重要提醒详情",
    summary: "检查重要提醒的双徽标和较长摘要在窄屏中的换行。",
    tone: "warning",
    priority: "important",
    body: "## 提醒公告\n\n请留意这条 **warning** 类型的重要公告。\n\n> 关闭弹窗不会在测试页写入任何已读状态。",
  }),
  createAnnouncement({
    id: "test-announcement-error",
    title: "故障公告详情",
    summary: "检查 error 语义色、重要标记和正文中的表格样式。",
    tone: "error",
    priority: "important",
    body: "## 故障公告\n\n| 项目 | 状态 |\n| --- | --- |\n| 服务 | 暂停 |\n| 恢复时间 | 待定 |",
  }),
];

const summaryAnnouncements = detailAnnouncements.map((announcement) => ({
  ...announcement,
  priority: "important",
}));

const longAnnouncement = createAnnouncement({
  id: "test-announcement-long",
  title: "长正文滚动测试",
  summary: "检查标题固定、正文独立滚动以及弹窗在窄屏和低视口下的高度。",
  tone: "warning",
  priority: "important",
  body: [
    "## 长内容公告",
    "",
    "下面的段落用于检查公告弹窗的滚动区域。",
    "",
    ...Array.from(
      { length: 14 },
      (_, index) =>
        `### 第 ${index + 1} 节\n\n这是第 ${index + 1} 段测试正文，用于观察段落间距、换行和滚动位置。`,
    ),
  ].join("\n\n"),
});

const toneButtonClass = {
  info: "btn-info",
  warning: "btn-warning",
  error: "btn-error",
};

const toneIcon = {
  info: "ri-information-line",
  warning: "ri-alert-line",
  error: "ri-error-warning-line",
};

const demoMode = ref("");
const selectedAnnouncement = ref(null);
const canGoBack = ref(false);

const openSummary = () => {
  selectedAnnouncement.value = null;
  canGoBack.value = false;
  demoMode.value = "summary";
};

const openDirectDetail = (announcement) => {
  selectedAnnouncement.value = announcement;
  canGoBack.value = false;
  demoMode.value = "detail";
};

const openSummaryDetail = (announcement) => {
  selectedAnnouncement.value = announcement;
  canGoBack.value = true;
  demoMode.value = "detail";
};

const backToSummary = () => {
  selectedAnnouncement.value = null;
  canGoBack.value = false;
  demoMode.value = "summary";
};

const closeDemo = () => {
  demoMode.value = "";
  selectedAnnouncement.value = null;
  canGoBack.value = false;
};
</script>
