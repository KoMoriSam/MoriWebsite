<template>
  <ContentPage eyebrow="Release Notes &amp; Maintenance" title="更新日志">
    <template #badges>
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

    <Loading v-if="isLoading" size="my-32" />

    <section
      v-else-if="error"
      class="alert alert-error alert-soft my-8 sm:alert-horizontal"
      role="alert"
    >
      <i class="ri-error-warning-line text-xl" aria-hidden="true"></i>
      <div>
        <h2 class="font-semibold">更新日志暂时没有加载成功</h2>
        <p class="text-sm opacity-80">{{ error }}</p>
      </div>
      <button type="button" class="btn btn-sm" @click="store.fetchChangelog">
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

    <template v-else>
      <div class="min-w-0 space-y-16 py-8">
        <section
          v-for="group in groupedLogs"
          :id="`year-${group.year}`"
          :key="group.year"
          class="scroll-mt-24"
          :aria-labelledby="`year-title-${group.year}`"
        >
          <header
            class="mb-8 grid grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-3 md:grid-cols-[10rem_2rem_minmax(0,1fr)] md:gap-4"
          >
            <div class="hidden text-right md:block">
              <p class="text-xs text-base-content/45">
                {{ group.releases.length }} 个版本
              </p>
            </div>
            <div
              class="flex size-6 items-center justify-center rounded-full border border-base-300 bg-base-200 md:size-8"
              aria-hidden="true"
            >
              <i class="ri-history-line text-sm text-base-content/55"></i>
            </div>
            <div class="flex min-w-0 items-center gap-4">
              <h2
                :id="`year-title-${group.year}`"
                class="font-serif text-3xl font-semibold"
              >
                {{ group.year }}
              </h2>
              <p class="text-sm text-base-content/45 md:hidden">
                {{ group.releases.length }} 个版本
              </p>
              <div class="h-px flex-1 bg-base-300"></div>
            </div>
          </header>

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

                  <div class="divide-y divide-base-300">
                    <section
                      v-for="changeGroup in release.changeGroups"
                      :key="changeGroup.type"
                      class="grid gap-3 py-5 first:pt-5 last:pb-0 md:grid-cols-[3rem_minmax(0,1fr)] md:gap-5 md:first:pt-0"
                    >
                      <div>
                        <span
                          class="badge badge-sm badge-soft font-semibold"
                          :class="typeBadgeClass(changeGroup.type)"
                        >
                          {{ typeText(changeGroup.type) }}
                        </span>
                      </div>
                      <ul class="grid min-w-0 gap-2.5">
                        <li
                          v-for="change in changeGroup.changes"
                          :key="change"
                          class="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-3 text-sm leading-relaxed text-pretty sm:text-base"
                        >
                          <span
                            class="mt-[0.65em] size-1 rounded-full bg-base-content/30"
                            aria-hidden="true"
                          ></span>
                          <span class="min-w-0 break-words">{{ change }}</span>
                        </li>
                      </ul>
                    </section>
                  </div>

                  <div
                    v-if="release.note || release.warning"
                    class="alert mt-6 items-start"
                    :class="
                      release.warning
                        ? 'alert-warning alert-soft'
                        : 'border border-base-300 bg-base-200/60'
                    "
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
                    <div>
                      <p class="text-sm font-semibold">
                        {{ release.warning ? "升级前请注意" : "版本说明" }}
                      </p>
                      <p class="mt-0.5 text-sm opacity-80">
                        {{ release.warning || release.note }}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            </li>
          </ol>
        </section>
      </div>
    </template>
  </ContentPage>

  <FootBar />
</template>

<script setup>
import { computed, onMounted } from "vue";

import FootBar from "@/components/layout/FootBar.vue";
import ContentPage from "@/components/layout/ContentPage.vue";
import Loading from "@/components/base/Loading.vue";
import ssgData from "@/router/ssg-data";
import { useChangelogStore } from "@/stores/changelogStore";
import { typeText } from "@/utils/type-changelog";

const store = useChangelogStore();

if (
  Object.keys(store.data).length === 0 &&
  ssgData.changelog &&
  typeof ssgData.changelog === "object"
) {
  store.hydrateChangelog(ssgData.changelog);
}

const log = computed(() => store.data);
const isLoading = computed(() => store.loading);
const error = computed(() => store.error);

const compareVersions = (a, b) => {
  const aParts = a.split(".").map(Number);
  const bParts = b.split(".").map(Number);
  const length = Math.max(aParts.length, bParts.length);

  for (let index = 0; index < length; index += 1) {
    const difference = (bParts[index] || 0) - (aParts[index] || 0);
    if (difference !== 0) return difference;
  }

  return 0;
};

const groupedLogs = computed(() => {
  const groups = new Map();

  Object.entries(log.value)
    .sort(([a], [b]) => compareVersions(a, b))
    .forEach(([version, item]) => {
      const year = /^\d{4}/.test(item.date) ? item.date.slice(0, 4) : "其他";
      const changeGroups = Object.entries(item.changes || {}).map(
        ([type, changes]) => ({ type, changes }),
      );
      const changeCount = changeGroups.reduce(
        (total, group) => total + group.changes.length,
        0,
      );
      const release = { ...item, version, changeGroups, changeCount };

      if (!groups.has(year)) groups.set(year, []);
      groups.get(year).push(release);
    });

  return Array.from(groups, ([year, releases]) => ({ year, releases }));
});

const latestVersion = computed(
  () => groupedLogs.value[0]?.releases[0]?.version || "",
);
const totalVersions = computed(() => Object.keys(log.value).length);

const typeBadgeClasses = {
  feature: "badge-primary text-primary",
  fix: "badge-error text-error",
  improve: "badge-secondary text-secondary",
  performance: "badge-success text-success",
  refactor: "badge-warning text-warning",
  default: "badge-info text-info",
};

const typeBadgeClass = (type) =>
  typeBadgeClasses[type] || typeBadgeClasses.default;

const formatDate = (date) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || "");
  if (!match) return date;
  return `${match[1]} 年 ${Number(match[2])} 月 ${Number(match[3])} 日`;
};

onMounted(async () => {
  if (Object.keys(store.data).length === 0) {
    await store.fetchChangelog();
  }
});
</script>
