<template>
  <footer
    data-site-footer
    class="footer sm:footer-horizontal bg-base-200 text-base-content p-10"
  >
    <nav v-if="analyticsAvailable">
      <h6 class="footer-title">{{ translate("common.footer.statistics") }}</h6>
      <dl
        aria-live="polite"
        class="w-full flex items-center justify-between gap-6"
      >
        <dt class="inline-flex items-center gap-1">
          <i class="ri-calendar-check-line" aria-hidden="true"></i>
          {{ translate("common.footer.visitsToday") }}
        </dt>
        <dd class="font-mono font-semibold tabular-nums text-base-content">
          {{ formatCount(todayVisits) }}
        </dd>
      </dl>
      <dl
        aria-live="polite"
        class="w-full flex items-center justify-between gap-6"
      >
        <dt class="inline-flex items-center gap-1">
          <i class="ri-global-line" aria-hidden="true"></i>
          {{ translate("common.footer.totalVisits") }}
        </dt>
        <dd class="font-mono font-semibold tabular-nums text-base-content">
          {{ formatCount(totalVisits) }}
        </dd>
      </dl>
      <dl
        aria-live="polite"
        class="w-full flex items-center justify-between gap-6"
      >
        <dt class="inline-flex items-center gap-1">
          <i class="ri-book-open-line" aria-hidden="true"></i>
          {{ translate("common.footer.totalReads") }}
        </dt>
        <dd class="font-mono font-semibold tabular-nums text-base-content">
          {{ formatCount(totalReads) }}
        </dd>
      </dl>
      <small v-if="startedAtLabel" class="mt-1 text-xs text-base-content/50">
        {{ translate("common.footer.trackedSince") }} {{ startedAtLabel }}
      </small>
      <small
        v-else-if="globalStatus === 'error'"
        class="mt-1 text-xs text-base-content/50"
      >
        {{ translate("common.footer.unavailable") }}
      </small>
    </nav>
    <nav>
      <h6 class="footer-title">{{ translate("common.footer.about") }}</h6>
      <router-link class="link link-hover" to="/changelog">
        {{ translate("changelog.title") }}
      </router-link>
      <a
        class="link link-hover"
        href="https://github.com/KoMoriSam/MoriWebsite"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ translate("common.footer.source") }}
        <i class="ri-external-link-line" aria-hidden="true"></i>
      </a>
      <a
        class="link link-hover"
        href="https://github.com/KoMoriSam/MoriWebsite/blob/main/LICENSE"
      >
        {{ translate("licenses.projectLicense") }}
        <i class="ri-external-link-line" aria-hidden="true"></i>
      </a>
      <router-link class="link link-hover" to="/licenses">
        {{ translate("licenses.title") }}
      </router-link>
      <small class="mt-1 text-xs text-base-content/50">
        {{ translate("common.footer.oldSiteHint") }}
        <a
          class="link link-primary link-hover"
          href="/archive/home/index.html"
          target="_blank"
        >
          {{ translate("common.footer.oldSiteLink") }}
          <i class="ri-external-link-line" aria-hidden="true"></i>
        </a>
      </small>
    </nav>
    <nav>
      <h6 class="footer-title">
        {{ translate("common.footer.other") }}
      </h6>
      <a
        id="rss-feed"
        class="link link-hover"
        href="/rss.xml"
        type="application/rss+xml"
      >
        <i class="ri-rss-fill" aria-hidden="true"></i>
        {{ translate("home.rss") }}
      </a>
      <a
        class="link link-hover"
        href="https://github.com/KoMoriSam/MoriWebsite/issues"
        target="_blank"
        rel="noopener noreferrer"
      >
        <i class="ri-bug-line" aria-hidden="true"></i>
        {{ translate("common.footer.issues") }}
        <i class="ri-external-link-line" aria-hidden="true"></i>
      </a>
      <a
        class="link link-hover"
        href="https://github.com/KoMoriSam/MoriWebsite/discussions"
        target="_blank"
        rel="noopener noreferrer"
      >
        <i class="ri-discuss-line" aria-hidden="true"></i>
        {{ translate("common.footer.discussions") }}
        <i class="ri-external-link-line" aria-hidden="true"></i>
      </a>
      <a class="link link-hover" href="mailto:wishwaluo@gmail.com">
        <i class="ri-mail-line" aria-hidden="true"></i>
        {{ translate("common.footer.email") }}
      </a>
    </nav>
  </footer>
  <footer
    class="footer sm:footer-horizontal bg-base-200 text-base-content border-base-300 border-t px-10 py-4"
  >
    <aside class="grid-flow-col items-center">
      <div>
        <img
          v-bind="getImageAttrs('/favicon.webp', '256px')"
          :alt="translate('common.footer.welcome')"
          class="h-8"
        />
      </div>
      <p>
        {{ translate("site.title") }}
        <br />
        © 2025–2026 KoMoriSam
      </p>
    </aside>
    <nav class="md:place-self-center md:justify-self-end">
      <div class="grid grid-flow-col gap-4">
        <a class="hover:text-primary" href="https://github.com/KoMoriSam">
          <i class="ri-github-fill text-2xl"></i>
        </a>
        <a
          class="hover:text-primary"
          href="https://space.bilibili.com/71104942"
        >
          <i class="ri-bilibili-fill text-2xl"></i>
        </a>
        <a class="hover:text-primary" href="https://weibo.com/u/5281976456">
          <i class="ri-weibo-fill text-2xl"></i>
        </a>
      </div>
    </nav>
  </footer>
</template>

<script setup>
import { getImageAttrs } from "@/utils/images/responsive-images";
import { useLocale } from "@/i18n";
import { formatDate, FULL_DATE_OPTIONS } from "@/i18n/format-date.js";
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

  return formatDate(date, uiLocale.value, {
    ...FULL_DATE_OPTIONS,
    timeZone: "Asia/Shanghai",
  });
});
</script>
