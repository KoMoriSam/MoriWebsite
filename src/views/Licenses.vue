<template>
  <main class="mx-auto w-full max-w-7xl px-4 py-12 md:px-8 lg:py-16">
    <header>
      <div
        class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"
      >
        <div class="max-w-3xl">
          <p class="mb-2 text-sm font-semibold tracking-wide text-primary">
            OPEN SOURCE &amp; ATTRIBUTIONS
          </p>
          <h1 class="font-serif font-bold text-3xl md:text-4xl">
            开源许可与第三方声明
          </h1>
          <p class="mt-3 text-base-content/70">
            项目的 MIT
            许可仅适用于原创软件源代码；第三方组件与非软件内容仍遵循各自条款。
          </p>
        </div>

        <div class="flex flex-wrap gap-2 md:max-w-xs md:justify-end">
          <span class="badge badge-lg"
            >{{ licenseData.dependencyCount }} 个依赖版本</span
          >
          <span class="badge badge-lg badge-outline">
            {{ licenseData.supplementalLicenses.length }} 份补充许可
          </span>
          <span
            v-if="licenseData.missingLicenseFileCount"
            class="badge badge-lg badge-outline"
          >
            {{ licenseData.missingLicenseFileCount }} 个包未附顶层许可文件
          </span>
        </div>
      </div>
    </header>

    <section id="project-license" class="scroll-mt-24 py-10">
      <div
        class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p class="text-sm text-base-content/60">Original software source</p>
          <h2 class="font-serif text-2xl font-semibold">项目 MIT 许可</h2>
        </div>
        <a
          class="link link-hover text-sm"
          href="/legal/LICENSE"
          target="_blank"
          rel="noopener noreferrer"
        >
          下载 LICENSE
          <i class="ri-arrow-right-up-line" aria-hidden="true"></i>
        </a>
      </div>

      <details
        class="collapse collapse-arrow border border-base-300 bg-base-100"
        open
      >
        <summary class="collapse-title font-semibold">MIT License</summary>
        <div class="collapse-content">
          <pre
            class="overflow-x-auto whitespace-pre-wrap break-words rounded-box bg-base-200 p-5 text-xs leading-relaxed"
          ><code>{{ licenseData.projectLicense }}</code></pre>
        </div>
      </details>
    </section>

    <section id="notices" class="scroll-mt-24 pb-10">
      <div
        class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p class="text-sm text-base-content/60">Scope and attribution</p>
          <h2 class="font-serif text-2xl font-semibold">第三方声明</h2>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <div class="join" role="group" aria-label="第三方声明语言">
            <button
              type="button"
              class="btn btn-sm join-item"
              :class="{ 'btn-active': noticeLanguage === 'zh-CN' }"
              :aria-pressed="noticeLanguage === 'zh-CN'"
              @click="noticeLanguage = 'zh-CN'"
            >
              中文
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

      <article
        class="card card-border bg-base-100"
        :lang="noticeLanguage"
      >
        <div class="card-body">
          <VueMarkdown
            class="prose max-w-none"
            :source="renderedNotices"
            :options="markdownOptions"
          />
        </div>
      </article>
    </section>

    <section
      id="dependencies"
      class="scroll-mt-24 pb-10"
      data-pagefind-ignore="all"
    >
      <div
        class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p class="text-sm text-base-content/60">
            Installed production dependency graph
          </p>
          <h2 class="font-serif text-2xl font-semibold">生产依赖许可</h2>
        </div>
        <a
          class="link link-hover text-sm"
          href="/legal/THIRD_PARTY_LICENSES.txt"
          target="_blank"
          rel="noopener noreferrer"
        >
          下载完整汇总
          <i class="ri-arrow-right-up-line" aria-hidden="true"></i>
        </a>
      </div>

      <p class="mb-5 max-w-3xl text-sm text-base-content/70">
        以下内容来自构建时实际安装的软件包。若软件包未携带顶层许可文件，条目仍会保留其声明的许可证和上游地址，并明确标记缺失情况。
      </p>

      <div class="grid gap-3">
        <details
          v-for="dependency in licenseData.dependencyNotices"
          :key="`${dependency.name}@${dependency.version}`"
          class="collapse collapse-arrow border border-base-300 bg-base-100"
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
              上游：
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
              此软件包未随已安装版本提供顶层许可证文件。
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
      class="scroll-mt-24 pb-6"
      data-pagefind-ignore="all"
    >
      <div class="mb-4">
        <p class="text-sm text-base-content/60">
          Fonts, icons, and manual attributions
        </p>
        <h2 class="font-serif text-2xl font-semibold">补充许可文件</h2>
      </div>

      <div class="grid gap-3">
        <details
          v-for="license in licenseData.supplementalLicenses"
          :key="license.name"
          class="collapse collapse-arrow border border-base-300 bg-base-100"
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
  </main>

  <ToTop />
  <FootBar />
</template>

<script setup>
import { computed, ref } from "vue";
import VueMarkdown from "vue-markdown-render";

import FootBar from "@/components/layout/FootBar.vue";
import ToTop from "@/components/base/ToTop.vue";
import licenseData from "@/router/license-data";

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

const rawNoticeUrl = computed(() =>
  noticeLanguage.value === "zh-CN"
    ? "/legal/THIRD_PARTY_NOTICES.zh-CN.txt"
    : "/legal/THIRD_PARTY_NOTICES.txt",
);

const rawNoticeLabel = computed(() =>
  noticeLanguage.value === "zh-CN" ? "查看中文原始文本" : "View English source",
);

const sourceUrl = (source) => {
  const value = String(source || "").trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[\w.-]+\/[\w.-]+$/.test(value)) return `https://github.com/${value}`;
  return "";
};
</script>
