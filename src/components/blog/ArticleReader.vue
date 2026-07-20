<template>
  <Reader
    drawer
    drawer-id="article-reader-sidebar"
    toc
    :aside="Boolean(content && article?.id != null)"
  >
    <!-- 加载状态 -->
    <Loading v-if="loading" :size="`my-32`" />

    <!-- 文章内容 -->
    <article
      v-else-if="content"
      :ref="scrollRef"
      class="min-w-0 w-full max-w-full"
    >
      <!-- 文章正文：保留头图、标签、别名和阅读时长 -->
      <!-- 文章头图 -->
      <header
        class="relative min-h-72 overflow-hidden rounded-2xl bg-base-200 shadow-lg sm:min-h-80 lg:rounded-3xl"
      >
        <!-- Banner -->
        <div
          v-if="article?.banner"
          class="absolute inset-0 bg-cover bg-center"
          :style="{
            backgroundImage: `url(${resolveBannerUrl(article.banner)})`,
          }"
        ></div>

        <!-- 无 Banner 背景 -->
        <div
          v-else
          class="absolute inset-0 bg-gradient-to-br from-accent/25 to-primary/20"
        >
          <div
            class="absolute -top-20 -right-16 size-64 rounded-full bg-primary/15 blur-3xl"
          ></div>

          <div
            class="absolute -bottom-24 -left-16 size-72 rounded-full bg-accent/20 blur-3xl"
          ></div>

          <i
            class="ri-article-line absolute top-6 right-6 text-8xl text-base-content/5 sm:top-8 sm:right-8 sm:text-9xl"
          ></i>

          <div
            class="absolute inset-0 opacity-[0.04]"
            style="
              background-image: radial-gradient(
                currentColor 1px,
                transparent 1px
              );
              background-size: 18px 18px;
            "
          ></div>
        </div>

        <!-- Banner 遮罩 -->
        <div
          v-if="article?.banner"
          class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10"
        ></div>

        <!-- 头图内容 -->
        <div
          class="relative flex min-h-72 flex-col justify-end p-5 sm:min-h-80 sm:p-8"
          :class="article?.banner ? 'text-white' : 'text-base-content'"
        >
          <!-- 标签 -->
          <div
            v-if="article?.tags?.length"
            class="mb-3 flex flex-wrap gap-2 items-center"
          >
            <div class="tooltip tooltip-right" data-tip="返回文章列表">
              <button
                class="btn btn-sm btn-circle"
                :class="
                  article?.banner
                    ? 'border-white/20 bg-white/15 text-white backdrop-blur-sm'
                    : 'btn-primary btn-soft'
                "
                @click="handleBack"
              >
                <i class="ri-arrow-left-line"></i>
              </button>
            </div>
            <span
              v-for="tag in article.tags"
              :key="tag"
              class="badge badge-sm"
              :class="
                article?.banner
                  ? 'border-white/20 bg-white/15 text-white backdrop-blur-sm'
                  : 'badge-primary badge-soft'
              "
            >
              {{ tag }}
            </span>
          </div>

          <!-- 标题 -->
          <h1
            class="max-w-4xl text-3xl leading-tight font-black font-serif tracking-tight sm:text-4xl lg:text-5xl text-balance"
            :class="article?.banner ? 'drop-shadow-sm' : ''"
          >
            {{ article?.title }}
          </h1>

          <!-- 别名或副标题 -->
          <p
            v-if="aliasList.length"
            class="mt-3 flex max-w-3xl flex-wrap text-sm leading-relaxed sm:text-base"
          >
            <span
              v-for="alias in aliasList"
              :key="alias"
              :title="alias"
              class="mr-2 mb-2 inline-flex max-w-full items-center justify-start overflow-x-auto whitespace-nowrap text-left font-bold badge scrollbar-none px-2"
              :class="
                article?.banner
                  ? 'border-white/15 bg-white/10 text-white/85'
                  : 'border-base-300 bg-base-100 text-base-content/75'
              "
            >
              <span class="min-w-max">{{ alias }}</span>
            </span>
          </p>

          <!-- 元数据 -->
          <div
            class="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"
            :class="article?.banner ? 'text-white/70' : 'text-base-content/55'"
          >
            <time v-if="article?.date" class="inline-flex items-center gap-1.5">
              <i class="ri-calendar-line"></i>
              {{ useDateFormat(article.date, "YYYY/M/D") }}
            </time>

            <span
              v-if="article?.length"
              class="inline-flex items-center gap-1.5"
            >
              <i class="ri-file-text-line"></i>
              {{ article.length }} 字
            </span>

            <span
              v-if="article?.length"
              class="inline-flex items-center gap-1.5"
            >
              <i class="ri-time-line"></i>
              {{ estimateReadingTime(article.length) }} 分钟阅读
            </span>
          </div>
        </div>
      </header>

      <!-- Markdown 正文 -->
      <div class="mt-8 min-w-0">
        <Markdown
          :content="content"
          :is-loading="false"
          :header-data="headerData"
          :style-configs="styleConfigs"
        />
      </div>
    </article>

    <!-- 错误状态 -->
    <div v-else-if="error" class="alert alert-error my-16">
      <i class="ri-error-warning-line text-3xl"></i>

      <div>
        <h2 class="font-bold">文章加载失败</h2>
        <p class="text-sm">{{ error }}</p>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="my-32 text-center text-base-content/50">
      <i class="ri-file-unknow-line mb-4 block text-5xl"></i>
      <p>文章不存在或加载失败</p>
    </div>

    <template #floating>
      <aside class="max-lg:dock">
        <FloatingActionButton :actions="fabActions" main-icon="ri-menu-line" />
      </aside>
    </template>

    <template #drawer>
      <FormatSetting />
    </template>

    <template #aside>
      <aside
        v-if="content && article?.id != null"
        class="min-w-0 w-full max-w-full"
      >
        <Giscus
          :key="`article-comments-${article.id}`"
          :repo="GISCUS.blogRepo.name"
          :repo-id="GISCUS.blogRepo.id"
          :category="GISCUS.categories.announcements.name"
          :category-id="GISCUS.categories.announcements.id"
          mapping="specific"
          :term="String(article.id)"
          strict="0"
          reactions-enabled="1"
          emit-metadata="0"
          input-position="top"
          :theme="giscusTheme"
          lang="zh-CN"
          loading="lazy"
        />
      </aside>
    </template>
  </Reader>

  <FootBar v-if="!loading" />
</template>

<script setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";
import Giscus from "@giscus/vue";

import { useDateFormat } from "@vueuse/core";

import { useReaderStore } from "@/stores/readerStore";
import { useThemeStore } from "@/stores/themeStore";
import { useScrollTo } from "@/composables/useScrollTo";
import CONFIG from "@/constants/config";

import FloatingActionButton from "@/components/ui/button/FloatingActionButton.vue";
import FootBar from "@/components/layout/FootBar.vue";
import Reader from "@/components/reader/Reader.vue";
import FormatSetting from "@/components/reader/FormatSetting.vue";
import Loading from "@/components/base/Loading.vue";
import Markdown from "@/components/reader/Markdown.vue";

const props = defineProps({
  article: {
    type: Object,
    default: null,
  },
  content: {
    type: String,
    default: "",
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["back", "refresh"]);

const { GISCUS } = CONFIG;

const readerStore = useReaderStore();
const { styleConfigs } = storeToRefs(readerStore);

const themeStore = useThemeStore();
const { giscusTheme } = storeToRefs(themeStore);

const { scrollRef, scrollToTop, scrollToBottom } = useScrollTo();

const resolveBannerUrl = (banner) => {
  if (!banner) return "";
  return banner;
};

const estimateReadingTime = (length) => {
  const characterCount = Number(length);

  if (!Number.isFinite(characterCount) || characterCount <= 0) {
    return 1;
  }

  // 中文文章按照每分钟约 400 字估算
  return Math.max(1, Math.ceil(characterCount / 400));
};

const aliasList = computed(() => {
  const aliases = props.article?.aliases;

  if (Array.isArray(aliases)) {
    return aliases.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof aliases === "string") {
    return aliases
      .split(/[\n，,；;]/)
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  return [];
});

const handleRefresh = () => {
  emit("refresh");
};

const handleBack = () => {
  emit("back");
};

// 从 article 构建 headerData，传给 Markdown 组件
const headerData = computed(() => {
  if (!props.article) return null;

  return {
    title: props.article.title || "",
    uuid: props.article.id || "",
    page: 1,
    sourceType: "article",
    meta: props.article.tags || [],
    stats: [
      {
        icon: "ri-calendar-line",
        text: props.article.date || "",
      },
    ],
  };
});
const fabActions = computed(() => {
  const actions = [
    {
      key: "bottom",
      label: "至底部",
      icon: "ri-skip-down-line",
      buttonClass: "btn-info btn-soft",
      onClick: scrollToBottom,
    },
    {
      key: "top",
      label: "至顶部",
      icon: "ri-skip-up-line",
      buttonClass: "btn-info btn-soft",
      onClick: scrollToTop,
    },
    {
      key: "settings",
      for: "article-reader-sidebar",
      label: "阅读器设置",
      icon: "ri-settings-3-line",
      buttonClass: "btn-primary btn-soft",
    },
    {
      key: "refresh",
      label: "刷新文章",
      icon: props.loading ? "ri-loader-4-line animate-spin" : "ri-refresh-line",
      buttonClass: "btn-success btn-soft",
      onClick: handleRefresh,
    },
    {
      key: "back",
      label: "返回文章列表",
      icon: "ri-arrow-go-back-line",
      buttonClass: "btn-secondary btn-soft",
      onClick: handleBack,
    },
  ];

  return actions;
});
</script>
