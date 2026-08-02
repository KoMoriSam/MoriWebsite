<template>
  <ContentPage
    eyebrow="Font Project"
    title="开明标点"
    description="一套为网页中文排版制作的标点字体。支持黑体与宋体两种风格，以及 100–900 连续可变字重。"
  >
    <template #actions>
      <a
        class="btn btn-primary"
        href="https://raw.komori.cc/kaiming/kaiming-punctuation-variable.css"
        target="_blank"
        rel="noopener noreferrer"
      >
        <i class="ri-code-s-slash-line"></i>
        使用 CSS
      </a>
      <a
        class="btn btn-ghost"
        href="https://github.com/KoMoriSam/Kaiming"
        target="_blank"
        rel="noopener noreferrer"
      >
        <i class="ri-github-fill"></i>
        查看源码
      </a>
    </template>

    <ul class="mb-6 flex flex-wrap gap-2" aria-label="字体规格">
      <li class="badge badge-outline">wght 100–900</li>
      <li class="badge badge-outline">Sans / Serif</li>
      <li class="badge badge-outline">WOFF2 Variable</li>
      <li class="badge badge-outline">SIL OFL 1.1</li>
    </ul>

    <section
      class="card overflow-hidden border border-base-200 bg-base-200/10"
      aria-labelledby="specimen-title"
    >
      <div
        class="flex flex-col gap-4 border-b border-base-200 bg-base-200/60 p-4 lg:flex-row lg:items-end lg:justify-between"
      >
        <label class="form-control min-w-0 flex-1" for="kaiming-weight">
          <span class="label pb-1 text-sm font-semibold">
            <span>可变字重</span>
            <output class="badge badge-primary badge-sm" for="kaiming-weight">
              {{ weight }}
            </output>
          </span>
          <input
            id="kaiming-weight"
            v-model.number="weight"
            class="range range-primary range-sm"
            type="range"
            min="100"
            max="900"
            step="1"
            :aria-valuetext="`字重 ${weight}`"
          />
        </label>

        <div class="join" role="group" aria-label="标点字体族">
          <button
            v-for="option in familyOptions"
            :key="option.value"
            class="btn btn-sm join-item"
            :class="family === option.value ? 'btn-primary' : 'btn-ghost'"
            type="button"
            :aria-pressed="family === option.value"
            @click="family = option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <div class="p-5 md:p-10 lg:p-16">
        <h2 id="specimen-title" class="sr-only">在线字体样张</h2>
        <div
          class="min-h-64 rounded-box p-3 text-4xl leading-snug outline-none transition-colors hover:bg-base-200/40 focus:bg-base-200/60 md:min-h-80 md:p-5 md:text-6xl lg:text-7xl"
          contenteditable="true"
          role="textbox"
          aria-label="可编辑字体样张"
          aria-multiline="true"
          spellcheck="false"
          :style="demoStyle"
        >他说：“开明，清楚；准确。”——这就是中文标点。</div>
      </div>

      <div
        class="flex flex-wrap justify-between gap-2 border-t border-base-200 bg-base-200/60 px-4 py-2 text-xs text-base-content/60"
      >
        <span>点击样张即可编辑</span>
        <span>当前字体：{{ activeFamilyLabel }}</span>
      </div>
    </section>

    <section class="py-16" aria-labelledby="features-title">
      <header class="mb-8 text-center">
        <p class="mb-2 text-sm font-semibold tracking-wide text-primary uppercase">
          Typography Features
        </p>
        <h2 id="features-title" class="font-serif text-2xl font-bold md:text-3xl">
          为中文正文重新整理标点节奏
        </h2>
      </header>

      <div class="grid grid-cols-1 gap-5 md:grid-cols-3">
        <article
          v-for="feature in features"
          :key="feature.index"
          class="card card-dash border border-base-200 bg-base-200/10"
        >
          <div class="card-body">
            <aside class="card-icon font-mono text-sm">{{ feature.index }}</aside>
            <h3 class="card-title font-serif font-bold">{{ feature.title }}</h3>
            <p class="my-4 text-4xl leading-none md:text-5xl" :style="demoStyle">
              {{ feature.sample }}
            </p>
            <p class="text-sm text-base-content/70">{{ feature.description }}</p>
          </div>
        </article>
      </div>
    </section>

    <section class="pb-12" aria-labelledby="usage-title">
      <header class="mb-8 text-center">
        <p class="mb-2 text-sm font-semibold tracking-wide text-primary uppercase">
          Use on the Web
        </p>
        <h2 id="usage-title" class="font-serif text-2xl font-bold md:text-3xl">
          一行引入，按需回退
        </h2>
        <p class="mx-auto mt-3 max-w-xl text-base-content/70">
          CSS 内置精确的 unicode-range，只下载并替换所包含的中文标点。
        </p>
      </header>

      <div class="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <article class="card overflow-hidden bg-neutral text-neutral-content">
          <div class="card-body p-0">
            <CodeBlock :code="usageCode" language="css" />
          </div>
        </article>

        <article class="card border border-base-200 bg-base-200/10">
          <div class="card-body">
            <h3 class="card-title font-serif font-bold">下载与源码</h3>
            <p class="text-sm text-base-content/70">
              直接使用网页字体，或前往 GitHub 获取其他格式与构建源码。
            </p>
            <div class="mt-2 grid gap-2">
              <a
                v-for="download in downloads"
                :key="download.href"
                class="btn btn-ghost justify-between border-base-200"
                :href="download.href"
                :target="download.external ? '_blank' : undefined"
                :rel="download.external ? 'noopener noreferrer' : undefined"
              >
                <span>{{ download.label }}</span>
                <span class="text-xs font-normal opacity-60">
                  {{ download.meta }}
                </span>
              </a>
            </div>
          </div>
        </article>
      </div>
    </section>
  </ContentPage>

  <FootBar />
</template>

<script setup>
import { computed, ref } from "vue";

import ContentPage from "@/components/layout/ContentPage.vue";
import FootBar from "@/components/layout/FootBar.vue";
import CodeBlock from "@/components/ui/CodeBlock.vue";

const weight = ref(400);
const family = ref("sans");

const familyOptions = [
  { label: "黑体", value: "sans" },
  { label: "宋体", value: "serif" },
];

const activeFamilyLabel = computed(
  () => familyOptions.find((option) => option.value === family.value)?.label,
);

const demoStyle = computed(() => ({
  fontFamily:
    family.value === "serif"
      ? '"Kaiming Serif Variable Demo", "Noto Serif SC Variable", "Noto Serif SC", serif'
      : '"Kaiming Sans Variable Demo", "Noto Sans SC Variable", "Noto Sans SC", sans-serif',
  fontWeight: weight.value,
  fontVariationSettings: `"wght" ${weight.value}`,
}));

const features = [
  {
    index: "01",
    title: "半宽标点",
    sample: "「开」「明」",
    description: "括号、引号和顿逗类标点采用半字宽，让正文节奏更紧凑。",
  },
  {
    index: "02",
    title: "句末压缩",
    sample: "真的？！",
    description: "连续句末标点压缩排列，保留强调，也避免空白松散。",
  },
  {
    index: "03",
    title: "破折号连字",
    sample: "上篇——下篇",
    description: "双破折号形成连续的二字宽连字，与正文版心自然衔接。",
  },
];

const usageCode = `@import url("https://raw.komori.cc/kaiming/kaiming-punctuation-variable.css");

article {
  font-family:
    "Kaiming Punctuation Sans",
    "Noto Sans SC Variable",
    sans-serif;
  font-weight: 400;
}`;

const downloads = [
  {
    label: "变量字体 CSS",
    meta: "CSS",
    href: "https://raw.komori.cc/kaiming/kaiming-punctuation-variable.css",
    external: true,
  },
  {
    label: "开明黑体",
    meta: "WOFF2",
    href: "https://raw.komori.cc/kaiming/Sans-VF.woff2",
    external: true,
  },
  {
    label: "开明宋体",
    meta: "WOFF2",
    href: "https://raw.komori.cc/kaiming/Serif-VF.woff2",
    external: true,
  },
  {
    label: "其他格式",
    meta: "GitHub",
    href: "https://github.com/KoMoriSam/Kaiming/releases",
    external: true,
  },
  {
    label: "开源许可证",
    meta: "OFL 1.1",
    href: "https://raw.komori.cc/kaiming/LICENSE",
    external: true,
  },
];
</script>

<style>
@font-face {
  font-family: "Kaiming Sans Variable Demo";
  src: url("https://raw.komori.cc/kaiming/Sans-VF.woff2") format("woff2");
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
}

@font-face {
  font-family: "Kaiming Serif Variable Demo";
  src: url("https://raw.komori.cc/kaiming/Serif-VF.woff2") format("woff2");
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
}
</style>
