<template>
  <header
    v-if="headerData"
    class="flex max-md:flex-col md:items-end gap-2 md:gap-0 my-4"
  >
    <h1 class="text-3xl font-bold">
      <span
        v-if="headerData.meta"
        class="badge badge-outline badge-info font-normal"
      >
        <i class="ri-book-marked-line"></i>
        {{ headerData.meta }}
      </span>
      <br />
      <i v-if="headerData.icon" :class="headerData.icon + ' font-normal'"></i>
      {{ headerData.title }}
      <div
        v-if="showRefresh"
        class="tooltip tooltip-bottom"
        data-tip="刷新内容"
      >
        <button class="btn btn-xs mb-1" @click="$emit('refresh')">
          <i class="ri-refresh-line"></i>
        </button>
      </div>
    </h1>
    <ul v-if="headerData.stats" class="md:ml-auto">
      <li v-for="(stat, index) in headerData.stats" :key="index">
        <span class="badge badge-sm">
          <i v-if="stat.icon" :class="stat.icon"></i>
          {{ stat.text }}
        </span>
      </li>
    </ul>
  </header>
  <section class="flex-1 h-[60dvh] md:h-dvh max-w-full overflow-hidden">
    <article
      ref="article"
      class="columns-[calc(100dvw-2rem)] gap-4 h-full transition-transform duration-400 prose prose-2xl prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-2xl prose-h4:text-2xl prose-p:text-justify quotes-none prose-blockquote:prose-p:not-italic prose-blockquote:prose-p:indent-0 prose-blockquote:ps-4 lg:prose-blockquote:ps-8 prose-blockquote:prose-p:text-left"
      :class="styleConfigs.fontStyle"
      :style="{
        '--para-font-size': `${styleConfigs.fontSize}px`,
        '--para-letter-spacing': `${styleConfigs.fontGap * 0.25}rem`,
        '--para-line-height': styleConfigs.lineHeight,
        '--para-margin-inline': `${
          styleConfigs.paraHeight / styleConfigs.lineHeight
        }rem`,
        '--para-text-indent': `calc(${styleConfigs.fontSize * 2}px 
      + ${styleConfigs.fontGap * 0.7}rem)`,
        transform: `translateX(-${translateX}px)`,
      }"
    >
      <vue-markdown
        v-if="content"
        :source="content"
        :options="options"
        :plugins="plugins"
      />
    </article>
  </section>
  <ChapterController>
    <nav class="join flex items-center justify-center">
      <button
        class="join-item btn px-2"
        @click="prevPage"
        :disabled="currentPage === 0"
      >
        <i class="ri-arrow-left-s-line"></i>
      </button>
      <button
        class="join-item btn text-xs md:text-sm px-2 md:px-auto cursor-default"
      >
        <span class="hidden md:inline">第</span>
        {{ currentPage + 1 }}
        <span class="hidden md:inline">页</span>
        /
        <span class="hidden md:inline">共</span>
        {{ currentTotalPages }}
        <span class="hidden md:inline">页</span>
      </button>
      <button
        class="join-item btn px-2"
        @click="nextPage"
        :disabled="currentPage + 1 === currentTotalPages"
      >
        <i class="ri-arrow-right-s-line"></i>
      </button>
    </nav>
  </ChapterController>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import VueMarkdown from "vue-markdown-render";
import ChapterController from "@/components/novel/ChapterController.vue";

defineProps({
  // 文章内容
  content: {
    type: String,
    default: "",
  },

  // 头部数据
  headerData: {
    type: Object,
    default: () => ({
      title: "", // 主标题
      meta: "", // 元信息（副标题）
      icon: "", // 标题图标
      stats: [], // 统计信息数组
    }),
  },

  // 是否显示加载状态
  isLoading: {
    type: Boolean,
    default: false,
  },

  // 是否显示刷新按钮
  showRefresh: {
    type: Boolean,
    default: false,
  },

  // 样式配置
  styleConfigs: {
    type: Object,
    default: () => ({
      fontStyle: "font-kai", // 字体样式类名
      fontSize: 20, // 字体大小(px)
      fontGap: 0, // 字间距
      lineHeight: 1.6, // 行高
      paraHeight: 1, // 段落高度
    }),
  },
});

import { useNovelStore } from "@/stores/novelStore";

import { storeToRefs } from "pinia";
import { useResizeObserver, useMutationObserver } from "@vueuse/core";
import { useTemplateRef, computed } from "vue";

const emit = defineEmits(["refresh"]);

const novelStore = useNovelStore();
const { currentPage, currentTotalPages } = storeToRefs(novelStore);

import { useChapters } from "@/composables/useChapters";
const { handleAnyPage } = useChapters();

const translateX = ref(0);

const setPage = (index) => {
  if (currentPage.value === index) return;
  if (index < 0 || index >= currentTotalPages.value) return;
  translateX.value = index * pageWidth.value;
  handleAnyPage(index);
};

const nextPage = () => {
  if (currentPage.value < currentTotalPages.value - 1) {
    setPage(currentPage.value + 1);
  }
};

const prevPage = () => {
  if (currentPage.value > 0) {
    setPage(currentPage.value - 1);
  }
};

const article = useTemplateRef("article");
const pageWidth = ref(0); // 页面宽度（含 padding）
// const totalPages = ref(0); // 总页数

// 计算页数
const calculatePages = (articleWidth, containerWidth) => {
  pageWidth.value = containerWidth + 16; // 假设有 16px 的 padding
  currentTotalPages.value = Math.ceil(articleWidth / pageWidth.value);
  // totalPages.value = Math.ceil(articleWidth / pageWidth.value);
  console.log(
    "文章宽度:",
    articleWidth,
    "页面宽度:",
    pageWidth.value,
    "总页数:",
    currentTotalPages.value,
  );
};

const prevTotalPages = computed(() => {
  return currentTotalPages.value;
});
const prevCurrentPage = computed(() => {
  return currentPage.value;
});

onMounted(() => {
  if (!article.value) return;

  // 1. 监听容器尺寸变化
  useResizeObserver(article, (entries) => {
    const { width } = entries[0].contentRect;
    calculatePages(article.value.scrollWidth, width);

    const nowTotalPages = currentTotalPages.value;
    const nowPage = Math.ceil(
      ((prevCurrentPage.value + 1) * nowTotalPages) / prevTotalPages.value,
    );

    // 更新当前页
    setPage(nowPage - 1);

    // 缓存当前值，供下一次 resize 使用
    prevTotalPages.value = nowTotalPages;
    prevCurrentPage.value = nowPage;
  });

  // 2. 监听内容变化
  useMutationObserver(
    article,
    () => {
      if (pageWidth.value > 0) {
        // 确保已经初始化
        calculatePages(article.value.scrollWidth, pageWidth.value - 16);

        const nowTotalPages = currentTotalPages.value;
        const nowPage = Math.ceil(
          ((prevCurrentPage.value + 1) * nowTotalPages) / prevTotalPages.value,
        );

        // 更新当前页
        setPage(nowPage - 1);

        // 缓存当前值，供下一次 resize 使用
        prevTotalPages.value = nowTotalPages;
        prevCurrentPage.value = nowPage;
      }
    },
    {
      childList: true, // 监听子元素增删
      subtree: true, // 监听所有后代元素
      characterData: true, // 监听文本变化
    },
  );

  // 3. 初始计算
  const { width } = article.value.getBoundingClientRect();
  calculatePages(article.value.scrollWidth, width);

  const nowTotalPages = currentTotalPages.value;
  const nowPage = Math.ceil(
    ((prevCurrentPage.value + 1) * nowTotalPages) / prevTotalPages.value,
  );

  // 更新当前页
  setPage(nowPage - 1);

  // 缓存当前值，供下一次 resize 使用
  prevTotalPages.value = nowTotalPages;
  prevCurrentPage.value = nowPage;
});

// 监听当前页变化，更新平移距离
watch(
  () => currentPage,
  () => {
    setPage(currentPage.value);
  },
);

// Markdown 渲染选项
const options = {
  html: true,
  typographer: true,
};

import MarkdownItFootnote from "markdown-it-footnote";
import MarkdownItAnchor from "markdown-it-anchor";
import markdownItTaskLists from "markdown-it-task-lists";
import markdownItHighlightjs from "markdown-it-highlightjs";
const plugins = [
  MarkdownItFootnote,
  MarkdownItAnchor,
  markdownItTaskLists,
  markdownItHighlightjs,
];
</script>
