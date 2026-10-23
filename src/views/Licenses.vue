<template>
  <ContentPage
    eyebrow="Open Source & Attributions"
    :title="translate('licenses.title')"
    :description="translate('licenses.scope')"
  >
    <template #meta>
      <span class="inline-flex items-center gap-1">
        <i class="ri-puzzle-line"></i>
        {{ licenseData.dependencyCount }} {{ translate('licenses.dependencies') }}
      </span>
      <span class="inline-flex items-center gap-1">
        <i class="ri-certificate-line"></i>
        {{ licenseData.supplementalLicenses.length }} {{ translate('licenses.additionalLicenses') }}
      </span>
      <span
        v-if="licenseData.missingLicenseFileCount"
        class="inline-flex items-center gap-1"
      >
        <i class="ri-certificate-2-line"></i>
        {{ licenseData.missingLicenseFileCount }} {{ translate('licenses.missingLicenses') }}
      </span>
    </template>

    <section id="project-license" class="scroll-mt-24 my-8">
      <div
        class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p class="text-sm text-base-content/60">Original software source</p>
          <h2 class="font-serif text-2xl font-semibold">{{ translate('licenses.projectLicense') }}</h2>
        </div>
        <a
          class="link link-hover text-sm"
          href="/legal/LICENSE"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ translate('licenses.downloadLicense') }}
          <i class="ri-arrow-right-up-line" aria-hidden="true"></i>
        </a>
      </div>

      <details
        class="collapse collapse-arrow border border-base-300 bg-base-100"
        open
      >
        <summary class="collapse-title font-semibold">MIT License</summary>
        <div class="collapse-content">
          <ScrollableContainer>
            <pre lang="en"
              class="overflow-x-auto whitespace-pre-wrap break-words rounded-box bg-base-200 p-5 text-xs leading-relaxed"
            ><code>{{ licenseData.projectLicense }}</code></pre>
          </ScrollableContainer>
        </div>
      </details>
    </section>

    <section id="notices" class="scroll-mt-24 my-8 min-w-0">
      <div
        class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p class="text-sm text-base-content/60">Scope and attribution</p>
          <h2 class="font-serif text-2xl font-semibold">{{ translate('licenses.thirdPartyNotices') }}</h2>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <select
            v-model="noticeLanguage"
            class="select select-sm w-auto max-w-full"
            :aria-label="translate('licenses.noticeLanguage')"
          >
            <option
              v-for="language in LOCALES"
              :key="language.code"
              :value="language.code"
              :lang="language.code"
            >
              {{ language.name }}
            </option>
          </select>

          <a
            class="link link-hover text-sm"
            :href="rawNoticeUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ translate('licenses.viewSource') }}
            <i class="ri-arrow-right-up-line" aria-hidden="true"></i>
          </a>
        </div>
      </div>

      <div class="card card-border min-w-0 bg-base-100">
        <div class="card-body min-w-0">
          <Renderer
            :content="renderedNotices"
            :lang="noticeLanguage"
            content-id="third-party-notices"
            mode="standard"
            :manage-route-anchor="false"
            class="max-w-none min-w-0 wrap-break-word"
          />
        </div>
      </div>
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
          <p class="text-sm text-base-content/60">Installed production dependency graph</p>
          <h2 class="font-serif text-2xl font-semibold">{{ translate('licenses.dependencyLicenses') }}</h2>
        </div>
        <a
          class="link link-hover text-sm"
          href="/legal/THIRD_PARTY_LICENSES.txt"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ translate('licenses.downloadAllNotices') }}
          <i class="ri-arrow-right-up-line" aria-hidden="true"></i>
        </a>
      </div>

      <p class="mb-5 text-sm text-base-content/70">
        {{ translate('licenses.noticesHint') }}
      </p>

      <div class="grid gap-3">
        <details
          v-for="dependency in licenseData.dependencyNotices"
          :key="`${dependency.name}@${dependency.version}`"
          :id="dependencyAnchor(dependency)"
          class="collapse collapse-arrow scroll-mt-24 border border-base-300 bg-base-100"
          @toggle="loadLicenseOnOpen($event, dependencyAnchor(dependency))"
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

          <div v-if="loadedLicenses.has(dependencyAnchor(dependency))" class="collapse-content">
            <p class="mb-4 text-sm text-base-content/70">
              {{ translate('licenses.upstream') }}
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
              {{ translate('licenses.missingLicenseHint') }}
            </p>

            <div v-else class="grid gap-4">
              <section
                v-for="license in dependency.licenseFiles"
                :key="license.name"
              >
                <h3 class="mb-2 font-mono text-sm font-semibold">
                  {{ license.name }}
                </h3>
                <ScrollableContainer>
                  <pre
                    class="overflow-x-auto whitespace-pre-wrap break-words rounded-box bg-base-200 p-5 text-xs leading-relaxed"
                  ><code>{{ license.text }}</code></pre>
                </ScrollableContainer>
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
        <p class="text-sm text-base-content/60">Fonts, icons, and manual attributions</p>
        <h2 class="font-serif text-2xl font-semibold">{{ translate('licenses.files') }}</h2>
      </div>

      <div class="grid gap-3">
        <details
          v-for="license in licenseData.supplementalLicenses"
          :key="license.name"
          :id="supplementalAnchor(license)"
          class="collapse collapse-arrow scroll-mt-24 border border-base-300 bg-base-100"
          @toggle="loadLicenseOnOpen($event, supplementalAnchor(license))"
        >
          <summary class="collapse-title font-mono text-sm font-semibold">
            {{ license.name }}
          </summary>
          <div v-if="loadedLicenses.has(supplementalAnchor(license))" class="collapse-content">
            <ScrollableContainer>
              <pre
                class="overflow-x-auto whitespace-pre-wrap break-words rounded-box bg-base-200 p-5 text-xs leading-relaxed"
              ><code>{{ license.text }}</code></pre>
            </ScrollableContainer>
          </div>
        </details>
      </div>
    </section>
  </ContentPage>
</template>

<script setup>
import ScrollableContainer from "@/components/layout/ScrollableContainer.vue";
import { LOCALES, useLocale } from '@/i18n';
const { t: translate, locale } = useLocale();

import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

import ContentPage from "@/components/layout/ContentPage.vue";
import Renderer from "@/components/markdown/Renderer.vue";
import licenseData from "@/router/license-data";
import { createLicenseAnchor } from "@/utils/create-license-anchor";

const route = useRoute();

const noticeLanguage = ref(locale.value);
watch(locale, (language) => { noticeLanguage.value = language; });

const noticesByLanguage = {
  "zh-CN": licenseData.noticesMarkdownZh,
  en: licenseData.noticesMarkdownEn,
  si: licenseData.noticesMarkdownSi,
};
const currentNoticesMarkdown = computed(() =>
  noticesByLanguage[noticeLanguage.value] || "",
);

const renderedNotices = computed(() =>
  currentNoticesMarkdown.value
    .replace(/^# [^\r\n]*(?:\r?\n|$)/, "")
    .replaceAll("(./LICENSE)", "(/legal/LICENSE)")
    .replaceAll(
      "(./THIRD_PARTY_NOTICES.zh-CN.md)",
      "(/legal/THIRD_PARTY_NOTICES.zh-CN.txt)",
    )
    .replaceAll(
      "(./THIRD_PARTY_NOTICES.md)",
      "(/legal/THIRD_PARTY_NOTICES.txt)",
    )
    .replaceAll(
      "(./THIRD_PARTY_NOTICES.si.md)",
      "(/legal/THIRD_PARTY_NOTICES.si.txt)",
    )
    .replaceAll("(./licenses/", "(/legal/licenses/"),
);

const rawNoticeUrl = computed(() =>
  `/legal/THIRD_PARTY_NOTICES${noticeLanguage.value === "en" ? "" : `.${noticeLanguage.value}`}.txt`,
);

const dependencyAnchor = (dependency) =>
  createLicenseAnchor("dependency", dependency.name, dependency.version);

const supplementalAnchor = (license) =>
  createLicenseAnchor("supplemental", license.name);

const loadedLicenses = ref(new Set());
const loadLicenseOnOpen = (event, anchor) => {
  if (event.target.open) loadedLicenses.value.add(anchor);
};

const revealHashLicense = async (hash) => {
  if (!hash || typeof document === "undefined") return;
  let anchor = hash.slice(1);
  try { anchor = decodeURIComponent(anchor); } catch { /* Preserve malformed hashes. */ }
  loadedLicenses.value.add(anchor);
  await nextTick();
  const target = document.getElementById(anchor);
  if (target instanceof HTMLDetailsElement) target.open = true;
};

onMounted(() => revealHashLicense(route.hash));
watch(
  () => route.hash,
  revealHashLicense,
  { flush: "sync" },
);

const sourceUrl = (source) => {
  const value = String(source || "").trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[\w.-]+\/[\w.-]+$/.test(value)) return `https://github.com/${value}`;
  return "";
};
</script>
