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
          class="btn btn-sm btn-primary"
          :disabled="apiLoading"
          @click="testApi('content')"
        >
          章节内容
        </button>
        <button
          class="btn btn-sm btn-secondary"
          :disabled="apiLoading"
          @click="testApi('permalink-map')"
        >
          UUID ↔ Permalink
        </button>
      </div>
      <div
        v-if="apiLoading"
        class="loading loading-spinner loading-sm mb-2"
      ></div>
      <pre
        v-if="apiResult"
        class="max-h-48 overflow-auto rounded bg-base-300 p-2 text-[10px] leading-tight"
        >{{ apiResult }}</pre
      >
      <p v-if="apiError" class="text-sm text-error">{{ apiError }}</p>
    </section>
  </TestPage>
</template>

<script setup>
import { ref } from "vue";
import { useChapterApi } from "@/services/api-chapters";
import TestPage from "./_TestPage.vue";

const apiLoading = ref(false);
const apiResult = ref(null);
const apiError = ref(null);
const { fetchChapters, fetchContent } = useChapterApi();

const slugifySegment = (value, fallback = "item") => {
  const raw = String(value || "").trim();
  if (!raw) return fallback;

  const normalized = raw
    .toLowerCase()
    .replace(/\.md$/i, "")
    .replace(/[\\/]+/g, "-")
    .replace(/[“”\"'`]/g, "")
    .replace(/[。！？：；，、·]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || fallback;
};

function buildPermalinkRows(chaptersData) {
  const flatChapters = Object.values(chaptersData).flatMap((volume) =>
    volume.chapters.map((chapter) => ({
      ...chapter,
      volumeTitle: volume.volumeInfo.title,
    })),
  );

  const duplicateCounter = {};

  return flatChapters.map((chapter) => {
    const chapterPath = String(chapter.path || "");
    const [volumeRaw = "", chapterFileRaw = ""] = chapterPath.split("/");

    const volumeSlug = slugifySegment(volumeRaw, "volume");
    const chapterBaseSlug = slugifySegment(chapterFileRaw, "chapter");
    const key = `${volumeSlug}/${chapterBaseSlug}`;
    const duplicateIndex = (duplicateCounter[key] || 0) + 1;
    duplicateCounter[key] = duplicateIndex;

    const chapterSlug =
      duplicateIndex > 1
        ? `${chapterBaseSlug}-${duplicateIndex}`
        : chapterBaseSlug;

    return {
      uuid: chapter.uuid,
      title: chapter.title,
      path: chapter.path,
      permalink: `/novel/${volumeSlug}/${chapterSlug}`,
    };
  });
}

async function testApi(type) {
  apiLoading.value = true;
  apiResult.value = null;
  apiError.value = null;

  try {
    if (type === "chapters") {
      apiResult.value = JSON.stringify(await fetchChapters(), null, 2);
    } else if (type === "permalink-map") {
      const data = await fetchChapters();
      apiResult.value = JSON.stringify(buildPermalinkRows(data), null, 2);
    } else {
      apiResult.value = (await fetchContent("vol-001/ch-001.md")).substring(
        0,
        2000,
      );
    }
  } catch (error) {
    apiError.value = error.message;
  } finally {
    apiLoading.value = false;
  }
}
</script>
