<template>
  <ContentPage
    eyebrow="Font Project"
    title="开明标点"
    description="一套为网页中文排版制作的标点字体。支持黑体与宋体两种风格，以及 100–900 连续可变字重。"
  >
    <template #actions>
      <ul class="flex flex-wrap gap-2" aria-label="字体规格">
        <li class="badge badge-outline">wght 100–900</li>
        <li class="badge badge-outline">Sans / Serif</li>
        <li class="badge badge-outline">WOFF2 Variable</li>
        <li class="badge badge-outline">SIL OFL 1.1</li>
      </ul>
      <a
        class="btn btn-ghost"
        href="https://github.com/KoMoriSam/Kaiming"
        target="_blank"
        rel="noopener noreferrer"
      >
        <i class="ri-github-fill text-xl font-normal"></i>
        查看源码
        <i class="ri-arrow-right-up-line font-normal"></i>
      </a>
    </template>

    <section
      class="card overflow-hidden border border-base-200 bg-base-200/10"
      aria-labelledby="specimen-title"
    >
      <div
        class="flex flex-col gap-4 border-b border-base-200 bg-base-200/60 p-4 md:flex-row md:items-start md:justify-between"
      >
        <fieldset class="fieldset">
          <legend class="fieldset-legend">标点字体族</legend>
          <select
            class="select w-full max-w-xs md:w-48"
            :style="demoStyle"
            v-model="family"
            aria-label="标点字体族"
            @change="family = $event.target.value"
          >
            <option disabled selected>选择字体族</option>
            <option
              v-for="option in familyOptions"
              :key="option.value"
              :value="option.value"
              :class="{
                'font-serif': option.value === 'serif',
                'font-sans': option.value === 'sans',
              }"
              :selected="family === option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </fieldset>
        <fieldset class="fieldset flex-1">
          <legend class="fieldset-legend">
            可变字重
            <output
              class="badge badge-primary badge-sm font-mono"
              for="kaiming-weight"
            >
              {{ weight }}
            </output>
          </legend>
          <input
            id="kaiming-weight"
            v-model.number="weight"
            class="range range-primary max-md:range-sm w-full mt-1"
            type="range"
            min="100"
            max="900"
            step="1"
            :aria-valuetext="`字重 ${weight}`"
          />
        </fieldset>
      </div>

      <div class="p-6">
        <h2 id="specimen-title" class="sr-only">在线字体样张</h2>
        <div
          class="text-justify mx-auto min-h-64 w-[11em] md:w-[17em] lg:w-[18em] xl:w-[19em] rounded-box p-3 leading-snug outline-none transition-colors hover:bg-base-200/40 focus:bg-base-200/60 md:min-h-80 md:p-5 text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl"
          contenteditable="true"
          role="textbox"
          aria-label="可编辑字体样张"
          aria-multiline="true"
          spellcheck="false"
          :style="demoStyle"
        >
          　　潋城，清晨。老街传来消息：“《重返地平线（克里斯·莫蒂著）》已出版，首批
          100 万册！”——真让人惊喜！但我想问：它会被更多人读到吗？
        </div>
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
        <p
          class="mb-2 text-sm font-semibold tracking-wide text-primary uppercase"
        >
          Typography Features
        </p>
        <h2
          id="features-title"
          class="font-serif text-2xl font-bold md:text-3xl"
        >
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
            <aside class="card-icon font-mono text-sm">
              {{ feature.index }}
            </aside>
            <h3 class="card-title font-serif font-bold">{{ feature.title }}</h3>
            <p
              class="my-4 text-4xl leading-none md:text-5xl"
              :class="demoStyle.fontFamily"
              :style="demoStyle"
            >
              {{ feature.sample }}
            </p>
            <p class="text-sm text-base-content/70">
              {{ feature.description }}
            </p>
          </div>
        </article>
      </div>
    </section>

    <section class="pb-12" aria-labelledby="usage-title">
      <header class="mb-8 text-center">
        <p
          class="mb-2 text-sm font-semibold tracking-wide text-primary uppercase"
        >
          Use on the Web
        </p>
        <h2 id="usage-title" class="font-serif text-2xl font-bold md:text-3xl">
          一行引入，按需回退
        </h2>
        <p class="mx-auto mt-3 max-w-xl text-base-content/70">
          CSS 内置精确的 unicode-range，只下载并替换所包含的中文标点。
        </p>
      </header>

      <div
        class="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]"
      >
        <article class="card overflow-hidden">
          <section
            class="mockup-code w-full max-w-full overflow-x-auto mx-0 my-2 pb-0 relative"
          >
            <CodeBlock :code="usageCode" language="css" />
          </section>
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
import CodeBlock from "@/components/markdown/CodeBlock.vue";

const weight = ref(400);
const family = ref("serif");

const familyOptions = [
  { label: "无衬线", value: "sans" },
  { label: "衬线体", value: "serif" },
];

const activeFamilyLabel = computed(
  () => familyOptions.find((option) => option.value === family.value)?.label,
);

const demoStyle = computed(() => ({
  fontFamily:
    family.value === "serif"
      ? "'Kaiming Punctuation Serif', 'Fraunces Variable', 'Fraunces', 'Noto Serif SC Variable', 'Noto Serif SC', 'Source Han Serif SC Variable', 'Source Han Serif SC', 'Noto Serif Sinhala Variable', 'Noto Serif Sinhala', ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif"
      : "'Kaiming Punctuation Sans', 'Manrope Variable', 'Manrope', 'Noto Sans SC Variable', 'Noto Sans SC', 'Noto Sans Sinhala Variable', 'Noto Sans Sinhala', ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
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

const usageCode = `@import url("https://raw.komori.cc/kaiming/index.css");

article {
  font-family:
    "Kaiming Punctuation Sans",
    "Noto Sans SC Variable",
    sans-serif;
  font-weight: 400;
}`;

const downloads = [
  {
    label: "网页引用",
    meta: "CSS",
    href: "https://raw.komori.cc/kaiming/index.css",
    external: true,
  },
  {
    label: "发布版本",
    meta: "Releases",
    href: "https://github.com/KoMoriSam/Kaiming/releases",
    external: true,
  },
  {
    label: "源码仓库",
    meta: "GitHub",
    href: "https://github.com/KoMoriSam/Kaiming",
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
