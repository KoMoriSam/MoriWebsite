<template>
  <TestPage section-id="api">
    <section class="min-w-0">
      <div class="mb-3 flex flex-wrap gap-2">
        <button
          class="btn btn-sm btn-primary"
          :disabled="apiLoading"
          @click="testApi('chapters')"
        >
          章节列表
        </button>
        <button
          class="btn btn-sm"
          :disabled="apiLoading"
          @click="testApi('chapter-content')"
        >
          章节内容
        </button>
        <button
          class="btn btn-sm"
          :disabled="apiLoading"
          @click="testApi('articles')"
        >
          文章索引
        </button>
        <button
          class="btn btn-sm"
          :disabled="apiLoading"
          @click="testApi('article-content')"
        >
          文章内容
        </button>
        <button
          class="btn btn-sm btn-outline"
          :disabled="apiLoading || !hasParagraphCountsApi"
          @click="testApi('comment-counts')"
        >
          段评与本章说计数
        </button>
      </div>
      <p
        v-if="!hasParagraphCountsApi"
        class="mb-3 text-sm text-warning"
        role="status"
      >
        未配置评论计数接口，本项已禁用。
      </p>
      <div
        v-if="apiLoading"
        class="loading loading-spinner loading-sm mb-2"
      ></div>
      <pre
        v-if="apiResult"
        class="max-h-[32rem] overflow-auto rounded bg-base-300 p-3 text-xs leading-relaxed"
        >{{ apiResult }}</pre
      >
      <p v-if="apiError" class="text-sm text-error">{{ apiError }}</p>
    </section>
  </TestPage>
</template>

<script setup>
import { ref } from "vue";
import { useChapterApi } from "@/services/api-chapters";
import { useArticleApi } from "@/services/api-articles";
import {
  fetchDiscussionCountsBatch,
  fetchParagraphCountsBatch,
  hasParagraphCountsApi,
} from "@/services/api-paragraph-comments";
import { getChapterContextTitle } from "@/utils/format-chapter-label";
import TestPage from "./_TestPage.vue";

const apiLoading = ref(false);
const apiResult = ref(null);
const apiError = ref(null);
const { fetchChapters, fetchContent } = useChapterApi();
const { fetchArticleList, fetchArticleDocument } = useArticleApi();

function getFirstChapter(chaptersData) {
  for (const volume of Object.values(chaptersData || {})) {
    const chapter = volume?.chapters?.[0];
    if (!chapter) continue;
    return {
      ...chapter,
      volumeTitle: volume?.volumeInfo?.title || "",
    };
  }

  throw new Error("章节索引中没有可用于测试的章节");
}

function getFirstArticle(articleList) {
  const article = articleList.find((item) => item?.path);
  if (!article) throw new Error("文章索引中没有包含 path 的文章");
  return article;
}

async function testApi(type) {
  apiLoading.value = true;
  apiResult.value = null;
  apiError.value = null;

  try {
    if (type === "chapters") {
      apiResult.value = JSON.stringify(await fetchChapters(), null, 2);
    } else if (type === "chapter-content") {
      const chapter = getFirstChapter(await fetchChapters());
      const content = await fetchContent(chapter.path);
      apiResult.value = JSON.stringify(
        {
          chapter: {
            uuid: chapter.uuid,
            title: chapter.title,
            path: chapter.path,
            routeCode: chapter.routeCode,
          },
          preview: content.substring(0, 2000),
        },
        null,
        2,
      );
    } else if (type === "articles") {
      apiResult.value = JSON.stringify(await fetchArticleList(), null, 2);
    } else if (type === "article-content") {
      const article = getFirstArticle(await fetchArticleList());
      const document = await fetchArticleDocument(article.path);
      apiResult.value = JSON.stringify(
        {
          article: {
            id: article.id,
            title: article.title,
            path: article.path,
          },
          attributes: document.attributes,
          preview: document.content.substring(0, 2000),
        },
        null,
        2,
      );
    } else if (type === "comment-counts") {
      const chapter = getFirstChapter(await fetchChapters());
      const paragraphId = `${chapter.uuid}-1`;
      const discussionTerm = getChapterContextTitle(chapter);
      const [paragraphCounts, discussionCounts] = await Promise.all([
        fetchParagraphCountsBatch({
          sourceType: "novel",
          paragraphIds: [paragraphId],
        }),
        fetchDiscussionCountsBatch({
          sourceType: "novel",
          discussionTerms: [discussionTerm],
        }),
      ]);
      apiResult.value = JSON.stringify(
        {
          paragraph: {
            id: paragraphId,
            count: paragraphCounts?.[paragraphId] ?? null,
          },
          chapterDiscussion: {
            term: discussionTerm,
            count: discussionCounts?.[discussionTerm] ?? null,
          },
        },
        null,
        2,
      );
    }
  } catch (error) {
    apiError.value = error?.message || String(error);
  } finally {
    apiLoading.value = false;
  }
}
</script>
