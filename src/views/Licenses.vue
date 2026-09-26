<template>
  <ContentPage
    :eyebrow="translate('common.sections.openSource')"
    :title="translate('pages.licenses.licensesThirdPartyNotices')"
    :description="translate('pages.licenses.theProjectSMitLicenseAppliesOnlyToOriginalSoftware')"
  >
    <template #meta>
      <span class="inline-flex items-center gap-1">
        <i class="ri-puzzle-line"></i>
        {{ licenseData.dependencyCount }} {{ translate('pages.licenses.dependencyVersions') }}
      </span>
      <span class="inline-flex items-center gap-1">
        <i class="ri-certificate-line"></i>
        {{ licenseData.supplementalLicenses.length }} {{ translate('pages.licenses.additionalLicenses') }}
      </span>
      <span
        v-if="licenseData.missingLicenseFileCount"
        class="inline-flex items-center gap-1"
      >
        <i class="ri-certificate-2-line"></i>
        {{ licenseData.missingLicenseFileCount }} {{ translate('pages.licenses.packagesWithoutATopLevelLicenseFile') }}
      </span>
    </template>

    <section id="project-license" class="scroll-mt-24 my-8">
      <div
        class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p class="text-sm text-base-content/60">{{ translate('common.sections.originalSource') }}</p>
          <h2 class="font-serif text-2xl font-semibold">{{ translate('pages.licenses.projectMitLicense') }}</h2>
        </div>
        <a
          class="link link-hover text-sm"
          href="/legal/LICENSE"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ translate('pages.licenses.downloadLicense') }}
          <i class="ri-arrow-right-up-line" aria-hidden="true"></i>
        </a>
      </div>

      <details
        class="collapse collapse-arrow border border-base-300 bg-base-100"
        open
      >
        <summary class="collapse-title font-semibold">MIT License</summary>
        <div class="collapse-content">
          <pre lang="en"
            class="overflow-x-auto whitespace-pre-wrap break-words rounded-box bg-base-200 p-5 text-xs leading-relaxed"
          ><code>{{ licenseData.projectLicense }}</code></pre>
        </div>
      </details>
    </section>

    <section id="notices" class="scroll-mt-24 my-8">
      <div
        class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p class="text-sm text-base-content/60">{{ translate('common.sections.attribution') }}</p>
          <h2 class="font-serif text-2xl font-semibold">{{ translate('pages.licenses.thirdPartyNotices') }}</h2>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <div class="join" role="group" :aria-label="translate('pages.licenses.noticeLanguage')">
            <button
              type="button"
              class="btn btn-sm join-item"
              :class="{ 'btn-active': noticeLanguage === 'zh-CN' }"
              :aria-pressed="noticeLanguage === 'zh-CN'"
              @click="noticeLanguage = 'zh-CN'"
            >
              {{ translate('pages.licenses.chinese') }}
            </button>
            <button
              type="button"
              class="btn btn-sm join-item"
              :class="{ 'btn-active': noticeLanguage === 'en' }"
              :aria-pressed="noticeLanguage === 'en'"
              @click="noticeLanguage = 'en'"
            >
              English
            </button>
          </div>

          <a
            class="link link-hover text-sm"
            :href="rawNoticeUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ rawNoticeLabel }}
            <i class="ri-arrow-right-up-line" aria-hidden="true"></i>
          </a>
        </div>
      </div>

      <article class="card card-border bg-base-100" :lang="noticeLanguage">
        <div class="card-body">
          <div class="prose max-w-none">
            <RenderedContent :html="renderedNoticesHtml" />
          </div>
        </div>
      </article>
    </section>

    <section
      id="dependencies"
      class="scroll-mt-24 my-8"
      data-pagefind-ignore="all"
    >
      <div
        class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p class="text-sm text-base-content/60">{{ translate('common.sections.installedDependencies') }}</p>
          <h2 class="font-serif text-2xl font-semibold">{{ translate('pages.licenses.productionDependencyLicenses') }}</h2>
        </div>
        <a
          class="link link-hover text-sm"
          href="/legal/THIRD_PARTY_LICENSES.txt"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ translate('pages.licenses.downloadAllNotices') }}
          <i class="ri-arrow-right-up-line" aria-hidden="true"></i>
        </a>
      </div>

      <p class="mb-5 text-sm text-base-content/70">
        {{ translate('pages.licenses.theseNoticesComeFromThePackagesInstalledAtBuildTime') }}
      </p>

      <div class="grid gap-3">
        <details
          v-for="dependency in licenseData.dependencyNotices"
          :key="`${dependency.name}@${dependency.version}`"
          :id="dependencyAnchor(dependency)"
          class="collapse collapse-arrow scroll-mt-24 border border-base-300 bg-base-100"
        >
          <summary class="collapse-title pr-12">
            <span
              class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <strong class="break-all font-mono text-sm">
                {{ dependency.name }}@{{ dependency.version }}
              </strong>
              <span class="badge badge-sm badge-outline shrink-0">
                {{ dependency.declaredLicense }}
              </span>
            </span>
          </summary>

          <div class="collapse-content">
            <p class="mb-4 text-sm text-base-content/70">
              {{ translate('pages.licenses.upstream') }}
              <a
                v-if="sourceUrl(dependency.source)"
                class="link link-hover break-all"
                :href="sourceUrl(dependency.source)"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ dependency.source }}
              </a>
              <span v-else class="break-all">{{ dependency.source }}</span>
            </p>

            <p
              v-if="!dependency.licenseFiles.length"
              class="rounded-box bg-base-200 p-4 text-sm text-base-content/70"
            >
              {{ translate('pages.licenses.theInstalledVersionOfThisPackageDoesNotIncludeA') }}
            </p>

            <div v-else class="grid gap-4">
              <section
                v-for="license in dependency.licenseFiles"
                :key="license.name"
              >
                <h3 class="mb-2 font-mono text-sm font-semibold">
                  {{ license.name }}
                </h3>
                <pre
                  class="overflow-x-auto whitespace-pre-wrap break-words rounded-box bg-base-200 p-5 text-xs leading-relaxed"
                ><code>{{ license.text }}</code></pre>
              </section>
            </div>
          </div>
        </details>
      </div>
    </section>

    <section
      id="supplemental"
      class="scroll-mt-24 my-8"
      data-pagefind-ignore="all"
    >
      <div class="mb-4">
        <p class="text-sm text-base-content/60">{{ translate('common.sections.fontNotices') }}</p>
        <h2 class="font-serif text-2xl font-semibold">{{ translate('pages.licenses.additionalLicenseFiles') }}</h2>
      </div>

      <div class="grid gap-3">
        <details
          v-for="license in licenseData.supplementalLicenses"
          :key="license.name"
          :id="supplementalAnchor(license)"
          class="collapse collapse-arrow scroll-mt-24 border border-base-300 bg-base-100"
        >
          <summary class="collapse-title font-mono text-sm font-semibold">
            {{ license.name }}
          </summary>
          <div class="collapse-content">
            <pre
              class="overflow-x-auto whitespace-pre-wrap break-words rounded-box bg-base-200 p-5 text-xs leading-relaxed"
            ><code>{{ license.text }}</code></pre>
          </div>
        </details>
      </div>
    </section>
  </ContentPage>
</template>

<script setup>
import { useLocale } from '@/i18n';
const { t: translate } = useLocale();

import { computed, nextTick, ref, watch } from "vue";
import MarkdownIt from "markdown-it";
import { useRoute } from "vue-router";

import ContentPage from "@/components/layout/ContentPage.vue";
import RenderedContent from "@/components/markdown/RenderedContent.vue";
import licenseData from "@/router/license-data";
import { createLicenseAnchor } from "@/utils/create-license-anchor";

const route = useRoute();

const markdownOptions = {
  html: false,
  linkify: true,
  typographer: true,
};

const noticeLanguage = ref("zh-CN");
const currentNoticesMarkdown = computed(() =>
  noticeLanguage.value === "zh-CN"
    ? licenseData.noticesMarkdownZh
    : licenseData.noticesMarkdownEn,
);

const renderedNotices = computed(() =>
  currentNoticesMarkdown.value
    .replaceAll("(./LICENSE)", "(/legal/LICENSE)")
    .replaceAll(
      "(./THIRD_PARTY_NOTICES.zh-CN.md)",
      "(/legal/THIRD_PARTY_NOTICES.zh-CN.txt)",
    )
    .replaceAll(
      "(./THIRD_PARTY_NOTICES.md)",
      "(/legal/THIRD_PARTY_NOTICES.txt)",
    )
    .replaceAll("(./licenses/", "(/legal/licenses/"),
);
const renderedNoticesHtml = computed(() =>
  new MarkdownIt(markdownOptions).render(renderedNotices.value),
);

const rawNoticeUrl = computed(() =>
  noticeLanguage.value === "zh-CN"
    ? "/legal/THIRD_PARTY_NOTICES.zh-CN.txt"
    : "/legal/THIRD_PARTY_NOTICES.txt",
);

const rawNoticeLabel = computed(() =>
  noticeLanguage.value === "zh-CN" ? translate('pages.licenses.viewChineseSource') : translate('common.sections.viewEnglishSource'),
);

const dependencyAnchor = (dependency) =>
  createLicenseAnchor("dependency", dependency.name, dependency.version);

const supplementalAnchor = (license) =>
  createLicenseAnchor("supplemental", license.name);

watch(
  () => route.hash,
  async (hash) => {
    if (!hash || typeof document === "undefined") return;

    await nextTick();
    const target = document.getElementById(hash.slice(1));
    if (target instanceof HTMLDetailsElement) target.open = true;
  },
  { immediate: true, flush: "post" },
);

const sourceUrl = (source) => {
  const value = String(source || "").trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[\w.-]+\/[\w.-]+$/.test(value)) return `https://github.com/${value}`;
  return "";
};
</script>
