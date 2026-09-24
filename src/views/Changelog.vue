<template>
  <ContentPage eyebrow="Release Notes &amp; Maintenance" title="更新日志">
    <template #meta>
      <template v-if="totalVersions">
        <span class="inline-flex items-center gap-1">
          <i class="ri-git-commit-line"></i>
          当前版本 {{ latestVersion }}
        </span>
        <span class="inline-flex items-center gap-1">
          <i class="ri-git-branch-line"></i>
          {{ totalVersions }} 次版本记录
        </span>
      </template>
    </template>

    <section
      v-if="error && totalVersions"
      class="alert alert-warning alert-soft my-6 sm:alert-horizontal"
      role="status"
    >
      <i class="ri-cloud-off-line text-xl" aria-hidden="true"></i>
      <div class="min-w-0 flex-1">
        <h2 class="font-semibold">暂时没有获取到远端最新记录</h2>
        <p class="text-sm opacity-80">
          当前正在显示随站点发布的静态版本。{{ errorMessage }}
        </p>
      </div>
      <button type="button" class="btn btn-sm" @click="refreshChangelog">
        <span
          v-if="refreshing"
          class="loading loading-spinner loading-xs"
          aria-hidden="true"
        ></span>
        <i v-else class="ri-refresh-line" aria-hidden="true"></i>
        重新加载
      </button>
    </section>

    <div
      v-if="loading && !totalVersions"
      class="space-y-8 py-8"
      aria-hidden="true"
    >
      <div
        class="grid grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-3 md:grid-cols-[10rem_2rem_minmax(0,1fr)] md:gap-4"
      >
        <div class="hidden md:block"></div>
        <div class="skeleton size-8 rounded-full"></div>
        <div class="skeleton h-9 w-32"></div>
      </div>
      <div
        v-for="index in 2"
        :key="index"
        class="grid grid-cols-[1.5rem_minmax(0,1fr)] items-start gap-3 md:grid-cols-[10rem_2rem_minmax(0,1fr)] md:gap-4"
      >
        <div class="hidden space-y-2 pt-4 md:block">
          <div class="skeleton ms-auto h-7 w-20"></div>
          <div class="skeleton ms-auto h-4 w-28"></div>
        </div>
        <div class="skeleton mt-5 size-8 rounded-full"></div>
        <div class="card card-border bg-base-100">
          <div class="card-body gap-4 p-5 sm:p-7">
            <div class="skeleton h-5 w-4/5"></div>
            <div class="skeleton h-4 w-full"></div>
            <div class="skeleton h-4 w-2/3"></div>
            <div class="skeleton h-20 w-full"></div>
          </div>
        </div>
      </div>
    </div>

    <section
      v-else-if="error && !totalVersions"
      class="alert alert-error alert-soft my-8 sm:alert-horizontal"
      role="alert"
    >
      <i class="ri-error-warning-line text-xl" aria-hidden="true"></i>
      <div class="min-w-0 flex-1">
        <h2 class="font-semibold">更新日志暂时没有加载成功</h2>
        <p class="text-sm opacity-80">{{ errorMessage }}</p>
      </div>
      <button type="button" class="btn btn-sm" @click="refreshChangelog">
        <i class="ri-refresh-line" aria-hidden="true"></i>
        重新加载
      </button>
    </section>

    <section
      v-else-if="!totalVersions"
      class="my-8 rounded-box border border-base-300 bg-base-200/40 px-6 py-16 text-center"
    >
      <i
        class="ri-file-history-line text-3xl text-base-content/40"
        aria-hidden="true"
      ></i>
      <h2 class="mt-3 font-serif text-xl font-semibold">暂时没有版本记录</h2>
      <p class="mt-1 text-sm text-base-content/60">
        新的变化会在这里留下痕迹。
      </p>
    </section>

    <div v-else class="min-w-0 space-y-10 py-8">
      <details
        v-for="group in groupedLogs"
        :id="`year-${group.year}`"
        :key="group.year"
        class="collapse group scroll-mt-24 overflow-visible bg-transparent"
        :open="isYearOpen(group.year)"
        @toggle="setYearOpen(group.year, $event.target.open)"
      >
        <summary
          class="collapse-title min-h-0 list-none p-0 [&::-webkit-details-marker]:hidden"
          :aria-controls="`year-releases-${group.year}`"
        >
          <span
            class="grid grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-3 md:grid-cols-[10rem_2rem_minmax(0,1fr)] md:gap-4"
          >
            <span class="hidden text-right md:block">
              <span class="text-xs text-base-content/45">
                {{ group.releases.length }} 个版本
              </span>
            </span>
            <span
              class="flex size-6 items-center justify-center rounded-full border border-base-300 bg-base-200 md:size-8"
              aria-hidden="true"
            >
              <i class="ri-history-line text-sm text-base-content/55"></i>
            </span>
            <span class="flex min-w-0 items-center gap-4">
              <span class="font-serif text-3xl font-semibold">
                {{ group.year }}
              </span>
              <span class="text-sm text-base-content/45 md:hidden">
                {{ group.releases.length }} 个版本
              </span>
              <span class="h-px flex-1 bg-base-300"></span>
              <i
                class="ri-arrow-down-s-line text-xl text-base-content/50 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                aria-hidden="true"
              ></i>
            </span>
          </span>
        </summary>

        <div
          :id="`year-releases-${group.year}`"
          class="collapse-content px-0! pb-0! pt-8!"
        >
          <ol
            class="relative grid gap-6 before:absolute before:inset-y-0 before:left-3 before:w-px before:bg-base-300 md:before:left-48"
          >
            <li
              v-for="release in group.releases"
              :id="`version-${release.version}`"
              :key="release.version"
              class="relative grid scroll-mt-24 grid-cols-[1.5rem_minmax(0,1fr)] items-start gap-3 md:grid-cols-[10rem_2rem_minmax(0,1fr)] md:gap-4"
            >
              <header class="hidden pt-5 text-right md:block">
                <div class="flex items-center justify-end gap-2">
                  <span
                    v-if="release.version === latestVersion"
                    class="badge badge-primary badge-sm"
                  >
                    最新
                  </span>
                  <h3 class="font-serif text-2xl font-bold">
                    {{ release.version }}
                  </h3>
                </div>
                <time
                  :datetime="release.date"
                  class="mt-1 block text-sm text-base-content/55"
                >
                  {{ formatDate(release.date) }}
                </time>
                <p class="mt-1 text-xs text-base-content/40">
                  {{ release.changeCount }} 项变更
                </p>
              </header>

              <div
                class="relative z-1 mt-5 flex size-6 items-center justify-center rounded-full border border-base-300 bg-base-100 md:size-8"
                :class="{
                  'border-primary bg-primary text-primary-content':
                    release.version === latestVersion,
                }"
                aria-hidden="true"
              >
                <i
                  :class="
                    release.version === latestVersion
                      ? 'ri-sparkling-2-fill'
                      : 'ri-checkbox-blank-circle-fill text-[0.4rem] text-base-content/35'
                  "
                ></i>
              </div>

              <article
                class="card card-border min-w-0 bg-base-100 transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-base-content/25 hover:shadow-sm motion-reduce:transform-none motion-reduce:transition-none"
                :class="{
                  'border-primary/40 bg-primary/5':
                    release.version === latestVersion,
                }"
              >
                <div class="card-body gap-0 p-5 sm:p-7">
                  <header
                    class="flex flex-wrap items-start justify-between gap-3 border-b border-base-300 pb-4 md:hidden"
                  >
                    <div class="flex flex-wrap items-center gap-2">
                      <h3 class="font-serif text-2xl font-bold">
                        {{ release.version }}
                      </h3>
                      <span
                        v-if="release.version === latestVersion"
                        class="badge badge-primary badge-sm"
                      >
                        最新
                      </span>
                    </div>
                    <div class="text-right text-xs text-base-content/50">
                      <time :datetime="release.date" class="block">
                        {{ formatDate(release.date) }}
                      </time>
                      <span>{{ release.changeCount }} 项变更</span>
                    </div>
                  </header>

                  <p
                    class="pt-4 md:pt-0 pb-4 text-sm leading-relaxed text-base-content/65 sm:text-base"
                  >
                    {{ release.summary }}
                  </p>

                  <Markdown
                    v-if="release.intro"
                    mode="standard"
                    prose-size="sm"
                    :content="release.intro"
                    :content-id="`changelog-${release.version}-intro`"
                    :manage-route-anchor="false"
                    class="mb-4 max-w-none"
                  />

                  <div
                    class="divide-y divide-base-300 border-t border-base-300"
                  >
                    <section
                      v-for="changeGroup in release.groups"
                      :key="changeGroup.type"
                      class="grid gap-3 py-5 last:pb-0 md:grid-cols-[3rem_minmax(0,1fr)] md:gap-5"
                    >
                      <span
                        class="badge badge-sm font-semibold md:my-2"
                        :class="[
                          { 'badge-soft': release.version !== latestVersion },
                          typeBadgeClass(changeGroup.type),
                        ]"
                      >
                        {{ typeText(changeGroup.type) }}
                      </span>
                      <Markdown
                        mode="standard"
                        prose-size="sm"
                        :content="changeGroup.markdown"
                        :content-id="`changelog-${release.version}-${changeGroup.type}`"
                        :manage-route-anchor="false"
                        class="max-w-none min-w-0"
                      />
                    </section>
                  </div>

                  <div
                    v-if="release.note || release.warning"
                    class="alert alert-soft mt-6 items-start"
                    :class="release.warning ? 'alert-warning' : ''"
                    role="note"
                  >
                    <i
                      :class="
                        release.warning
                          ? 'ri-alert-line'
                          : 'ri-information-line'
                      "
                      aria-hidden="true"
                    ></i>
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-semibold">
                        {{ release.warning ? "升级前请注意" : "版本说明" }}
                      </p>
                      <Markdown
                        mode="standard"
                        prose-size="sm"
                        :content="release.warning || release.note"
                        :content-id="`changelog-${release.version}-notice`"
                        :manage-route-anchor="false"
                        class="mt-1 max-w-none"
                      />
                    </div>
                  </div>
                </div>
              </article>
            </li>
          </ol>
        </div>
      </details>
    </div>
  </ContentPage>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

import ContentPage from "@/components/layout/ContentPage.vue";
import Markdown from "@/components/markdown/Markdown.vue";
import ssgData from "@/router/ssg-data";
import { useChangelogStore } from "@/stores/changelogStore";
import { typeText } from "@/utils/type-changelog";

const route = useRoute();
const store = useChangelogStore();
const openYears = ref(new Set());
const latestOpenedYear = ref("");

if (!store.items.length && ssgData.changelog) {
  store.hydrateChangelog(ssgData.changelog);
}

const releases = computed(() => store.items);
const loading = computed(() => store.loading);
const refreshing = computed(() => store.refreshing);
const error = computed(() => store.error);
const latestVersion = computed(() => store.latestVersion);
const totalVersions = computed(() => store.totalVersions);
const errorMessage = computed(() =>
  String(error.value?.message || error.value || "请稍后重试。"),
);

const groupedLogs = computed(() => {
  const groups = new Map();
  releases.value.forEach((release) => {
    const year = /^\d{4}/.test(release.date)
      ? release.date.slice(0, 4)
      : "其他";
    const changeCount = release.groups.reduce(
      (total, group) => total + group.count,
      0,
    );
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year).push({ ...release, changeCount });
  });
  return Array.from(groups, ([year, yearReleases]) => ({
    year,
    releases: yearReleases,
  }));
});

const typeBadgeClasses = {
  feature: "badge-primary",
  fix: "badge-error",
  improve: "badge-secondary",
  performance: "badge-success",
  refactor: "badge-warning",
  chore: "badge-neutral",
  default: "badge-info",
};

const typeBadgeClass = (type) =>
  typeBadgeClasses[type] || typeBadgeClasses.default;

const formatDate = (date) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || "");
  if (!match) return date;
  return `${match[1]} 年 ${Number(match[2])} 月 ${Number(match[3])} 日`;
};

const isYearOpen = (year) => openYears.value.has(year);

const setYearOpen = (year, open) => {
  const next = new Set(openYears.value);
  if (open) next.add(year);
  else next.delete(year);
  openYears.value = next;
};

const openHashTarget = async () => {
  if (typeof document === "undefined" || !route.hash.startsWith("#version-")) {
    return;
  }
  const id = decodeURIComponent(route.hash.slice(1));
  const version = id.replace(/^version-/, "");
  const release = releases.value.find((item) => item.version === version);
  if (!release) return;
  setYearOpen(release.date.slice(0, 4), true);
  await nextTick();
  document.getElementById(id)?.scrollIntoView({ block: "start" });
};

const refreshChangelog = () => store.fetchChangelog({ force: true });

watch(
  () => groupedLogs.value[0]?.year || "",
  (year) => {
    if (!year || year === latestOpenedYear.value) return;
    latestOpenedYear.value = year;
    setYearOpen(year, true);
  },
  { immediate: true },
);

watch(() => [route.hash, releases.value], openHashTarget, { flush: "post" });

onMounted(async () => {
  await store.fetchChangelog();
  await openHashTarget();
});
</script>
