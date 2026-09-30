<template>
  <footer
    class="footer sm:footer-horizontal bg-base-200 text-base-content p-10"
  >
    <aside>
      <img
        src="/assets/images/titles/welcome.webp"
        :alt="translate('common.sections.welcome')"
        class="h-6"
      />
      <p class="leading-relaxed">
        {{ translate('pages.app.personalBlogIndependentDevelopment') }}
        <br />
        © 2025–2026 KoMoriSam
      </p>
      <small class="text-xs text-base-content/50">
        <router-link class="link link-hover block my-2" to="/changelog">
          {{ translate('pages.changelog.changelog') }}
          <i class="ri-arrow-right-line"></i>
        </router-link>
        <router-link class="link link-hover block my-2" to="/licenses">
          {{ translate('pages.licenses.licensesThirdPartyNotices') }}
          <i class="ri-arrow-right-line"></i>
        </router-link>
      </small>
    </aside>
    <nav v-if="analyticsAvailable" aria-labelledby="site-statistics-title">
      <h6 id="site-statistics-title" class="footer-title">{{ translate('common.footBar.siteStatistics') }}</h6>
      <dl
        class="grid min-w-44 gap-2 text-sm text-base-content/70"
        aria-live="polite"
      >
        <div class="flex items-center justify-between gap-6">
          <dt class="inline-flex items-center gap-1">
            <i class="ri-calendar-check-line" aria-hidden="true"></i>
            {{ translate('common.footBar.visitsToday') }}
          </dt>
          <dd class="font-mono font-semibold tabular-nums text-base-content">
            {{ formatCount(todayVisits) }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-6">
          <dt class="inline-flex items-center gap-1">
            <i class="ri-global-line" aria-hidden="true"></i>
            {{ translate('common.footBar.totalVisits') }}
          </dt>
          <dd class="font-mono font-semibold tabular-nums text-base-content">
            {{ formatCount(totalVisits) }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-6">
          <dt class="inline-flex items-center gap-1">
            <i class="ri-book-open-line" aria-hidden="true"></i>
            {{ translate('common.footBar.totalReads') }}
          </dt>
          <dd class="font-mono font-semibold tabular-nums text-base-content">
            {{ formatCount(totalReads) }}
          </dd>
        </div>
      </dl>
      <small v-if="startedAtLabel" class="mt-1 text-xs text-base-content/50">
        {{ translate('common.footBar.trackedSince') }} {{ startedAtLabel }}
      </small>
      <small
        v-else-if="globalStatus === 'error'"
        class="mt-1 text-xs text-base-content/50"
      >
        {{ translate('common.footBar.statisticsUnavailable') }}
      </small>
    </nav>
    <nav>
      <h6 class="footer-title">{{ translate('common.footBar.socialAccounts') }}</h6>
      <address class="grid grid-flow-col gap-4">
        <a href="https://github.com/KoMoriSam">
          <i class="ri-github-fill text-2xl"></i>
        </a>
        <a href="https://space.bilibili.com/71104942">
          <i class="ri-bilibili-fill text-2xl"></i>
        </a>
        <a href="https://weibo.com/u/5281976456">
          <i class="ri-weibo-fill text-2xl"></i>
        </a>
      </address>
      <br />
      <small class="text-xs text-base-content/50">
        {{ translate('common.footBar.lookingForTheOldWebsite') }}
        <a
          class="link link-primary no-underline hover:underline"
          href="/archive/home/index.html"
          target="_blank"
        >
          {{ translate('common.footBar.visitItHere') }}
          <i class="ri-arrow-right-up-line"></i>
        </a>
      </small>
    </nav>
  </footer>
</template>

<script setup>
import { useLocale } from '@/i18n';
const { t: translate, locale: uiLocale, number: formatNumber } = useLocale();

import { computed } from "vue";
import { storeToRefs } from "pinia";

import { useAnalyticsStore } from "@/stores/analyticsStore";

const analyticsStore = useAnalyticsStore();
const {
  analyticsAvailable,
  globalStatus,
  startedAt,
  todayVisits,
  totalReads,
  totalVisits,
} = storeToRefs(analyticsStore);

const numberFormatter = { format: (value) => formatNumber(value) };

const formatCount = (value) => {
  return Number.isFinite(value) ? numberFormatter.format(value) : "—";
};

const startedAtLabel = computed(() => {
  if (!startedAt.value) return "";

  const date = new Date(startedAt.value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(uiLocale.value, {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(date);
});
</script>
